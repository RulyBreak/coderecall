'use strict';

const exercises = Array.isArray(window.CODE_SNIPPETS) ? window.CODE_SNIPPETS : [];
const STORAGE_KEY = 'code-recall-studio-v1';
const $ = (id) => document.getElementById(id);
const normalizeNewlines = (value) => String(value ?? '').replace(/\r\n?/g, '\n');

const PUNCTUATION_MAP = {
  '（': '(', '）': ')', '，': ',', '。': '.', '；': ';', '：': ':',
  '！': '!', '？': '?', '【': '[', '】': ']', '「': '[', '」': ']',
  '『': '{', '』': '}', '〈': '<', '〉': '>', '～': '~', '—': '-',
  '“': '"', '”': '"', '‘': "'", '’': "'", '、': ',', '…': '.', '·': '.',
};
const PUNCTUATION_PATTERN = new RegExp(`[${Object.keys(PUNCTUATION_MAP).join('')}]`, 'g');

function normalizePunctuation(text) {
  return text.replace(PUNCTUATION_PATTERN, (ch) => PUNCTUATION_MAP[ch] || ch);
}

/* Normalize a code token for cloze comparison (case + punctuation). */
function normalizeToken(text) {
  let t = String(text ?? '');
  if (!state.checkpoints.case) t = t.toLowerCase();
  if (!state.checkpoints.punctuation) t = normalizePunctuation(t);
  return t;
}

let storageWarningShown = false;
let toastTimer;

const DEFAULT_CHECKPOINTS = { case: true, spaces: false, newlines: false, punctuation: false };

function loadState() {
  const fallback = { selectedId: exercises[0]?.id, mode: 'cloze', records: {}, checkpoints: { ...DEFAULT_CHECKPOINTS } };
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
    if (!parsed || typeof parsed !== 'object') return fallback;
    return {
      selectedId: exercises.some((item) => item.id === parsed.selectedId) ? parsed.selectedId : fallback.selectedId,
      mode: ['cloze', 'friendly'].includes(parsed.mode) ? parsed.mode : 'cloze',
      records: parsed.records && typeof parsed.records === 'object' && !Array.isArray(parsed.records) ? parsed.records : {},
      checkpoints: { ...fallback.checkpoints, ...(parsed.checkpoints || {}) },
    };
  } catch {
    return fallback;
  }
}

const state = {
  ...loadState(),
  query: '',
  chapter: 'all',
  status: 'all',
  answer: '',
  blanks: [],
  blanksFor: null,
  clozeValues: [],
  result: null,
  revealed: false,
};

function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      version: 1,
      selectedId: state.selectedId,
      mode: state.mode,
      records: state.records,
      checkpoints: state.checkpoints,
    }));
  } catch {
    if (!storageWarningShown) {
      storageWarningShown = true;
      showToast('Local storage is unavailable. Progress will last for this session only.');
    }
  }
}

function getCurrentExercise() {
  return exercises.find((item) => item.id === state.selectedId) || exercises[0];
}

function getRecord(id) {
  const record = state.records[id];
  return record && typeof record === 'object' ? record : {};
}

function getFilteredExercises() {
  const query = state.query.trim().toLowerCase();
  return exercises.filter((item) => {
    const matchesQuery = !query || `${item.title} ${item.description} ${item.chapter}`.toLowerCase().includes(query);
    const matchesChapter = state.chapter === 'all' || item.chapter === state.chapter;
    const completed = Boolean(getRecord(item.id).completed);
    const matchesStatus = state.status === 'all' || (state.status === 'completed' ? completed : !completed);
    return matchesQuery && matchesChapter && matchesStatus;
  });
}

function showToast(message) {
  const toast = $('toast');
  clearTimeout(toastTimer);
  toast.textContent = message;
  toast.hidden = false;
  toastTimer = setTimeout(() => { toast.hidden = true; }, 3200);
}

function createStatusIcon(completed) {
  const span = document.createElement('span');
  span.className = `exercise-state${completed ? ' is-complete' : ''}`;
  span.setAttribute('aria-hidden', 'true');
  span.innerHTML = completed
    ? '<svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" fill="currentColor"/><path d="m8 12 2.5 2.5L16 9" stroke="white" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>'
    : '<svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="8.5" stroke="currentColor" stroke-width="1.4"/></svg>';
  return span;
}

function renderLibrary() {
  const filtered = getFilteredExercises();
  const list = $('exercise-list');
  const fragment = document.createDocumentFragment();
  list.replaceChildren();
  $('library-count').textContent = String(filtered.length);
  $('empty-library').hidden = filtered.length > 0;
  list.hidden = filtered.length === 0;

  filtered.forEach((item) => {
    const completed = Boolean(getRecord(item.id).completed);
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `exercise-item${item.id === state.selectedId ? ' is-active' : ''}`;
    button.dataset.exerciseId = item.id;
    button.setAttribute('aria-label', `${item.title}, ${item.chapter}${completed ? ', completed' : ''}`);
    if (item.id === state.selectedId) button.setAttribute('aria-current', 'true');

    const index = document.createElement('span');
    index.className = 'exercise-index';
    index.textContent = String(item.sourceOrder).padStart(2, '0');

    const copy = document.createElement('span');
    copy.className = 'exercise-item-copy';
    const title = document.createElement('strong');
    title.textContent = item.title;
    const meta = document.createElement('small');
    meta.textContent = `${item.chapter} · ${item.language}`;
    copy.append(title, meta);
    button.append(index, copy, createStatusIcon(completed));
    fragment.append(button);
  });

  list.append(fragment);
  $('next-button').disabled = filtered.length === 0;
}

function renderProgress() {
  const completed = exercises.filter((item) => getRecord(item.id).completed).length;
  const percent = exercises.length ? Math.round((completed / exercises.length) * 100) : 0;
  $('progress-count').textContent = `${completed} of ${exercises.length}`;
  $('progress-percent').textContent = String(percent);
  $('progress-ring').style.setProperty('--progress', `${percent * 3.6}deg`);
}

function renderMode() {
  const cloze = state.mode === 'cloze';
  document.querySelectorAll('[data-mode]').forEach((button) => {
    const active = button.dataset.mode === state.mode;
    button.classList.toggle('is-active', active);
    button.setAttribute('aria-pressed', String(active));
  });
  $('code-editor').classList.toggle('is-cloze', cloze);
  $('editor-title').textContent = cloze ? 'Fill in the blanks' : 'Full recall';
  $('mode-description').textContent = cloze
    ? 'Fill in the removed key terms. Comments are not checked.'
    : 'Type the full snippet. Comments and indentation are not checked.';
  $('check-label').textContent = cloze ? 'Check answers' : 'Check recall';
  updateEditorStats();
}

