#!/usr/bin/env python3
"""
CodeRecall — invite-gated practice platform.

Serves the static frontend and exposes a small invite-code API.

Usage:
    python3 server.py                  # serve on 0.0.0.0:8000
    ADMIN_TOKEN=mytoken python3 server.py
    PORT=9000 python3 server.py
"""

import json
import os
import random
import re
import string
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
import uuid
from datetime import datetime, timedelta
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlparse

ROOT = os.path.dirname(os.path.abspath(__file__))
STATIC_FILES = {
    "": "index.html",
    "/": "index.html",
    "/index.html": "index.html",
    "/styles.css": "styles.css",
    "/app.js": "app.js",
    "/snippets.js": "snippets.js",
    "/favicon.ico": "favicon.ico",
}
CONTENT_TYPES = {
    ".html": "text/html; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".js": "application/javascript; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".png": "image/png",
    ".ico": "image/x-icon",
}
# On hosts with an ephemeral filesystem (e.g. Render free tier) point DATA_DIR at
# a mounted persistent disk so invite codes survive restarts and redeploys.
DATA_DIR = os.environ.get("DATA_DIR", "").strip() or ROOT
INVITES_FILE = os.path.join(DATA_DIR, "invites.json")
SNIPPETS_FILE = os.path.join(DATA_DIR, "snippets.json")
ADMIN_TOKEN_FILE = os.path.join(DATA_DIR, "admin_token.txt")

# Characters that are not easily confused (no 0/O, 1/I/l).
CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"


# ---------- persistence ----------

def load_invites():
    if not os.path.exists(INVITES_FILE):
        return {"codes": []}
    try:
        with open(INVITES_FILE, "r", encoding="utf-8") as f:
            data = json.load(f)
        if not isinstance(data, dict) or "codes" not in data:
            return {"codes": []}
        return data
    except (json.JSONDecodeError, OSError):
        return {"codes": []}


