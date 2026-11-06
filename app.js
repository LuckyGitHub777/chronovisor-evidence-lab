let data;

const byId = (id) => document.getElementById(id);
const VALID_MODES = new Set(['RECONSTRUCT', 'EVIDENCE', 'TIMELINE', 'DECIDE']);
const VALID_STATUSES = new Set(['KNOWN', 'INFERRED', 'POSSIBLE', 'UNKNOWN']);
const VALID_ACTIONS = new Set(['ACT', 'WAIT', 'MONITOR', 'SAFE_STOP']);

function listText(value) {
  if (Array.isArray(value)) return value.length ? value.join('; ') : 'None recorded.';
  return value || 'None recorded.';
}

function validatePackage(payload) {
  if (!payload || payload.title !== 'Pompeii — AD 79' || payload.illustrative !== true ||
      !payload.notice || !Array.isArray(payload.elements) || !Array.isArray(payload.hypotheses) ||
      !Array.isArray(payload.timeline) || typeof payload.timeline_empty_state !== 'string' ||
      typeof payload.next_best_evidence !== 'string' || !payload.decision ||
      typeof payload.decision.basis !== 'string' || typeof payload.decision.reason !== 'string' ||
      typeof payload.decision.notice !== 'string' || !Array.isArray(payload.decision.candidate_actions) ||
      !Array.isArray(payload.decision.assumptions) || !Array.isArray(payload.decision.limitations)) {
    return false;
  }

  const ids = new Set();
  for (const item of payload.elements) {
    if (!item || typeof item.id !== 'string' || ids.has(item.id) ||
        typeof item.label !== 'string' || !VALID_STATUSES.has(item.status) ||
        typeof item.why !== 'string' || !Array.isArray(item.roots) ||
        !Array.isArray(item.dependencies) || !Array.isArray(item.contradictions) ||
        !Array.isArray(item.alternatives) || !Array.isArray(item.missing_evidence) ||
        typeof item.change_condition !== 'string' ||
        Object.prototype.hasOwnProperty.call(item, 'confidence')) {
      return false;
    }
    ids.add(item.id);
  }

  for (const hypothesis of payload.hypotheses) {
    if (!hypothesis || typeof hypothesis.id !== 'string' || typeof hypothesis.label !== 'string' ||
        typeof hypothesis.position !== 'string' || !Array.isArray(hypothesis.evidence_for) ||
        !Array.isArray(hypothesis.evidence_against) || typeof hypothesis.would_change !== 'string' ||
        Object.prototype.hasOwnProperty.call(hypothesis, 'probability')) {
      return false;
    }
  }

  for (const action of payload.decision.candidate_actions) {
    if (!action || !VALID_ACTIONS.has(action.action) || typeof action.status !== 'string' ||
        typeof action.why !== 'string') return false;
  }

  const sceneIds = [...document.querySelectorAll('.evidence-object')].map((button) => button.dataset.id);
  if (sceneIds.length !== ids.size || sceneIds.some((id) => !ids.has(id))) return false;
  return true;
}

async function loadData() {
  try {
    const response = await fetch('sample-investigation.json', {cache: 'no-store'});
    if (!response.ok) throw new Error('package unavailable');
    const payload = await response.json();
    if (!validatePackage(payload)) throw new Error('package failed validation');
    data = payload;
    renderAll();
    applyEvidenceLens();
    return true;
  } catch (error) {
    data = undefined;
    byId('loadError').textContent =
      'Evidence package failed to load or validate. Nothing shown is evidence. Return to the overview and try again.';
    byId('loadError').hidden = false;
    return false;
  }
}

function makeTextElement(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  element.textContent = text;
  return element;
}

function renderAll() {
  byId('investigationTitle').textContent = data.title;
  byId('sampleNotice').textContent = data.notice;
  byId('nextEvidence').textContent = data.next_best_evidence;
  byId('decisionNotice').textContent = data.decision.notice;
  renderHypotheses();
  renderEvidenceRegister();
  renderTimeline();
  renderDecision();
}