function updateEditorStats() {
  if (state.mode === 'cloze') {
    ensureBlanks();
    const filled = state.clozeValues.filter((value) => value.trim()).length;
    $('editor-stats').textContent = `${filled} of ${state.blanks.length} blanks filled`;
    return;
  }
  const answer = state.answer;
  const lineCount = answer ? answer.split('\n').length : 1;
  $('line-numbers').textContent = Array.from({ length: lineCount }, (_, index) => index + 1).join('\n');
  $('editor-stats').textContent = `${answer ? lineCount : 0} lines · ${answer.length} characters`;
  $('line-numbers').scrollTop = $('code-input').scrollTop;
}

function renderAnswer() {
  $('answer-card').hidden = !state.revealed;
  $('reveal-button').querySelector('span').textContent = state.revealed ? 'Hide answer' : 'Reveal answer';
  const container = $('reference-code');
  if (!state.revealed) return;

  const exercise = getCurrentExercise();
  const code = normalizeNewlines(exercise.code);

  if (state.mode === 'cloze') {
    ensureBlanks();
    const sorted = [...state.blanks].sort((a, b) => a.start - b.start);
    const fragment = document.createDocumentFragment();
    let cursor = 0;
    for (const blank of sorted) {
      if (blank.start > cursor) {
        fragment.append(document.createTextNode(code.slice(cursor, blank.start)));
      }
      const mark = document.createElement('mark');
      mark.className = 'blank-highlight';
      mark.textContent = code.slice(blank.start, blank.end);
      fragment.append(mark);
      cursor = blank.end;
    }
    if (cursor < code.length) {
      fragment.append(document.createTextNode(code.slice(cursor)));
    }
    container.replaceChildren(fragment);
  } else {
    container.textContent = code;
  }
}

function renderCheckpoints() {
  document.querySelectorAll('.checkpoint-toggle').forEach((button) => {
    const key = button.dataset.checkpoint;
    const on = Boolean(state.checkpoints[key]);
    button.classList.toggle('is-on', on);
    button.setAttribute('aria-pressed', String(on));
  });
}

function renderPractice() {
  const exercise = getCurrentExercise();
  if (!exercise) return;
  state.selectedId = exercise.id;
  $('exercise-chapter').textContent = exercise.chapter;
  $('exercise-number').textContent = `Exercise ${exercise.sourceOrder} of ${exercises.length}`;
  $('exercise-title').textContent = exercise.title;
  $('exercise-description').textContent = exercise.description;
  $('language-tag').textContent = exercise.language;
  const referenceLines = normalizeNewlines(exercise.code).replace(/\s+$/, '').split('\n').length;
  $('lines-tag').textContent = `${referenceLines} lines`;

  const record = getRecord(exercise.id);
  const hasBest = Number.isFinite(record.bestAccuracy) && record.bestAccuracy > 0;
  $('best-tag').hidden = !hasBest;
  if (hasBest) $('best-tag').textContent = `Best ${Math.round(record.bestAccuracy)}%`;

  $('code-input').value = state.answer;
  renderCloze();
  renderAnswer();
  renderResult();
  renderMode();
  renderCheckpoints();
}

/* Comments and string contents are masked so they never become blanks or checkpoints. */
function maskCode(code) {
  const text = normalizeNewlines(code);
  let output = '';
  let quote = null;
  let escaped = false;
  let lineComment = false;
  let blockComment = false;

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    const next = text[index + 1];

    if (lineComment) {
      if (character === '\n') {
        lineComment = false;
        output += '\n';
      } else {
        output += ' ';
      }
      continue;
    }

    if (blockComment) {
      if (character === '*' && next === '/') {
        output += '  ';
        index += 1;
        blockComment = false;
      } else {
        output += character === '\n' ? '\n' : ' ';
      }
      continue;
    }

    if (quote) {
      output += ' ';
      if (escaped) escaped = false;
      else if (character === '\\') escaped = true;
      else if (character === quote) quote = null;
      continue;
    }

    if (character === '/' && next === '/') {
      output += '  ';
      index += 1;
      lineComment = true;
      continue;
    }

    if (character === '/' && next === '*') {
      output += '  ';
      index += 1;
      blockComment = true;
      continue;
    }

    if (character === '"' || character === "'") {
      quote = character;
      output += ' ';
      continue;
    }

    output += character;
  }

  return output;
}

function stripComments(code) {
  const text = normalizeNewlines(code);
  let output = '';
  let quote = null;
  let escaped = false;
  let lineComment = false;
  let blockComment = false;

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    const next = text[index + 1];

    if (lineComment) {
      if (character === '\n') {
        lineComment = false;
        output += '\n';
      }
      continue;
    }

    if (blockComment) {
      if (character === '*' && next === '/') {
        blockComment = false;
        index += 1;
      } else if (character === '\n') {
        output += '\n';
      }
      continue;
    }

    if (quote) {
      output += character;
      if (escaped) escaped = false;
      else if (character === '\\') escaped = true;
      else if (character === quote) quote = null;
      continue;
    }

    if (character === '/' && next === '/') {
      index += 1;
      lineComment = true;
      continue;
    }

    if (character === '/' && next === '*') {
      index += 1;
      blockComment = true;
      continue;
    }

    if (character === '"' || character === "'") {
      quote = character;
    }

    output += character;
  }

  return output;
}

const CLOZE_KEYWORDS = new Map([
  ['return', 12], ['struct', 12], ['typedef', 11], ['NULL', 12], ['sizeof', 10],
  ['malloc', 12], ['free', 11], ['if', 9], ['else', 8], ['while', 10], ['for', 10],
  ['switch', 8], ['case', 7], ['break', 7], ['continue', 7], ['->', 11],
  ['++', 7], ['--', 7], ['&&', 6], ['||', 6], ['==', 8], ['!=', 8], ['<=', 6], ['>=', 6],
  ['ElemType', 10], ['Status', 9], ['OK', 8], ['ERROR', 8], ['OVERFLOW', 8],
]);

const CONTROL_WORDS = new Set(['if', 'while', 'for', 'switch', 'return', 'sizeof', 'else']);
const CODE_TOKEN_RE = /[A-Za-z_]\w*|->|\+\+|--|&&|\|\||==|!=|<=|>=/g;

/* Returns every code token in a masked snippet, in source order. */
function scanTokens(masked) {
  const pattern = new RegExp(CODE_TOKEN_RE.source, 'g');
  const tokens = [];
  let match;
  while ((match = pattern.exec(masked)) !== null) {
    tokens.push({ token: match[0], index: match.index });
  }
  return tokens;
}

