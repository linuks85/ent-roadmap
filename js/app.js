/* ═══════════════════════════════════════════
   app.js — Roadmap Index Page Logic
   ═══════════════════════════════════════════ */

const STORAGE_KEYS = {
  lang: 'ent-lang',
  progress: 'ent-progress'   // { topicId: { passed: bool, bestScore: number } }
};

let currentLang = 'ru';
let progressData = {};
let sectionsData = null;

// ── Storage ──
function loadFromStorage(key) {
  try { return JSON.parse(localStorage.getItem(key)); } catch { return null; }
}

function saveToStorage(key, val) {
  try { localStorage.setItem(key, JSON.stringify(val)); } catch(e) { console.warn('Storage error', e); }
}

// ── Init ──
async function init() {
  currentLang = loadFromStorage(STORAGE_KEYS.lang) || 'ru';
  progressData = loadFromStorage(STORAGE_KEYS.progress) || {};

  try {
    const res = await fetch('data/sections.json');
    sectionsData = await res.json();
  } catch(e) {
    console.error('Failed to load sections:', e);
    return;
  }

  setLang(currentLang);
}

function setLang(lang) {
  currentLang = lang;
  saveToStorage(STORAGE_KEYS.lang, lang);
  document.querySelectorAll('.lang-btn').forEach(b =>
    b.classList.toggle('active', b.dataset.lang === lang)
  );
  render();
}

window.setLang = setLang;

// ── Render ──
function render() {
  const d = sectionsData[currentLang];
  document.getElementById('mainTitle').textContent = d.siteTitle;
  document.getElementById('mainSub').textContent = d.siteSubtitle;
  document.getElementById('progressLabel').textContent = d.progressLabel;
  document.getElementById('resetBtn').textContent = d.resetBtn;

  const tree = document.getElementById('tree');
  const totalTopics = d.sections.reduce((s, sec) => s + sec.topics.length, 0);
  const totalDone = d.sections.reduce((s, sec) =>
    s + sec.topics.filter(t => progressData[t.id]?.passed).length, 0);
  const totalPct = totalTopics ? Math.round((totalDone / totalTopics) * 100) : 0;

  document.getElementById('progressPercent').textContent = `${totalPct}%`;
  document.getElementById('progressFill').style.width = `${totalPct}%`;

  const circ = 2 * Math.PI * 24;

  tree.innerHTML = d.sections.map((sec, si) => {
    const done = sec.topics.filter(t => progressData[t.id]?.passed).length;
    const pct = Math.round((done / sec.topics.length) * 100);
    const offset = circ - (circ * pct / 100);

    return `
      <div class="section" data-section="${sec.id}" style="animation-delay:${si * 0.06}s">
        <div class="section-header" onclick="toggleSection('${sec.id}')">
          <div class="section-num">${sec.icon || sec.id}</div>
          <div class="section-info">
            <div class="section-title">${sec.title}</div>
            <div class="section-count">${done}/${sec.topics.length} ${d.topicsDone}</div>
          </div>
          <div class="section-progress-mini">
            <svg viewBox="0 0 56 56">
              <circle class="track" cx="28" cy="28" r="24"/>
              <circle class="fill" cx="28" cy="28" r="24"
                stroke-dasharray="${circ}"
                stroke-dashoffset="${offset}"/>
            </svg>
            <div class="section-progress-text">${pct}%</div>
          </div>
          <svg class="chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 9l6 6 6-6"/></svg>
        </div>
        <div class="topics">
          <div class="topics-inner">
            ${sec.topics.map(t => {
              const tp = progressData[t.id];
              const passed = tp?.passed;
              const score = tp?.bestScore;
              let statusLabel = d.startLesson;
              let statusClass = '';
              if (passed) {
                statusLabel = `${d.testPassed} (${Math.round(score*100)}%)`;
                statusClass = 'completed';
              } else if (score !== undefined) {
                statusLabel = d.retakeTest;
                statusClass = 'attempted';
              }
              return `
                <a class="topic ${statusClass}" href="topic.html?id=${t.id}" data-topic="${t.id}">
                  <div class="checkbox">
                    <svg viewBox="0 0 14 14" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M2.5 7.5L5.5 10.5L11.5 3.5"/>
                    </svg>
                  </div>
                  <div class="topic-num">${t.id}</div>
                  <div class="topic-info">
                    <div class="topic-text">${t.title}</div>
                    <div class="topic-status">${statusLabel}</div>
                  </div>
                </a>`;
            }).join('')}
          </div>
        </div>
      </div>`;
  }).join('');
}

window.toggleSection = function(id) {
  document.querySelector(`.section[data-section="${id}"]`).classList.toggle('open');
};

window.resetProgress = function() {
  if (confirm(currentLang === 'ru'
    ? 'Вы уверены? Весь прогресс будет сброшен.'
    : 'Сенімдісіз бе? Барлық прогресс тазаланады.')) {
    progressData = {};
    saveToStorage(STORAGE_KEYS.progress, {});
    render();
  }
};

document.addEventListener('DOMContentLoaded', init);