function renderHypotheses() {
  const box = byId('hypotheses');
  box.replaceChildren();

  for (const hypothesis of data.hypotheses) {
    const row = document.createElement('article');
    row.className = 'hypothesis';

    const heading = document.createElement('div');
    heading.className = 'hypothesis-heading';
    heading.append(
      makeTextElement('span', 'hypothesis-id', hypothesis.id),
      makeTextElement('h3', '', hypothesis.label),
      makeTextElement('span', 'role-tag', hypothesis.position)
    );

    const forText = makeTextElement('p', 'meta', 'For: ' + listText(hypothesis.evidence_for));
    const againstText = makeTextElement('p', 'meta', 'Against: ' + listText(hypothesis.evidence_against));
    const changeText = makeTextElement('p', 'meta', 'Would change: ' + hypothesis.would_change);

    row.append(heading, forText, againstText, changeText);
    box.appendChild(row);
  }
}

function renderEvidenceRegister() {
  const box = byId('evidenceRegister');
  box.replaceChildren();

  for (const item of data.elements) {
    const row = document.createElement('article');
    row.className = 'claim-row';

    const heading = document.createElement('div');
    heading.className = 'claim-heading';
    heading.append(
      makeTextElement('h3', '', item.label),
      makeTextElement('span', 'status-tag ' + item.status.toLowerCase(), item.status)
    );

    const why = makeTextElement('p', 'meta', item.why);
    const roots = makeTextElement('p', 'meta', 'Illustrative roots: ' + listText(item.roots));
    const inspect = makeTextElement('button', 'text-button', 'SHOW ME WHY — ' + item.label);
    inspect.type = 'button';
    inspect.dataset.inspectId = item.id;

    row.append(heading, why, roots, inspect);
    box.appendChild(row);
  }
}

function renderTimeline() {
  const box = byId('timeline');
  box.replaceChildren();

  if (!data.timeline.length) {
    const empty = document.createElement('div');
    empty.className = 'empty-state';
    empty.id = 'timelineEmpty';
    empty.append(
      makeTextElement('p', 'empty-title', 'No dated event sequence is included.'),
      makeTextElement('p', 'meta', data.timeline_empty_state)
    );
    box.appendChild(empty);
    return;
  }

  for (const entry of data.timeline) {
    const row = document.createElement('article');
    row.className = 'timeline-row';
    row.append(
      makeTextElement('h3', '', entry.label),
      makeTextElement('p', 'meta', entry.note),
      makeTextElement('span', 'status-tag', entry.status)
    );
    box.appendChild(row);
  }
}

function renderDecision() {
  byId('decisionBasis').textContent =
    'Current decision basis favors ' + data.decision.basis + '. ' +
    data.decision.reason + ' Human authority remains explicit.';

  const actions = byId('decisionActions');
  actions.replaceChildren();
  for (const item of data.decision.candidate_actions) {
    const row = document.createElement('article');
    row.className = 'decision-row';
    row.append(
      makeTextElement('h3', '', item.action + ' · ' + item.status),
      makeTextElement('p', 'meta', item.why)
    );
    actions.appendChild(row);
  }

  const limits = byId('decisionLimits');
  limits.replaceChildren();
  for (const text of [...data.decision.assumptions, ...data.decision.limitations]) {
    limits.appendChild(makeTextElement('p', 'decision-row meta', text));
  }
}

function setMode(mode) {
  if (!VALID_MODES.has(mode)) return;

  document.querySelectorAll('[role="tab"]').forEach((button) => {
    const active = button.dataset.mode === mode;
    button.classList.toggle('active', active);
    button.setAttribute('aria-selected', String(active));
    button.tabIndex = active ? 0 : -1;
  });

  document.querySelectorAll('.mode-panel').forEach((panel) => {
    panel.hidden = panel.id !== 'panel-' + mode.toLowerCase();
  });
}