function buildBlanks(code) {
  const original = normalizeNewlines(code);
  const masked = maskCode(original);
  const lineStarts = [0];
  for (let index = 0; index < masked.length; index += 1) {
    if (masked[index] === '\n') lineStarts.push(index + 1);
  }
  const lineOf = (offset) => {
    let low = 0;
    let high = lineStarts.length - 1;
    while (low < high) {
      const middle = Math.ceil((low + high) / 2);
      if (lineStarts[middle] <= offset) low = middle;
      else high = middle - 1;
    }
    return low;
  };

  const primary = [];
  const secondary = [];
  const pattern = /[A-Za-z_]\w*|->|\+\+|--|&&|\|\||==|!=|<=|>=/g;
  let match;
  while ((match = pattern.exec(masked)) !== null) {
    const token = match[0];
    if (token.length < 2) continue;
    const line = lineOf(match.index);
    let score = CLOZE_KEYWORDS.get(token) || 0;
    const after = masked.slice(match.index + token.length, match.index + token.length + 4);
    const before = masked.slice(Math.max(0, match.index - 3), match.index);

    if (!score && /^\s*\(/.test(after) && !CONTROL_WORDS.has(token)) score = 8;
    if (!score && /(?:->|\.)\s*$/.test(before)) score = 7;
    if (!score && /^[A-Z][A-Za-z0-9_]*$/.test(token)) score = 5;

    const candidate = { token, start: match.index, end: match.index + token.length, line, score };
    if (score > 0) primary.push(candidate);
    else if (/^[A-Za-z_]\w{3,}$/.test(token)) secondary.push(candidate);
  }

  const lines = original.split('\n');
  const target = Math.min(6, Math.max(3, Math.round(lines.length / 2.5)));
  const chosen = [];
  const usedTokens = new Set();
  const lineCounts = new Map();

  const rank = (a, b) => b.score - a.score || a.start - b.start;
  const collect = (list, maxPerLine) => {
    for (const candidate of [...list].sort(rank)) {
      if (chosen.length >= target) break;
      if (usedTokens.has(candidate.token)) continue;
      const used = lineCounts.get(candidate.line) || 0;
      if (used >= maxPerLine) continue;
      usedTokens.add(candidate.token);
      lineCounts.set(candidate.line, used + 1);
      chosen.push(candidate);
    }
  };

  collect(primary, 1);
  if (chosen.length < target) collect(primary, 2);
  if (chosen.length < 3) collect(secondary, 2);

  return chosen
    .sort((a, b) => a.start - b.start)
    .map((blank, index) => ({ ...blank, index }));
}

/* Build blanks from an admin-curated token list (first occurrence of each). */
function buildCustomBlanks(code, tokens) {
  const original = normalizeNewlines(code);
  const masked = maskCode(original);
  const lineStarts = [0];
  for (let index = 0; index < masked.length; index += 1) {
    if (masked[index] === '\n') lineStarts.push(index + 1);
  }
  const lineOf = (offset) => {
    let low = 0;
    let high = lineStarts.length - 1;
    while (low < high) {
      const middle = Math.ceil((low + high) / 2);
      if (lineStarts[middle] <= offset) low = middle;
      else high = middle - 1;
    }
    return low;
  };

  const chosen = [];
  const used = new Set();
  tokens.forEach((token) => {
    if (!token || used.has(token)) return;
    let start = -1;
    if (/^[A-Za-z_]\w*$/.test(token)) {
      const pattern = new RegExp(`\\b${token}\\b`);
      const match = pattern.exec(masked);
      if (match) start = match.index;
    } else {
      start = masked.indexOf(token);
    }
    if (start < 0) return;
    used.add(token);
    chosen.push({ token, start, end: start + token.length, line: lineOf(start) });
  });

  return chosen
    .sort((a, b) => a.start - b.start)
    .map((blank, index) => ({ ...blank, index }));
}

function ensureBlanks() {
  const exercise = getCurrentExercise();
  if (!exercise) return;
  if (state.blanksFor === exercise.id) return;
  const custom = Array.isArray(exercise.blanks) ? exercise.blanks : [];
  let blanks = custom.length ? buildCustomBlanks(exercise.code, custom) : [];
  if (!blanks.length) blanks = buildBlanks(exercise.code);
  state.blanks = blanks;
  state.blanksFor = exercise.id;
  state.clozeValues = new Array(state.blanks.length).fill('');
}

function fitBlankInput(input, tokenLength) {
  const valueLen = (input.value || '').length;
  const len = Math.max(tokenLength || 0, valueLen, 3);
  input.style.width = `${len + 1}ch`;
}

function renderCloze() {
  ensureBlanks();
  const exercise = getCurrentExercise();
  if (!exercise) return;
  const code = normalizeNewlines(exercise.code).replace(/\s+$/, '');
  const lines = code.split('\n');
  const blanksByLine = new Map();
  state.blanks.forEach((blank) => {
    if (!blanksByLine.has(blank.line)) blanksByLine.set(blank.line, []);
    blanksByLine.get(blank.line).push(blank);
  });

  const fragment = document.createDocumentFragment();
  let offset = 0;
  lines.forEach((lineText, lineIndex) => {
    const row = document.createElement('div');
    row.className = 'cloze-line';

    const number = document.createElement('span');
    number.className = 'cloze-line-number';
    number.setAttribute('aria-hidden', 'true');
    number.textContent = String(lineIndex + 1);

    const content = document.createElement('span');
    content.className = 'cloze-line-content';

    let cursor = 0;
    (blanksByLine.get(lineIndex) || []).forEach((blank) => {
      const startColumn = blank.start - offset;
      const endColumn = blank.end - offset;
      content.append(document.createTextNode(lineText.slice(cursor, startColumn)));
      const input = document.createElement('input');
      input.type = 'text';
      input.className = 'blank-input';
      input.dataset.blankIndex = String(blank.index);
      input.dataset.tokenLength = String(blank.token.length);
      input.value = state.clozeValues[blank.index] || '';
      input.setAttribute('aria-label', `Blank ${blank.index + 1}, line ${lineIndex + 1}`);
      input.setAttribute('autocomplete', 'off');
      input.spellcheck = false;
      fitBlankInput(input, blank.token.length);
      content.append(input);
      cursor = endColumn;
    });
    content.append(document.createTextNode(lineText.slice(cursor)));

    row.append(number, content);
    fragment.append(row);
    offset += lineText.length + 1;
  });

  $('cloze-code').replaceChildren(fragment);
}

function normalizeFriendlyLine(line) {
  const collapseSpaces = !state.checkpoints.spaces;
  let output = '';
  let quote = null;
  let escaped = false;
  let pendingSpace = false;

  const addChar = (ch) => {
    let c = ch;
    if (!state.checkpoints.case) c = c.toLowerCase();
    if (!state.checkpoints.punctuation) c = PUNCTUATION_MAP[c] || c;
    output += c;
  };

  for (const character of line) {
    if (quote) {
      output += character;
      if (escaped) escaped = false;
      else if (character === '\\') escaped = true;
      else if (character === quote) quote = null;
      continue;
    }

    if (character === '"' || character === "'") {
      if (pendingSpace && output) output += ' ';
      pendingSpace = false;
      output += character;
      quote = character;
      continue;
    }

    if (collapseSpaces && (character === ' ' || character === '\t')) {
      pendingSpace = true;
      continue;
    }

    if (pendingSpace && output) output += ' ';
    pendingSpace = false;
    addChar(character);
  }

  return output;
}

function normalizeFriendly(code) {
  const lines = normalizeNewlines(code).split('\n');
  const filtered = state.checkpoints.newlines ? lines : lines.filter((line) => line.trim().length > 0);
  return filtered.map(normalizeFriendlyLine).join('\n');
}

function prepareLines(code) {
  const originalLines = normalizeNewlines(code).split('\n');
  const checkableLines = stripComments(code).split('\n');
  const pairs = originalLines
    .map((text, index) => ({
      text,
      key: normalizeFriendlyLine(checkableLines[index] ?? ''),
      number: index + 1,
    }));
  return state.checkpoints.newlines ? pairs : pairs.filter((line) => line.key.trim().length > 0);
}

function buildLineDiff(reference, answer) {
  const referenceLines = prepareLines(reference);
  const answerLines = prepareLines(answer);
  const rows = referenceLines.length;
  const columns = answerLines.length;
  const table = Array.from({ length: rows + 1 }, () => new Uint16Array(columns + 1));

  for (let i = rows - 1; i >= 0; i -= 1) {
    for (let j = columns - 1; j >= 0; j -= 1) {
      table[i][j] = referenceLines[i].key === answerLines[j].key
        ? table[i + 1][j + 1] + 1
        : Math.max(table[i + 1][j], table[i][j + 1]);
    }
  }

  const aligned = [];
  let i = 0;
  let j = 0;
  while (i < rows || j < columns) {
    if (i < rows && j < columns && referenceLines[i].key === answerLines[j].key) {
      aligned.push({ type: 'same', reference: referenceLines[i], answer: answerLines[j] });
      i += 1;
      j += 1;
    } else if (i < rows && (j === columns || table[i + 1][j] >= table[i][j + 1])) {
      aligned.push({ type: 'missing', reference: referenceLines[i], answer: null });
      i += 1;
    } else {
      aligned.push({ type: 'added', reference: null, answer: answerLines[j] });
      j += 1;
    }
  }

  const diff = [];
  let cursor = 0;
  while (cursor < aligned.length) {
    if (aligned[cursor].type === 'same') {
      diff.push(aligned[cursor]);
      cursor += 1;
      continue;
    }

    const changed = [];
    while (cursor < aligned.length && aligned[cursor].type !== 'same') {
      changed.push(aligned[cursor]);
      cursor += 1;
    }
    const expected = changed.filter((item) => item.reference);
    const actual = changed.filter((item) => item.answer);
    const count = Math.max(expected.length, actual.length);
    for (let index = 0; index < count; index += 1) {
      const referenceLine = expected[index]?.reference || null;
      const answerLine = actual[index]?.answer || null;
      diff.push({
        type: referenceLine && answerLine ? 'modified' : referenceLine ? 'missing' : 'added',
        reference: referenceLine,
        answer: answerLine,
      });
    }
  }

  return { diff, referenceLines, answerLines };
}

function compareCode(reference, answer) {
  const passed = normalizeFriendly(stripComments(reference)) === normalizeFriendly(stripComments(answer));
  const comparison = buildLineDiff(reference, answer);
  const matched = comparison.diff.filter((line) => line.type === 'same').length;
  const denominator = Math.max(comparison.diff.length, 1);
  const accuracy = passed ? 100 : Math.round((matched / denominator) * 100);
  return { mode: 'friendly', passed, accuracy, ...comparison };
}

function checkCloze() {
  ensureBlanks();
  if (!state.blanks.length) return;
  const keepSpaces = state.checkpoints.spaces;
  const details = state.blanks.map((blank, index) => {
    const raw = state.clozeValues[index] || '';
    const value = keepSpaces ? raw : raw.trim();
    const correct = normalizeToken(value) === normalizeToken(blank.token);
    const input = document.querySelector(`.blank-input[data-blank-index="${index}"]`);
    if (input) {
      input.classList.toggle('is-correct', correct);
      input.classList.toggle('is-wrong', !correct);
      input.setAttribute('aria-invalid', String(!correct));
    }
    return { index, value, expected: blank.token, correct };
  });
  const correct = details.filter((item) => item.correct).length;
  const passed = correct === details.length;
  state.result = {
    mode: 'cloze',
    passed,
    accuracy: Math.round((correct / details.length) * 100),
    correct,
    total: details.length,
    details,
  };
}

function checkRecall() {
  const exercise = getCurrentExercise();
  if (!exercise) return;
  if (state.mode === 'cloze') {
    checkCloze();
  } else {
    state.answer = $('code-input').value;
    state.result = compareCode(exercise.code, state.answer);
  }

  const previous = getRecord(exercise.id);
  state.records[exercise.id] = {
    completed: Boolean(previous.completed) || state.result.passed,
    bestAccuracy: Math.max(Number(previous.bestAccuracy) || 0, state.result.accuracy),
    attempts: (Number(previous.attempts) || 0) + 1,
    lastMode: state.mode,
  };

  saveState();
  renderResult();
  renderProgress();
  renderLibrary();
  const record = getRecord(exercise.id);
  $('best-tag').hidden = false;
  $('best-tag').textContent = `Best ${Math.round(record.bestAccuracy)}%`;
  $('result-card').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function renderResult() {
  const result = state.result;
  $('result-card').hidden = !result;
  $('practice-empty').hidden = Boolean(result);
  if (!result) return;

  const isCloze = result.mode === 'cloze';
  const issueCount = isCloze ? result.total - result.correct : result.diff.filter((line) => line.type !== 'same').length;
  $('result-card').classList.toggle('is-success', result.passed);
  $('result-eyebrow').textContent = result.passed
    ? (isCloze ? 'ALL BLANKS CORRECT' : 'EXACT RECALL')
    : (isCloze ? 'BLANKS CHECKED' : 'RECALL CHECKED');
  $('result-title').textContent = result.passed ? 'Nicely done.' : 'Keep practicing.';
  $('result-message').textContent = result.passed
    ? (isCloze ? 'Every blank matches the original code.' : 'Every compared line matches the original code.')
    : (isCloze
      ? `${issueCount} of ${result.total} ${issueCount === 1 ? 'blank needs' : 'blanks need'} attention.`
      : `${issueCount} ${issueCount === 1 ? 'line needs' : 'lines need'} attention. Compare the expected code with your recall below.`);
  $('accuracy-value').textContent = `${result.accuracy}%`;
  $('accuracy-label').textContent = isCloze ? 'Blanks correct' : 'Line accuracy';
  $('blank-review').hidden = !isCloze || result.passed;
  $('diff-legend').hidden = isCloze;
  $('diff-table').hidden = isCloze;
  $('result-icon').innerHTML = result.passed
    ? '<svg viewBox="0 0 24 24" fill="none"><path d="m6 12 4 4 8-9" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>'
    : '<svg viewBox="0 0 24 24" fill="none"><path d="m8 8 8 8M16 8l-8 8" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>';

  if (isCloze) {
    const review = document.createDocumentFragment();
    result.details.forEach((detail) => {
      if (detail.correct) return;
      const row = document.createElement('div');
      row.className = 'blank-review-row';
      const label = document.createElement('span');
      label.className = 'blank-index';
      label.textContent = `#${detail.index + 1}`;
      const expected = document.createElement('code');
      expected.textContent = detail.expected;
      const actual = document.createElement('span');
      actual.className = 'blank-your-answer';
      actual.textContent = detail.value ? `You wrote ${detail.value}` : 'Blank left empty';
      row.append(label, expected, actual);
      review.append(row);
    });
    $('blank-review').replaceChildren(review);
    return;
  }

  $('diff-mode-label').textContent = 'Full recall comparison';
  const fragment = document.createDocumentFragment();
  result.diff.forEach((line) => {
    const row = document.createElement('div');
    row.className = `diff-row ${line.type}`;
    row.setAttribute('role', 'row');

    const number = document.createElement('span');
    number.className = 'diff-line-number';
    number.setAttribute('role', 'cell');
    number.textContent = String(line.reference?.number ?? line.answer?.number ?? '');

    const expected = document.createElement('span');
    expected.className = 'expected-cell';
    expected.setAttribute('role', 'cell');
    expected.textContent = line.reference?.text ?? '—';

    const actual = document.createElement('span');
    actual.className = 'answer-cell';
    actual.setAttribute('role', 'cell');
    actual.textContent = line.answer?.text ?? '—';

    row.append(number, expected, actual);
    fragment.append(row);
  });
  $('diff-rows').replaceChildren(fragment);
}

function selectExercise(id, scrollOnMobile = false) {
  if (!exercises.some((item) => item.id === id)) return;
  state.selectedId = id;
  state.answer = '';
  state.blanksFor = null;
  state.blanks = [];
  state.clozeValues = [];
  state.result = null;
  state.revealed = false;
  saveState();
  renderPractice();
  renderLibrary();
  $('practice').scrollTo({ top: 0, behavior: 'smooth' });
  if (scrollOnMobile && window.matchMedia('(max-width: 780px)').matches) {
    $('practice').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

function selectNextExercise() {
  const filtered = getFilteredExercises();
  if (!filtered.length) return;
  const currentIndex = filtered.findIndex((item) => item.id === state.selectedId);
  const next = filtered[(currentIndex + 1 + filtered.length) % filtered.length];
  selectExercise(next.id, true);
}

function setMode(mode) {
  if (!['cloze', 'friendly'].includes(mode) || state.mode === mode) return;
  state.mode = mode;
  state.result = null;
  saveState();
  renderPractice();
}

function renderChapterOptions() {
  const chapters = [...new Set(exercises.map((item) => item.chapter))];
  const select = $('chapter-select');
  const fragment = document.createDocumentFragment();
  const all = document.createElement('option');
  all.value = 'all';
  all.textContent = 'All chapters';
  fragment.append(all);
  chapters.forEach((chapter) => {
    const option = document.createElement('option');
    option.value = chapter;
    option.textContent = chapter;
    fragment.append(option);
  });
  select.replaceChildren(fragment);
  if (state.chapter !== 'all' && chapters.includes(state.chapter)) select.value = state.chapter;
  else {
    state.chapter = 'all';
    select.value = 'all';
  }
}

/* Replace the static bundle with the server-side snippet library (admin editable). */
async function refreshExercises(resetCurrent = false) {
  try {
    const res = await fetch('/api/snippets', { cache: 'no-store' });
    if (!res.ok) return false;
    const data = await res.json();
    const list = Array.isArray(data.snippets) ? data.snippets : [];
    if (!list.length) return false;
    exercises.splice(0, exercises.length, ...list);
    if (!exercises.some((item) => item.id === state.selectedId)) {
      state.selectedId = exercises[0].id;
      resetCurrent = true;
    }
    if (resetCurrent) {
      state.answer = '';
      state.blanks = [];
      state.blanksFor = null;
      state.clozeValues = [];
      state.result = null;
      state.revealed = false;
    }
    renderChapterOptions();
    renderLibrary();
    renderProgress();
    renderPractice();
    return true;
  } catch {
    return false;
  }
}

function bindEvents() {
  $('exercise-list').addEventListener('click', (event) => {
    const button = event.target.closest('[data-exercise-id]');
    if (button) selectExercise(button.dataset.exerciseId, true);
  });

  $('search-input').addEventListener('input', (event) => {
    state.query = event.target.value;
    renderLibrary();
  });

  $('chapter-select').addEventListener('change', (event) => {
    state.chapter = event.target.value;
    renderLibrary();
  });

  document.querySelectorAll('[data-status]').forEach((button) => {
    button.addEventListener('click', () => {
      state.status = button.dataset.status;
      document.querySelectorAll('[data-status]').forEach((item) => {
        const active = item === button;
        item.classList.toggle('is-active', active);
        item.setAttribute('aria-pressed', String(active));
      });
      renderLibrary();
    });
  });

  document.querySelectorAll('[data-mode]').forEach((button) => {
    button.addEventListener('click', () => setMode(button.dataset.mode));
  });

  document.querySelectorAll('.checkpoint-toggle').forEach((button) => {
    button.addEventListener('click', () => {
      const key = button.dataset.checkpoint;
      state.checkpoints[key] = !state.checkpoints[key];
      saveState();
      renderCheckpoints();
      if (state.result) {
        if (state.mode === 'cloze') {
          checkCloze();
        } else {
          state.result = compareCode(getCurrentExercise().code, state.answer);
        }
        renderResult();
      }
    });
  });

  $('clear-filters').addEventListener('click', () => {
    state.query = '';
    state.chapter = 'all';
    state.status = 'all';
    $('search-input').value = '';
    $('chapter-select').value = 'all';
    document.querySelectorAll('[data-status]').forEach((item) => {
      const active = item.dataset.status === 'all';
      item.classList.toggle('is-active', active);
      item.setAttribute('aria-pressed', String(active));
    });
    renderLibrary();
  });

  $('code-input').addEventListener('input', (event) => {
    state.answer = event.target.value;
    state.result = null;
    updateEditorStats();
    renderResult();
  });
  $('code-input').addEventListener('scroll', (event) => {
    $('line-numbers').scrollTop = event.target.scrollTop;
  });
  $('code-input').addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      checkRecall();
    }
  });

  $('cloze-code').addEventListener('input', (event) => {
    const input = event.target.closest('.blank-input');
    if (!input) return;
    const index = Number(input.dataset.blankIndex);
    state.clozeValues[index] = input.value;
    fitBlankInput(input, Number(input.dataset.tokenLength) || 0);
    input.classList.remove('is-correct', 'is-wrong');
    input.removeAttribute('aria-invalid');
    state.result = null;
    updateEditorStats();
    renderResult();
  });

  $('cloze-code').addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      checkRecall();
      return;
    }
    if (event.key === 'Enter' && event.target.classList.contains('blank-input')) {
      event.preventDefault();
      const inputs = [...document.querySelectorAll('.blank-input')];
      const next = inputs[inputs.indexOf(event.target) + 1];
      if (next) next.focus();
      else checkRecall();
    }
  });

  $('check-button').addEventListener('click', checkRecall);
  $('next-button').addEventListener('click', selectNextExercise);
  $('reset-button').addEventListener('click', () => {
    state.answer = '';
    state.clozeValues = new Array(state.blanks.length).fill('');
    state.result = null;
    state.revealed = false;
    renderPractice();
    if (state.mode === 'cloze') {
      document.querySelector('.blank-input')?.focus();
    } else {
      $('code-input').focus();
    }
  });
  $('reveal-button').addEventListener('click', () => {
    state.revealed = !state.revealed;
    renderAnswer();
  });
  $('copy-button').addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(getCurrentExercise().code);
      $('copy-button').textContent = 'Copied';
      setTimeout(() => { $('copy-button').textContent = 'Copy code'; }, 1600);
    } catch {
      showToast('Copy is unavailable. Select the reference code manually.');
    }
  });

  document.addEventListener('keydown', (event) => {
    const target = event.target;
    const isTyping = target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement;
    if (event.key === '/' && !isTyping && !event.metaKey && !event.ctrlKey && !event.altKey) {
      event.preventDefault();
      $('search-input').focus();
    }
  });
}

