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
import string
import sys
import time
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
        full = os.path.join(ROOT, path)
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

        if path == "/api/health":
            self._send_json(200, {"ok": True})
            return

        # Static files
        if path in STATIC_FILES:
            self._send_file(STATIC_FILES[path])
            return
        # Unknown static path → serve index.html (SPA fallback)
        if path.startswith("/") and "." not in os.path.basename(path):
            self._send_file("index.html")
            return
        self._send_file(path.lstrip("/"))

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
            invites = load_invites()
            # Avoid duplicates.
            existing = {c["code"] for c in invites.get("codes", [])}
            code = body.get("code") or generate_code()
            code = code.strip().upper()
            if code in existing:
                code = generate_code()
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
            self._send_json(201, {"code": code_view(entry)})
            return

        self._send_json(404, {"error": "Not found"})

    def do_DELETE(self):
        parsed = urlparse(self.path)
        path = parsed.path
        prefix = "/api/admin/invites/"
        if path.startswith(prefix):
            if not self._is_admin():
                self._send_json(401, {"error": "Unauthorized"})
                return
            code = path[len(prefix):].strip().upper()
            invites = load_invites()
            found = False
            for entry in invites.get("codes", []):
                if entry.get("code") == code:
                    entry["revoked"] = True
                    found = True
                    break
            if found:
                save_invites(invites)
                self._send_json(200, {"ok": True})
            else:
                self._send_json(404, {"error": "Invite code not found"})
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