function selectElement(id) {
  if (!data) return;
  const item = data.elements.find((candidate) => candidate.id === id);
  if (!item) return;

  document.querySelectorAll('.evidence-object').forEach((button) => {
    button.setAttribute('aria-pressed', String(button.dataset.id === id));
  });

  byId('inspectorTitle').textContent = item.label;
  byId('itemStatus').textContent = item.status;
  byId('itemWhy').textContent = item.why;
  byId('itemRoots').textContent = listText(item.roots);
  byId('itemDependencies').textContent = listText(item.dependencies);
  byId('itemContradictions').textContent = listText(item.contradictions);
  byId('itemAlternatives').textContent = listText(item.alternatives);
  byId('itemMissing').textContent = listText(item.missing_evidence);
  byId('itemChange').textContent = item.change_condition;
  byId('itemDetails').hidden = false;
}

function applyEvidenceLens() {
  const strength = Number(byId('evidenceLens').value) / 100;
  const label = strength <= 0.2 ? 'Reality-led view' :
    (strength >= 0.8 ? 'Evidence-led view' : 'Balanced view');
  byId('lensValue').textContent = label;

  const update = (selector, opacity, hideAtEvidence) => {
    document.querySelectorAll(selector).forEach((element) => {
      const hiddenByLens = hideAtEvidence && strength === 1;
      element.style.opacity = hiddenByLens ? '0' : String(opacity);
      element.style.visibility = hiddenByLens ? 'hidden' : 'visible';
      element.style.pointerEvents = hiddenByLens ? 'none' : 'auto';
      element.setAttribute('aria-hidden', String(hiddenByLens));
    });
  };

  update('#scene .inferred', 1 - strength * 0.45, false);
  update('#scene .possible', 1 - strength * 0.75, true);
  update('#scene .unknown', Math.max(0.12, 1 - strength), true);
}

function returnToOverview() {
  byId('workspace').hidden = true;
  byId('hero').hidden = false;
  byId('openSample').focus();
}

byId('queryForm').addEventListener('submit', async (event) => {
  event.preventDefault();
  byId('loadError').hidden = true;
  byId('loadStatus').hidden = false;
  byId('loadStatus').textContent = 'Loading the fixed illustrative sample…';

  const button = byId('openSample');
  button.disabled = true;
  button.setAttribute('aria-busy', 'true');
  const originalLabel = button.textContent;
  button.textContent = 'Loading sample…';

  const ok = data ? true : await loadData();

  button.disabled = false;
  button.removeAttribute('aria-busy');
  button.textContent = originalLabel;
  byId('loadStatus').hidden = true;

  if (!ok) {
    byId('loadError').focus();
    return;
  }

  byId('hero').hidden = true;
  byId('workspace').hidden = false;
  setMode('RECONSTRUCT');
  byId('investigationTitle').focus();
});

byId('backToOverview').addEventListener('click', returnToOverview);
byId('homeLink').addEventListener('click', (event) => {
  event.preventDefault();
  if (!byId('workspace').hidden) returnToOverview();
  else byId('openSample').focus();
});

document.querySelectorAll('[role="tab"]').forEach((button) => {
  button.addEventListener('click', () => setMode(button.dataset.mode));
  button.addEventListener('keydown', (event) => {
    const tabs = [...document.querySelectorAll('[role="tab"]')];
    const index = tabs.indexOf(button);
    let next = null;
    if (event.key === 'ArrowRight') next = tabs[(index + 1) % tabs.length];
    if (event.key === 'ArrowLeft') next = tabs[(index - 1 + tabs.length) % tabs.length];
    if (event.key === 'Home') next = tabs[0];
    if (event.key === 'End') next = tabs[tabs.length - 1];
    if (next) {
      event.preventDefault();
      next.focus();
      setMode(next.dataset.mode);
    }
  });
});

byId('scene').addEventListener('click', (event) => {
  const button = event.target.closest('[data-id]');
  if (!button) return;
  selectElement(button.dataset.id);
});

byId('evidenceRegister').addEventListener('click', (event) => {
  const button = event.target.closest('[data-inspect-id]');
  if (!button) return;
  setMode('RECONSTRUCT');
  selectElement(button.dataset.inspectId);
  byId('inspectorTitle').focus();
});

byId('evidenceLens').addEventListener('input', applyEvidenceLens);