// ---------- Invite gate & admin ----------

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = String(str ?? '');
  return div.innerHTML;
}

const INVITE_STORAGE_KEY = 'code-recall-invite';
let adminToken = null;

function getStoredInvite() {
  try {
    return JSON.parse(localStorage.getItem(INVITE_STORAGE_KEY) || 'null');
  } catch { return null; }
}

function hasValidInvite() {
  const stored = getStoredInvite();
  if (!stored || !stored.code) return false;
  if (stored.expires) {
    const exp = new Date(stored.expires);
    if (!isNaN(exp) && exp < new Date()) return false;
  }
  return true;
}

function showInviteGate() {
  $('invite-gate').hidden = false;
  setTimeout(() => $('invite-input').focus(), 50);
}

function hideInviteGate() {
  $('invite-gate').hidden = true;
}

function formatInviteCode(value) {
  const cleaned = value.replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 8);
  if (cleaned.length <= 4) return cleaned;
  return cleaned.slice(0, 4) + '-' + cleaned.slice(4);
}

async function validateInvite(code) {
  try {
    const res = await fetch('/api/invite/validate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code }),
    });
    return await res.json();
  } catch {
    return { valid: false, message: 'Network error. Please try again.' };
  }
}

function submitInvite() {
  const input = $('invite-input');
  const code = input.value.trim();
  if (!code) {
    showInviteError('Please enter an invite code.');
    return;
  }
  const errorEl = $('invite-error');
  errorEl.hidden = true;
  const submitBtn = input.form.querySelector('.invite-submit');
  submitBtn.disabled = true;
  validateInvite(code).then((result) => {
    submitBtn.disabled = false;
    if (result.valid) {
      localStorage.setItem(INVITE_STORAGE_KEY, JSON.stringify({
        code,
        expires: result.expires || null,
        unlockedAt: new Date().toISOString(),
      }));
      hideInviteGate();
    } else {
      showInviteError(result.message || 'Invalid invite code.');
    }
  });
}