def save_invites(data):
    with open(INVITES_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


def load_snippets():
    if not os.path.exists(SNIPPETS_FILE):
        return {"snippets": []}
    try:
        with open(SNIPPETS_FILE, "r", encoding="utf-8") as f:
            data = json.load(f)
        if not isinstance(data, dict) or not isinstance(data.get("snippets"), list):
            return {"snippets": []}
        return data
    except (json.JSONDecodeError, OSError):
        return {"snippets": []}


def save_snippets(data):
    with open(SNIPPETS_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


def normalize_snippet(item, index=0):
    """Coerce an incoming snippet into the stored shape."""
    if not isinstance(item, dict):
        item = {}
    try:
        source_order = int(item.get("sourceOrder") or index + 1)
    except (TypeError, ValueError):
        source_order = index + 1
    snippet = {
        "id": str(item.get("id") or f"snippet-{uuid.uuid4().hex[:10]}"),
        "title": str(item.get("title") or "Untitled snippet"),
        "chapter": str(item.get("chapter") or "Uncategorized"),
        "description": str(item.get("description") or ""),
        "language": str(item.get("language") or "C"),
        "sourceOrder": source_order,
        "code": str(item.get("code") or ""),
    }
    blanks = item.get("blanks")
    if isinstance(blanks, list):
        cleaned = []
        for token in blanks:
            if not isinstance(token, str):
                continue
            if token and token not in cleaned:
                cleaned.append(token)
        snippet["blanks"] = cleaned
    return snippet


def sorted_snippets(snippets):
    return sorted(snippets, key=lambda item: (item.get("sourceOrder", 0), item.get("id", "")))


def seed_snippets():
    """Create snippets.json from the bundled snippets.js on first start."""
    existing = load_snippets().get("snippets") or []
    if existing:
        return
    source = os.path.join(ROOT, "snippets.js")
    try:
        with open(source, "r", encoding="utf-8") as f:
            text = f.read()
        start = text.index("[")
        end = text.rindex("]") + 1
        items = json.loads(text[start:end])
    except (OSError, ValueError, json.JSONDecodeError) as exc:
        print(f"[seed] Could not read snippets.js: {exc}", file=sys.stderr)
        return
    snippets = [normalize_snippet(item, index) for index, item in enumerate(items)]
    try:
        save_snippets({"snippets": snippets})
        print(f"[seed] Seeded {len(snippets)} snippets into {SNIPPETS_FILE}", file=sys.stderr)
    except OSError as exc:
        print(f"[seed] Could not write {SNIPPETS_FILE}: {exc}", file=sys.stderr)


def get_admin_token():
    token = os.environ.get("ADMIN_TOKEN", "").strip()
    if token:
        return token
    if os.path.exists(ADMIN_TOKEN_FILE):
        with open(ADMIN_TOKEN_FILE, "r", encoding="utf-8") as f:
            return f.read().strip()
    # Generate a random token on first run.
    token = "".join(random.choices(string.ascii_letters + string.digits, k=24))
    try:
        with open(ADMIN_TOKEN_FILE, "w", encoding="utf-8") as f:
            f.write(token)
        print(f"[admin] Generated new admin token: {token}", file=sys.stderr)
        print(f"[admin] Saved to {ADMIN_TOKEN_FILE}", file=sys.stderr)
    except OSError:
        # Read-only filesystem: the token is still usable for this process, but
        # set ADMIN_TOKEN in the environment to keep it stable across restarts.
        print(f"[admin] Generated admin token (not persisted): {token}", file=sys.stderr)
    return token


# ---------- invite code logic ----------

def generate_code():
    part = lambda: "".join(random.choices(CODE_ALPHABET, k=4))
    return f"{part()}-{part()}"


def is_code_valid(code, invites):
    now = datetime.utcnow()
    for entry in invites.get("codes", []):
        if entry.get("code") != code:
            continue
        if entry.get("revoked"):
            return False, "This invite code has been revoked."
        expires = entry.get("expires")
        if expires:
            try:
                if datetime.fromisoformat(expires) < now:
                    return False, "This invite code has expired."
            except ValueError:
                pass
        max_uses = entry.get("maxUses")
        if max_uses is not None and entry.get("usedCount", 0) >= max_uses:
            return False, "This invite code has reached its usage limit."
        return True, entry
    return False, "Invalid invite code."


def redeem_code(code, invites):
    for entry in invites.get("codes", []):
        if entry.get("code") == code:
            entry["usedCount"] = entry.get("usedCount", 0) + 1
            return entry
    return None


def create_invite_entry(days=30, max_uses=1, note="", code=None):
    """Create and persist a new invite code, returning the stored entry."""
    invites = load_invites()
    existing = {c.get("code") for c in invites.get("codes", [])}
    if code:
        code = code.strip().upper()
    if not code or code in existing:
        code = generate_code()
        while code in existing:
            code = generate_code()
    now = datetime.utcnow()
    entry = {
        "code": code,
        "created": now.isoformat(),
        "expires": (now + timedelta(days=days)).isoformat() if days > 0 else None,
        "maxUses": max_uses,
        "usedCount": 0,
        "revoked": False,
        "note": note,
    }
    invites.setdefault("codes", []).append(entry)
    save_invites(invites)
    return entry


def revoke_invite_code(code):
    invites = load_invites()
    for entry in invites.get("codes", []):
        if entry.get("code") == code:
            entry["revoked"] = True
            save_invites(invites)
            return entry
    return None


def seed_invites():
    """Re-create codes from SEED_INVITES on every start.

    Hosts with an ephemeral filesystem (Render free tier) lose invites.json on
    restart/redeploy. Seeding keeps a known set of codes working permanently.
    """
    raw = os.environ.get("SEED_INVITES", "").strip()
    if not raw:
        return
    try:
        max_uses = int(os.environ.get("SEED_MAX_USES", "100"))
    except (TypeError, ValueError):
        max_uses = 100
    invites = load_invites()
    existing = {c.get("code") for c in invites.get("codes", [])}
    now = datetime.utcnow()
    changed = False
    for code in [part.strip().upper() for part in raw.split(",") if part.strip()]:
        if code in existing:
            continue
        invites.setdefault("codes", []).append({
            "code": code,
            "created": now.isoformat(),
            "expires": None,
            "maxUses": max_uses,
            "usedCount": 0,
            "revoked": False,
            "note": "seed",
        })
        changed = True
        print(f"[seed] Added invite code {code}", file=sys.stderr)
    if changed:
        save_invites(invites)


def code_view(entry, now=None):
    now = now or datetime.utcnow()
    status = "active"
    if entry.get("revoked"):
        status = "revoked"
    else:
        expires = entry.get("expires")
        if expires:
            try:
                if datetime.fromisoformat(expires) < now:
                    status = "expired"
            except ValueError:
                pass
        max_uses = entry.get("maxUses")
        if max_uses is not None and entry.get("usedCount", 0) >= max_uses:
            status = "used"
    return {
        "code": entry.get("code"),
        "note": entry.get("note", ""),
        "created": entry.get("created"),
        "expires": entry.get("expires"),
        "maxUses": entry.get("maxUses"),
        "usedCount": entry.get("usedCount", 0),
        "revoked": bool(entry.get("revoked")),
        "status": status,
    }


# ---------- Feishu integration ----------

FEISHU_API_BASE = "https://open.feishu.cn/open-apis"
FEISHU_TOKEN_CACHE = {"token": "", "expires": 0.0}
FEISHU_SEEN_EVENTS = set()

FEISHU_HELP = (
    "CodeRecall invite bot\n"
    "list — show recent invite codes\n"
    "new [days] [uses] [note] — create a code\n"
    "revoke CODE — revoke a code\n"
    "stats — show code totals\n"
    "help — show this message"
)


def feishu_config():
    def env(name):
        return os.environ.get(name, "").strip()
    return {
        "app_id": env("FEISHU_APP_ID"),
        "app_secret": env("FEISHU_APP_SECRET"),
        "app_token": env("FEISHU_BITABLE_APP_TOKEN"),
        "table_id": env("FEISHU_TABLE_ID"),
        "webhook": env("FEISHU_WEBHOOK_URL"),
        "verification_token": env("FEISHU_VERIFICATION_TOKEN"),
        "admin_open_ids": [item.strip() for item in env("FEISHU_ADMIN_OPEN_IDS").split(",") if item.strip()],
    }


def feishu_credentials_ready():
    cfg = feishu_config()
    return bool(cfg["app_id"] and cfg["app_secret"])


def feishu_bitable_ready():
    cfg = feishu_config()
    return feishu_credentials_ready() and bool(cfg["app_token"] and cfg["table_id"])


def feishu_request(url, payload=None, method="POST", headers=None):
    body = None if payload is None else json.dumps(payload, ensure_ascii=False).encode("utf-8")
    request = urllib.request.Request(url, data=body, method=method)
    request.add_header("Content-Type", "application/json; charset=utf-8")
    for key, value in (headers or {}).items():
        request.add_header(key, value)
    try:
        with urllib.request.urlopen(request, timeout=12) as response:
            text = response.read().decode("utf-8")
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode("utf-8", "replace")[:300]
        raise RuntimeError(f"Feishu HTTP {exc.code}: {detail}")
    except urllib.error.URLError as exc:
        raise RuntimeError(f"Feishu network error: {exc.reason}")
    try:
        return json.loads(text or "{}")
    except json.JSONDecodeError:
        raise RuntimeError("Feishu returned a non-JSON response")


def feishu_tenant_token():
    cfg = feishu_config()
    if not feishu_credentials_ready():
        raise RuntimeError("FEISHU_APP_ID / FEISHU_APP_SECRET are not set")
    if FEISHU_TOKEN_CACHE["token"] and FEISHU_TOKEN_CACHE["expires"] > time.time() + 60:
        return FEISHU_TOKEN_CACHE["token"]
    data = feishu_request(
        f"{FEISHU_API_BASE}/auth/v3/tenant_access_token/internal",
        {"app_id": cfg["app_id"], "app_secret": cfg["app_secret"]},
    )
    if data.get("code") != 0:
        raise RuntimeError(data.get("msg") or "Could not obtain a tenant_access_token")
    FEISHU_TOKEN_CACHE["token"] = data.get("tenant_access_token", "")
    FEISHU_TOKEN_CACHE["expires"] = time.time() + int(data.get("expire", 7200))
    return FEISHU_TOKEN_CACHE["token"]


def feishu_api(path, payload=None, method="POST", params=None):
    url = FEISHU_API_BASE + path
    if params:
        url += "?" + urllib.parse.urlencode(params)
    data = feishu_request(
        url,
        payload,
        method,
        {"Authorization": f"Bearer {feishu_tenant_token()}"},
    )
    if data.get("code") != 0:
        raise RuntimeError(data.get("msg") or f"Feishu API error {data.get('code')}")
    return data.get("data") or {}


def feishu_send_text(chat_id, text):
    try:
        feishu_api(
            "/im/v1/messages",
            {
                "receive_id": chat_id,
                "msg_type": "text",
                "content": json.dumps({"text": text}, ensure_ascii=False),
            },
            params={"receive_id_type": "chat_id"},
        )
    except Exception as exc:  # noqa: BLE001 - bot replies must never crash the handler
        print(f"[feishu] send failed: {exc}", file=sys.stderr)


def feishu_notify(text):
    cfg = feishu_config()
    if not cfg["webhook"]:
        return
    try:
        feishu_request(cfg["webhook"], {"msg_type": "text", "content": {"text": text}})
    except Exception as exc:  # noqa: BLE001
        print(f"[feishu] webhook failed: {exc}", file=sys.stderr)


def feishu_field_text(value):
    if value is None:
        return ""
    if isinstance(value, str):
        return value
    if isinstance(value, (int, float)):
        return str(value)
    if isinstance(value, list):
        parts = []
        for item in value:
            if isinstance(item, dict):
                parts.append(str(item.get("text") or item.get("name") or ""))
            else:
                parts.append(str(item))
        return "".join(parts)
    if isinstance(value, dict):
        return str(value.get("text") or value.get("name") or "")
    return str(value)


def feishu_records():
    cfg = feishu_config()
    if not feishu_bitable_ready():
        raise RuntimeError("Bitable sync needs FEISHU_BITABLE_APP_TOKEN and FEISHU_TABLE_ID")
    path = f"/bitable/v1/apps/{urllib.parse.quote(cfg['app_token'])}/tables/{urllib.parse.quote(cfg['table_id'])}/records"
    records = []
    page_token = None
    while True:
        params = {"page_size": 100}
        if page_token:
            params["page_token"] = page_token
        data = feishu_api(path, method="GET", params=params)
        records.extend(data.get("items") or [])
        page_token = data.get("page_token")
        if not data.get("has_more") or not page_token:
            break
    return records


def feishu_entry_fields(entry):
    return {
        "Code": entry.get("code", ""),
        "Status": code_view(entry).get("status", "active"),
        "Note": entry.get("note", "") or "",
        "Expires": entry.get("expires") or "",
        "MaxUses": "" if entry.get("maxUses") is None else str(entry.get("maxUses")),
        "UsedCount": str(entry.get("usedCount", 0)),
    }


def feishu_pull_invites():
    records = feishu_records()
    invites = load_invites()
    local = {c.get("code"): c for c in invites.get("codes", [])}
    added = 0
    updated = 0
    for record in records:
        fields = record.get("fields") or {}
        code = feishu_field_text(fields.get("Code")).strip().upper()
        if not code:
            continue
        entry = local.get(code)
        if entry is None:
            entry = {
                "code": code,
                "created": datetime.utcnow().isoformat(),
                "expires": None,
                "maxUses": None,
                "usedCount": 0,
                "revoked": False,
                "note": "",
            }
            invites.setdefault("codes", []).append(entry)
            local[code] = entry
            added += 1
        else:
            updated += 1
        note = feishu_field_text(fields.get("Note")).strip()
        if note:
            entry["note"] = note
        status = feishu_field_text(fields.get("Status")).strip().lower()
        if status:
            entry["revoked"] = status in ("revoked", "disabled", "吊销", "已吊销", "停用")
        expires = feishu_field_text(fields.get("Expires")).strip()
        if expires.isdigit() and len(expires) >= 13:
            moment = datetime(1970, 1, 1) + timedelta(milliseconds=int(expires))
            entry["expires"] = moment.isoformat()
        else:
            entry["expires"] = expires or None
        max_uses = feishu_field_text(fields.get("MaxUses")).strip()
        if max_uses.isdigit():
            entry["maxUses"] = int(max_uses)
        used = feishu_field_text(fields.get("UsedCount")).strip()
        if used.isdigit():
            entry["usedCount"] = int(used)
        entry["feishuRecordId"] = record.get("record_id")
    save_invites(invites)
    return {"total": len(records), "added": added, "updated": updated}


def feishu_push_invites():
    cfg = feishu_config()
    if not feishu_bitable_ready():
        raise RuntimeError("Bitable sync needs FEISHU_BITABLE_APP_TOKEN and FEISHU_TABLE_ID")
    records = feishu_records()
    remote = {}
    for record in records:
        code = feishu_field_text((record.get("fields") or {}).get("Code")).strip().upper()
        if code:
            remote[code] = record
    base = f"/bitable/v1/apps/{urllib.parse.quote(cfg['app_token'])}/tables/{urllib.parse.quote(cfg['table_id'])}/records"
    invites = load_invites()
    created = 0
    updated = 0
    errors = []
    for entry in invites.get("codes", []):
        code = entry.get("code")
        if not code:
            continue
        try:
            fields = feishu_entry_fields(entry)
            if code in remote:
                feishu_api(f"{base}/{remote[code].get('record_id')}", {"fields": fields}, method="PUT")
                updated += 1
            else:
                feishu_api(base, {"fields": fields}, method="POST")
                created += 1
        except Exception as exc:  # noqa: BLE001
            errors.append(f"{code}: {exc}")
    return {"created": created, "updated": updated, "errors": errors}


def feishu_push_entry(entry):
    """Best-effort single-entry push used after bot/admin mutations."""
    if not feishu_bitable_ready():
        return
    try:
        records = feishu_records()
        target = None
        for record in records:
            code = feishu_field_text((record.get("fields") or {}).get("Code")).strip().upper()
            if code == entry.get("code"):
                target = record
                break
        cfg = feishu_config()
        base = f"/bitable/v1/apps/{urllib.parse.quote(cfg['app_token'])}/tables/{urllib.parse.quote(cfg['table_id'])}/records"
        fields = feishu_entry_fields(entry)
        if target:
            feishu_api(f"{base}/{target.get('record_id')}", {"fields": fields}, method="PUT")
        else:
            feishu_api(base, {"fields": fields}, method="POST")
    except Exception as exc:  # noqa: BLE001
        print(f"[feishu] push {entry.get('code')} failed: {exc}", file=sys.stderr)


def feishu_stats():
    invites = load_invites()
    counts = {"active": 0, "revoked": 0, "expired": 0, "used": 0}
    for entry in invites.get("codes", []):
        status = code_view(entry).get("status", "active")
        counts[status] = counts.get(status, 0) + 1
    return counts


def bot_list_codes():
    invites = load_invites()
    entries = sorted(invites.get("codes", []), key=lambda item: item.get("created", ""), reverse=True)
    if not entries:
        return "No invite codes yet. Use: new 30 1 note"
    lines = ["Recent invite codes:"]
    for entry in entries[:10]:
        view = code_view(entry)
        uses = f"{view.get('usedCount', 0)}/{view.get('maxUses')}" if view.get("maxUses") is not None else f"{view.get('usedCount', 0)}/∞"
        lines.append(f"{view.get('code')} · {view.get('status')} · uses {uses}")
    return "\n".join(lines)


def bot_create_code(args):
    numbers = []
    words = []
    for arg in args:
        if arg.isdigit() and len(numbers) < 2:
            numbers.append(int(arg))
        else:
            words.append(arg)
    days = numbers[0] if numbers else 30
    max_uses = numbers[1] if len(numbers) > 1 else 1
    note = " ".join(words).strip()
    entry = create_invite_entry(days=days, max_uses=max_uses, note=note)
    feishu_push_entry(entry)
    feishu_notify(f"New CodeRecall invite code: {entry['code']} ({days}d, {max_uses} uses)")
    expires = entry.get("expires")
    expires_text = expires[:10] if expires else "never"
    reply = f"Created {entry['code']}\nExpires: {expires_text}\nMax uses: {max_uses}"
    if note:
        reply += f"\nNote: {note}"
    return reply


def bot_revoke_code(code):
    entry = revoke_invite_code(code)
    if not entry:
        return f"Invite code {code} was not found."
    feishu_push_entry(entry)
    feishu_notify(f"CodeRecall invite code revoked: {code}")
    return f"Revoked {code}."


def handle_bot_command(text, open_id):
    cfg = feishu_config()
    command = re.sub(r"@_user_\d+", "", text or "").strip().lstrip("/")
    for prefix in ("coderecall ", "code ", "邀请码 ", "码 "):
        if command.lower().startswith(prefix):
            command = command[len(prefix):].strip()
            break
    parts = command.split()
    if not parts:
        return FEISHU_HELP
    verb = parts[0].lower()
    if verb in ("help", "帮助", "指令", "?"):
        return FEISHU_HELP
    if not cfg["admin_open_ids"]:
        return "The bot is not authorized for management yet. Set FEISHU_ADMIN_OPEN_IDS in the server environment."
    if open_id not in cfg["admin_open_ids"]:
        return f"You are not authorized to manage invite codes.\nYour open_id: {open_id or 'unknown'}"
    if verb in ("list", "列表", "codes"):
        return bot_list_codes()
    if verb in ("new", "create", "新增", "创建", "生成"):
        return bot_create_code(parts[1:])
    if verb in ("revoke", "吊销", "撤销"):
        if len(parts) < 2:
            return "Usage: revoke CODE"
        return bot_revoke_code(parts[1].strip().upper())
    if verb in ("stats", "统计", "状态"):
        counts = feishu_stats()
        return f"Active: {counts.get('active', 0)} · Used: {counts.get('used', 0)} · Expired: {counts.get('expired', 0)} · Revoked: {counts.get('revoked', 0)}"
    return FEISHU_HELP


def handle_feishu_event(payload):
    """Returns (http_status, body) for /api/feishu/event."""
    cfg = feishu_config()
    if payload.get("encrypt"):
        print("[feishu] encrypted events are not supported; clear the Encrypt Key", file=sys.stderr)
        return 200, {"code": 0}
    header = payload.get("header") or {}
    token = header.get("token") or payload.get("token") or ""
    if cfg["verification_token"] and token != cfg["verification_token"]:
        return 403, {"error": "Invalid verification token"}
    if payload.get("type") == "url_verification":
        return 200, {"challenge": payload.get("challenge", "")}
    if not cfg["verification_token"]:
        # Without a verification token anyone could forge bot commands.
        print("[feishu] FEISHU_VERIFICATION_TOKEN is not set; ignoring message events", file=sys.stderr)
        return 200, {"code": 0}
    if header.get("event_type") != "im.message.receive_v1":
        return 200, {"code": 0}
    event_id = header.get("event_id")
    if event_id:
        if event_id in FEISHU_SEEN_EVENTS:
            return 200, {"code": 0}
        FEISHU_SEEN_EVENTS.add(event_id)
        if len(FEISHU_SEEN_EVENTS) > 500:
            FEISHU_SEEN_EVENTS.clear()
    event = payload.get("event") or {}
    message = event.get("message") or {}
    sender = event.get("sender") or {}
    if sender.get("sender_type") not in (None, "user"):
        return 200, {"code": 0}
    if message.get("message_type") != "text":
        return 200, {"code": 0}
    chat_id = message.get("chat_id")
    if not chat_id:
        return 200, {"code": 0}
    try:
        content = json.loads(message.get("content") or "{}")
    except json.JSONDecodeError:
        return 200, {"code": 0}
    text = feishu_get_text(content)
    open_id = ((sender.get("sender_id") or {}).get("open_id")) or ""
    reply = handle_bot_command(text, open_id)
    if reply:
        feishu_send_text(chat_id, reply)
    return 200, {"code": 0}


def feishu_get_text(content):
    if isinstance(content, dict):
        text = content.get("text")
        if isinstance(text, str):
            return text
    return ""


# ---------- HTTP handler ----------

class Handler(BaseHTTPRequestHandler):
    server_version = "CodeRecall/1.0"

    # -- helpers --
    def _send_json(self, status, payload):
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)

    def _send_file(self, path):
        root = os.path.realpath(ROOT)
        full = os.path.realpath(os.path.join(ROOT, path))
        if full != root and not full.startswith(root + os.sep):
            self._send_json(404, {"error": "Not found"})
            return
        if not os.path.isfile(full):
            self._send_json(404, {"error": "Not found"})
            return
        ext = os.path.splitext(path)[1].lower()
        ctype = CONTENT_TYPES.get(ext, "application/octet-stream")
        try:
            with open(full, "rb") as f:
                data = f.read()
        except OSError:
            self._send_json(500, {"error": "Read failed"})
            return
        self.send_response(200)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(data)))
        self.send_header("Cache-Control", "no-cache")
        self.end_headers()
        self.wfile.write(data)

    def _read_json(self):
        length = int(self.headers.get("Content-Length", "0") or "0")
        if length <= 0:
            return {}
        try:
            raw = self.rfile.read(length)
            return json.loads(raw.decode("utf-8"))
        except (json.JSONDecodeError, UnicodeDecodeError):
            return None

    def _is_admin(self):
        auth = self.headers.get("Authorization", "")
        if not auth.startswith("Bearer "):
            return False
        return auth[7:].strip() == ADMIN_TOKEN

    def log_message(self, format, *args):
        sys.stderr.write("[%s] %s\n" % (self.log_date_time_string(), format % args))

    # -- routing --
    def do_GET(self):
        parsed = urlparse(self.path)
        path = parsed.path

        if path == "/api/admin/invites":
            if not self._is_admin():
                self._send_json(401, {"error": "Unauthorized"})
                return
            invites = load_invites()
            now = datetime.utcnow()
            codes = [code_view(c, now) for c in invites.get("codes", [])]
            codes.sort(key=lambda c: c.get("created", ""), reverse=True)
            self._send_json(200, {"codes": codes})
            return

        if path == "/api/snippets":
            snippets = sorted_snippets(load_snippets().get("snippets", []))
            self._send_json(200, {"snippets": snippets, "count": len(snippets)})
            return

        if path == "/api/health":
            self._send_json(200, {"ok": True})
            return

        if path == "/api/admin/feishu/status":
            if not self._is_admin():
                self._send_json(401, {"error": "Unauthorized"})
                return
            cfg = feishu_config()
            self._send_json(200, {
                "feishu": {
                    "bitable": feishu_bitable_ready(),
                    "bot": feishu_credentials_ready(),
                    "webhook": bool(cfg["webhook"]),
                    "adminOpenIds": len(cfg["admin_open_ids"]),
                }
            })
            return

        if path == "/api/admin/diag":
            if not self._is_admin():
                self._send_json(401, {"error": "Unauthorized"})
                return
            raw = os.environ.get("SEED_INVITES", "")
            seeds = [p.strip() for p in raw.split(",") if p.strip()]
            self._send_json(200, {
                "build": "seed-2",
                "seedInvitesSet": bool(seeds),
                "seedCount": len(seeds),
                "storedCodes": len(load_invites().get("codes", [])),
                "storedSnippets": len(load_snippets().get("snippets", [])),
                "feishuBitable": feishu_bitable_ready(),
                "feishuBot": feishu_credentials_ready(),
            })
            return

        # Static files
        if path in STATIC_FILES:
            self._send_file(STATIC_FILES[path])
            return
        # Unknown static path → serve index.html (SPA fallback)
        if path.startswith("/") and "." not in os.path.basename(path):
            self._send_file("index.html")
            return
        # Only serve known asset types; runtime data (invites.json, snippets.json,
        # admin_token.txt) must never be downloadable.
        allowed = (".css", ".js", ".png", ".jpg", ".jpeg", ".gif", ".svg", ".webp", ".ico", ".woff", ".woff2")
        if path.lower().endswith(allowed):
            self._send_file(path.lstrip("/"))
            return
        self._send_json(404, {"error": "Not found"})

    def do_POST(self):
        parsed = urlparse(self.path)
        path = parsed.path

        if path == "/api/invite/validate":
            body = self._read_json()
            if body is None:
                self._send_json(400, {"error": "Invalid JSON"})
                return
            code = (body.get("code") or "").strip().upper()
            if not code:
                self._send_json(400, {"error": "Invite code is required"})
                return
            invites = load_invites()
            valid, info = is_code_valid(code, invites)
            if not valid:
                self._send_json(200, {"valid": False, "message": info})
                return
            entry = redeem_code(code, invites)
            save_invites(invites)
            self._send_json(200, {
                "valid": True,
                "expires": entry.get("expires"),
                "note": entry.get("note", ""),
            })
            return

        if path == "/api/admin/invites":
            if not self._is_admin():
                self._send_json(401, {"error": "Unauthorized"})
                return
            body = self._read_json()
            if body is None:
                self._send_json(400, {"error": "Invalid JSON"})
                return
            days = body.get("expiryDays")
            if days is None:
                days = 30
            try:
                days = int(days)
            except (TypeError, ValueError):
                days = 30
            max_uses = body.get("maxUses")
            try:
                max_uses = int(max_uses) if max_uses is not None else 1
            except (TypeError, ValueError):
                max_uses = 1
            note = (body.get("note") or "").strip()
            entry = create_invite_entry(days=days, max_uses=max_uses, note=note, code=body.get("code"))
            feishu_push_entry(entry)
            feishu_notify(f"New CodeRecall invite code: {entry['code']} ({days}d, {max_uses} uses)")
            self._send_json(201, {"code": code_view(entry)})
            return

        if path == "/api/admin/snippets":
            if not self._is_admin():
                self._send_json(401, {"error": "Unauthorized"})
                return
            body = self._read_json()
            if body is None:
                self._send_json(400, {"error": "Invalid JSON"})
                return
            data = load_snippets()
            items = data.setdefault("snippets", [])
            snippet = normalize_snippet(body)
            existing_ids = {item.get("id") for item in items}
            while snippet["id"] in existing_ids:
                snippet["id"] = f"snippet-{uuid.uuid4().hex[:10]}"
            if body.get("sourceOrder") is None:
                snippet["sourceOrder"] = max([item.get("sourceOrder", 0) for item in items] or [0]) + 1
            items.append(snippet)
            save_snippets(data)
            self._send_json(201, {"snippet": snippet})
            return

        if path == "/api/admin/feishu/sync":
            if not self._is_admin():
                self._send_json(401, {"error": "Unauthorized"})
                return
            body = self._read_json()
            if body is None:
                self._send_json(400, {"error": "Invalid JSON"})
                return
            action = (body.get("action") or "").strip().lower()
            if action not in ("pull", "push"):
                self._send_json(400, {"ok": False, "error": "action must be pull or push"})
                return
            try:
                result = feishu_pull_invites() if action == "pull" else feishu_push_invites()
            except RuntimeError as exc:
                self._send_json(400, {"ok": False, "error": str(exc)})
                return
            self._send_json(200, {"ok": True, "action": action, "result": result})
            return

        if path == "/api/feishu/event":
            body = self._read_json()
            if body is None:
                self._send_json(400, {"error": "Invalid JSON"})
                return
            status, payload = handle_feishu_event(body)
            self._send_json(status, payload)
            return

        self._send_json(404, {"error": "Not found"})

    def do_PUT(self):
        parsed = urlparse(self.path)
        path = parsed.path
        prefix = "/api/admin/snippets/"
        if path.startswith(prefix):
            if not self._is_admin():
                self._send_json(401, {"error": "Unauthorized"})
                return
            snippet_id = urllib.parse.unquote(path[len(prefix):]).strip()
            body = self._read_json()
            if body is None:
                self._send_json(400, {"error": "Invalid JSON"})
                return
            data = load_snippets()
            items = data.get("snippets", [])
            for index, item in enumerate(items):
                if item.get("id") != snippet_id:
                    continue
                merged = {**item, **body, "id": snippet_id}
                items[index] = normalize_snippet(merged, index)
                save_snippets(data)
                self._send_json(200, {"snippet": items[index]})
                return
            self._send_json(404, {"error": "Snippet not found"})
            return
        self._send_json(404, {"error": "Not found"})

    def do_DELETE(self):
        parsed = urlparse(self.path)
        path = parsed.path
        invites_prefix = "/api/admin/invites/"
        if path.startswith(invites_prefix):
            if not self._is_admin():
                self._send_json(401, {"error": "Unauthorized"})
                return
            code = urllib.parse.unquote(path[len(invites_prefix):]).strip().upper()
            entry = revoke_invite_code(code)
            if entry:
                feishu_push_entry(entry)
                feishu_notify(f"CodeRecall invite code revoked: {code}")
                self._send_json(200, {"ok": True})
            else:
                self._send_json(404, {"error": "Invite code not found"})
            return

        snippets_prefix = "/api/admin/snippets/"
        if path.startswith(snippets_prefix):
            if not self._is_admin():
                self._send_json(401, {"error": "Unauthorized"})
                return
            snippet_id = urllib.parse.unquote(path[len(snippets_prefix):]).strip()
            data = load_snippets()
            items = data.get("snippets", [])
            remaining = [item for item in items if item.get("id") != snippet_id]
            if len(remaining) == len(items):
                self._send_json(404, {"error": "Snippet not found"})
                return
            data["snippets"] = remaining
            save_snippets(data)
            self._send_json(200, {"ok": True})
            return

        self._send_json(404, {"error": "Not found"})


def main():
    global ADMIN_TOKEN
    try:
        os.makedirs(DATA_DIR, exist_ok=True)
    except OSError:
        pass
    ADMIN_TOKEN = get_admin_token()
    seed_invites()
    seed_snippets()
    port = int(os.environ.get("PORT", "8000"))
    host = os.environ.get("HOST", "0.0.0.0")
    server = ThreadingHTTPServer((host, port), Handler)
    print(f"CodeRecall running on http://{host}:{port}", file=sys.stderr)
    print(f"Admin token: {ADMIN_TOKEN}", file=sys.stderr)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nShutting down.", file=sys.stderr)
        server.server_close()


if __name__ == "__main__":
    main()