function showInviteError(message) {
  const el = $('invite-error');
  el.textContent = message;
  el.hidden = false;
}

// ---- Admin ----
let activeAdminTab = 'invites';

function switchAdminTab(tab) {
  activeAdminTab = tab;
  document.querySelectorAll('[data-admin-tab]').forEach((button) => {
    const active = button.dataset.adminTab === tab;
    button.classList.toggle('is-active', active);
    button.setAttribute('aria-selected', String(active));
  });
  document.querySelectorAll('.admin-panel').forEach((panel) => {
    panel.hidden = panel.id !== `admin-panel-${tab}`;
  });
  if (tab === 'invites') loadAdminCodes();
  else if (tab === 'snippets') loadAdminSnippets();
  else if (tab === 'feishu') loadFeishuStatus();
}

function openAdmin() {
  $('admin-modal').hidden = false;
  if (adminToken) {
    $('admin-auth').hidden = true;
    $('admin-body').hidden = false;
    switchAdminTab(activeAdminTab);
  } else {
    $('admin-auth').hidden = false;
    $('admin-body').hidden = true;
    setTimeout(() => $('admin-token-input').focus(), 50);
  }
}

function closeAdmin() {
  $('admin-modal').hidden = true;
}

async function adminApi(path, options = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (adminToken) headers.Authorization = `Bearer ${adminToken}`;
  const res = await fetch(path, { ...options, headers });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
}

async function adminLogin() {
  const token = $('admin-token-input').value.trim();
  if (!token) return;
  adminToken = token;
  const { status } = await adminApi('/api/admin/invites');
  if (status === 401) {
    adminToken = null;
    const err = $('admin-error');
    err.textContent = 'Invalid admin token.';
    err.hidden = false;
    return;
  }
  $('admin-error').hidden = true;
  $('admin-auth').hidden = true;
  $('admin-body').hidden = false;
  switchAdminTab(activeAdminTab);
}

async function loadAdminCodes() {
  const { data } = await adminApi('/api/admin/invites');
  renderAdminCodes(data.codes || []);
}

function renderAdminCodes(codes) {
  const table = $('admin-table');
  if (!codes.length) {
    table.innerHTML = '<div class="admin-empty">No invite codes yet. Generate one above.</div>';
    return;
  }
  table.innerHTML = codes.map((c) => {
    const status = c.status || 'active';
    const expires = c.expires ? new Date(c.expires).toLocaleDateString() : 'Never';
    const uses = `${c.usedCount || 0}${c.maxUses ? ' / ' + c.maxUses : ''}`;
    const canRevoke = status === 'active';
    return `
      <div class="admin-code-row">
        <div class="admin-code-main">
          <span class="admin-code-code">${c.code}</span>
          ${c.note ? `<span class="admin-code-note">${escapeHtml(c.note)}</span>` : ''}
        </div>
        <span class="admin-code-meta">Expires: ${expires}</span>
        <span class="admin-code-meta">Uses: ${uses}</span>
        <span class="admin-status ${status}">${status}</span>
        <button type="button" class="admin-revoke" data-code="${c.code}" ${canRevoke ? '' : 'disabled'}>${canRevoke ? 'Revoke' : status}</button>
      </div>
    `;
  }).join('');
  table.querySelectorAll('.admin-revoke[data-code]').forEach((btn) => {
    btn.addEventListener('click', () => revokeCode(btn.dataset.code));
  });
}

async function generateCode() {
  const expiryDays = parseInt($('gen-expiry').value, 10);
  const maxUses = parseInt($('gen-maxuses').value, 10);
  const note = $('gen-note').value.trim();
  const { data } = await adminApi('/api/admin/invites', {
    method: 'POST',
    body: JSON.stringify({ expiryDays: isNaN(expiryDays) ? 30 : expiryDays, maxUses: isNaN(maxUses) ? 1 : maxUses, note }),
  });
  if (data.code) {
    showToast(`Generated ${data.code.code}`);
    $('gen-note').value = '';
    loadAdminCodes();
  }
}

async function revokeCode(code) {
  if (!confirm(`Revoke invite code ${code}?`)) return;
  await adminApi(`/api/admin/invites/${code}`, { method: 'DELETE' });
  loadAdminCodes();
}

// ---- Admin: snippet library ----

let adminSnippets = [];
let editingSnippetId = null;
let draftBlanks = [];

async function loadAdminSnippets() {
  const { status, data } = await adminApi('/api/snippets');
  if (status !== 200) return;
  adminSnippets = Array.isArray(data.snippets) ? data.snippets : [];
  renderAdminSnippets();
  renderSnippetChapterOptions();
}

function renderSnippetChapterOptions() {
  const datalist = $('snippet-chapter-options');
  const chapters = [...new Set(exercises.map((item) => item.chapter))];
  datalist.replaceChildren(...chapters.map((chapter) => {
    const option = document.createElement('option');
    option.value = chapter;
    return option;
  }));
}

function renderAdminSnippets() {
  const list = $('snippet-admin-list');
  if (!adminSnippets.length) {
    list.innerHTML = '<div class="admin-empty">No snippets yet. Create one to add it to the practice library.</div>';
    return;
  }
  list.innerHTML = adminSnippets.map((snippet) => {
    const customCount = Array.isArray(snippet.blanks) ? snippet.blanks.length : 0;
    const blankLabel = customCount ? `${customCount} custom blanks` : 'auto blanks';
    return `
      <div class="snippet-row">
        <div class="snippet-row-main">
          <strong>${escapeHtml(snippet.title)}</strong>
          <small>${escapeHtml(snippet.chapter)} · ${escapeHtml(snippet.language)} · ${blankLabel}</small>
        </div>
        <button type="button" class="admin-revoke" data-edit-snippet="${escapeHtml(snippet.id)}">Edit</button>
      </div>
    `;
  }).join('');
  list.querySelectorAll('[data-edit-snippet]').forEach((button) => {
    button.addEventListener('click', () => {
      const snippet = adminSnippets.find((item) => item.id === button.dataset.editSnippet);
      if (snippet) openSnippetEditor(snippet);
    });
  });
}

function openSnippetEditor(snippet) {
  editingSnippetId = snippet ? snippet.id : null;
  $('snippet-editor').hidden = false;
  $('snippet-editor-title').textContent = snippet ? 'Edit snippet' : 'New snippet';
  $('snippet-title').value = snippet ? snippet.title : '';
  $('snippet-chapter').value = snippet ? snippet.chapter : (getCurrentExercise()?.chapter || '');
  $('snippet-language').value = snippet ? snippet.language : 'C';
  $('snippet-description').value = snippet ? snippet.description : '';
  $('snippet-code').value = snippet ? normalizeNewlines(snippet.code) : '';
  draftBlanks = Array.isArray(snippet?.blanks) ? [...snippet.blanks] : [];
  $('snippet-delete').hidden = !snippet;
  $('snippet-status').textContent = '';
  renderBlankEditor();
  $('snippet-editor').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function renderBlankEditor() {
  const code = normalizeNewlines($('snippet-code').value);
  const masked = maskCode(code);
  const present = new Set(scanTokens(masked).map((item) => item.token));

  const chips = $('snippet-blank-chips');
  chips.replaceChildren();
  if (!draftBlanks.length) {
    const empty = document.createElement('span');
    empty.className = 'blank-chip-empty';
    empty.textContent = 'Automatic blanks will be used.';
    chips.append(empty);
  } else {
    draftBlanks.forEach((token) => {
      const chip = document.createElement('span');
      chip.className = `blank-chip${present.has(token) ? '' : ' is-missing'}`;
      const label = document.createElement('code');
      label.textContent = token;
      const remove = document.createElement('button');
      remove.type = 'button';
      remove.textContent = '×';
      remove.setAttribute('aria-label', `Remove blank ${token}`);
      remove.addEventListener('click', () => {
        draftBlanks = draftBlanks.filter((item) => item !== token);
        renderBlankEditor();
      });
      chip.append(label, remove);
      chips.append(chip);
    });
  }

  const preview = $('snippet-token-preview');
  preview.replaceChildren();
  if (!code) {
    preview.textContent = 'Paste code above to pick blanks.';
    return;
  }
  const fragment = document.createDocumentFragment();
  let cursor = 0;
  scanTokens(masked).forEach(({ token, index }) => {
    if (index > cursor) fragment.append(document.createTextNode(code.slice(cursor, index)));
    const selected = draftBlanks.includes(token);
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `token${selected ? ' is-blank' : ''}`;
    button.textContent = token;
    button.title = selected ? 'Remove blank' : 'Add blank';
    button.addEventListener('click', () => {
      draftBlanks = selected
        ? draftBlanks.filter((item) => item !== token)
        : [...draftBlanks, token];
      renderBlankEditor();
    });
    fragment.append(button);
    cursor = index + token.length;
  });
  if (cursor < code.length) fragment.append(document.createTextNode(code.slice(cursor)));
  preview.append(fragment);
}

function setSnippetStatus(message, isError) {
  const el = $('snippet-status');
  el.textContent = message;
  el.classList.toggle('is-error', Boolean(isError));
}

async function saveSnippet(event) {
  event.preventDefault();
  const title = $('snippet-title').value.trim();
  const code = normalizeNewlines($('snippet-code').value);
  if (!title) {
    setSnippetStatus('Title is required.', true);
    return;
  }
  if (!code.trim()) {
    setSnippetStatus('Code is required.', true);
    return;
  }
  const present = new Set(scanTokens(maskCode(code)).map((item) => item.token));
  const blanks = draftBlanks.filter((token) => present.has(token));
  const payload = {
    title,
    chapter: $('snippet-chapter').value.trim() || 'Uncategorized',
    language: $('snippet-language').value.trim() || 'C',
    description: $('snippet-description').value.trim(),
    code,
    blanks,
  };

  const saveButton = $('snippet-save');
  saveButton.disabled = true;
  try {
    const { status, data } = editingSnippetId
      ? await adminApi(`/api/admin/snippets/${encodeURIComponent(editingSnippetId)}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      })
      : await adminApi('/api/admin/snippets', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    if (status >= 400) {
      setSnippetStatus(data.error || 'Could not save the snippet.', true);
      return;
    }
    $('snippet-editor').hidden = true;
    await loadAdminSnippets();
    await refreshExercises(true);
    showToast('Snippet saved. Practice library updated.');
  } finally {
    saveButton.disabled = false;
  }
}

async function deleteSnippet() {
  if (!editingSnippetId) return;
  if (!confirm('Delete this snippet? It will be removed from the practice library.')) return;
  const { status, data } = await adminApi(`/api/admin/snippets/${encodeURIComponent(editingSnippetId)}`, {
    method: 'DELETE',
  });
  if (status >= 400) {
    setSnippetStatus(data.error || 'Could not delete the snippet.', true);
    return;
  }
  $('snippet-editor').hidden = true;
  await loadAdminSnippets();
  await refreshExercises(true);
  showToast('Snippet deleted.');
}

// ---- Admin: Feishu ----

async function loadFeishuStatus() {
  const box = $('feishu-status');
  box.textContent = 'Checking configuration…';
  const { status, data } = await adminApi('/api/admin/feishu/status');
  if (status !== 200) {
    box.textContent = 'Could not read the Feishu status.';
    return;
  }
  const feishu = data.feishu || {};
  const rows = [
    ['Bitable sync', feishu.bitable ? 'configured' : 'not configured'],
    ['Bot commands', feishu.bot ? 'configured' : 'not configured'],
    ['Webhook notifications', feishu.webhook ? 'on' : 'off'],
    ['Authorized bot admins', String(feishu.adminOpenIds ?? 0)],
  ];
  box.innerHTML = rows.map(([label, value]) => `<span><strong>${label}:</strong> ${value}</span>`).join('');
}

async function runFeishuSync(action) {
  const result = $('feishu-result');
  result.hidden = false;
  result.classList.remove('is-error');
  result.textContent = action === 'pull' ? 'Pulling codes from Feishu…' : 'Pushing codes to Feishu…';
  const { status, data } = await adminApi('/api/admin/feishu/sync', {
    method: 'POST',
    body: JSON.stringify({ action }),
  });
  if (status !== 200 || !data.ok) {
    result.classList.add('is-error');
    result.textContent = data.error || 'Feishu sync failed.';
    return;
  }
  const summary = data.result || {};
  result.textContent = action === 'pull'
    ? `Pulled ${summary.total ?? 0} records · added ${summary.added ?? 0} · updated ${summary.updated ?? 0}.`
    : `Pushed codes · created ${summary.created ?? 0} · updated ${summary.updated ?? 0}.`;
  await loadAdminCodes();
}

// ---- Invite gate shortcut ----

function changeInviteCode() {
  if (!confirm('Return to the invite code screen? Your progress on this device is kept.')) return;
  localStorage.removeItem(INVITE_STORAGE_KEY);
  closeAdmin();
  $('invite-input').value = '';
  $('invite-error').hidden = true;
  showInviteGate();
}

function bindInviteEvents() {
  const input = $('invite-input');
  input.addEventListener('input', () => {
    input.value = formatInviteCode(input.value);
    $('invite-error').hidden = true;
  });
  $('invite-form').addEventListener('submit', (e) => {
    e.preventDefault();
    submitInvite();
  });
  $('invite-admin-link').addEventListener('click', openAdmin);
  $('admin-close').addEventListener('click', closeAdmin);
  $('admin-modal').addEventListener('click', (e) => {
    if (e.target.id === 'admin-modal') closeAdmin();
  });
  $('admin-login').addEventListener('click', adminLogin);
  $('admin-token-input').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') adminLogin();
  });
  $('gen-button').addEventListener('click', generateCode);
  $('invites-refresh').addEventListener('click', loadAdminCodes);
  const adminEntry = $('admin-entry');
  if (adminEntry) adminEntry.addEventListener('click', openAdmin);
  $('change-invite-entry').addEventListener('click', changeInviteCode);

  document.querySelectorAll('[data-admin-tab]').forEach((button) => {
    button.addEventListener('click', () => switchAdminTab(button.dataset.adminTab));
  });

  $('snippet-new').addEventListener('click', () => openSnippetEditor(null));
  $('snippet-close').addEventListener('click', () => { $('snippet-editor').hidden = true; });
  $('snippet-cancel').addEventListener('click', () => { $('snippet-editor').hidden = true; });
  $('snippet-editor').addEventListener('submit', saveSnippet);
  $('snippet-delete').addEventListener('click', deleteSnippet);
  $('snippet-code').addEventListener('input', renderBlankEditor);
  $('snippet-auto-blanks').addEventListener('click', () => {
    draftBlanks = buildBlanks($('snippet-code').value).map((blank) => blank.token);
    renderBlankEditor();
  });
  $('snippet-clear-blanks').addEventListener('click', () => {
    draftBlanks = [];
    renderBlankEditor();
  });

  $('feishu-refresh').addEventListener('click', loadFeishuStatus);
  $('feishu-pull').addEventListener('click', () => runFeishuSync('pull'));
  $('feishu-push').addEventListener('click', () => runFeishuSync('push'));
}

async function init() {
  if (!exercises.length) {
    showToast('No exercises could be loaded.');
    return;
  }
  bindInviteEvents();
  renderChapterOptions();
  bindEvents();
  renderLibrary();
  renderProgress();
  renderPractice();
  if (!hasValidInvite()) {
    showInviteGate();
  }
  await refreshExercises();
}

init();
