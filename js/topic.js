/* ═══════════════════════════════════════════
   topic.js — Topic Page Logic
   Loads content + quiz from JSON,
   renders interactive learning elements
   ═══════════════════════════════════════════ */

const STORAGE_KEYS = {
  lang: 'ent-lang',
  progress: 'ent-progress'
};

function loadFromStorage(key) {
  try { return JSON.parse(localStorage.getItem(key)); } catch { return null; }
}
function saveToStorage(key, val) {
  try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) { }
}

let currentLang = 'ru';
let topicId = null;

async function init() {
  const params = new URLSearchParams(window.location.search);
  topicId = params.get('id');
  if (!topicId) { window.location.href = 'index.html'; return; }

  currentLang = loadFromStorage(STORAGE_KEYS.lang) || 'ru';
  document.querySelectorAll('.lang-btn').forEach(b =>
    b.classList.toggle('active', b.dataset.lang === currentLang)
  );

  await loadTopic();
}

window.setLang = function (lang) {
  currentLang = lang;
  saveToStorage(STORAGE_KEYS.lang, lang);
  document.querySelectorAll('.lang-btn').forEach(b =>
    b.classList.toggle('active', b.dataset.lang === lang)
  );
  loadTopic();
};

async function loadTopic() {
  try {
    // Determine base path — works both at root and in subdirectory (GitHub Pages)
    const basePath = getBasePath();

    const [contentRes, quizRes, sectionsRes] = await Promise.all([
      fetch(`${basePath}data/content/topic-${topicId}.json`),
      fetch(`${basePath}data/quizzes/quiz-${topicId}.json`),
      fetch(`${basePath}data/sections.json`)
    ]);

    if (!contentRes.ok) throw new Error(`Content not found: ${contentRes.status} — ${contentRes.url}`);
    if (!quizRes.ok) throw new Error(`Quiz not found: ${quizRes.status} — ${quizRes.url}`);
    if (!sectionsRes.ok) throw new Error(`Sections not found: ${sectionsRes.status} — ${sectionsRes.url}`);

    const content = await contentRes.json();
    const quiz = await quizRes.json();
    const sections = await sectionsRes.json();

    const ld = content[currentLang];
    const sd = sections[currentLang];

    // Find section for this topic
    let sectionTitle = '';
    let sectionId = '';
    for (const sec of sd.sections) {
      for (const t of sec.topics) {
        if (t.id === topicId) {
          sectionTitle = sec.title;
          sectionId = sec.id;
          break;
        }
      }
    }

    // Render header
    document.getElementById('topicBadge').textContent =
      `${currentLang === 'ru' ? 'Раздел' : 'Бөлім'} ${sectionId} · ${currentLang === 'ru' ? 'Тема' : 'Тақырып'} ${topicId}`;
    document.getElementById('topicTitle').textContent = ld.title;
    document.getElementById('topicSubtitle').textContent = sectionTitle;
    document.getElementById('backLabel').textContent =
      currentLang === 'ru' ? '← Roadmap' : '← Roadmap';

    // Render content
    const main = document.getElementById('lessonContent');
    main.innerHTML = '';

    ld.sections.forEach((section, si) => {
      const sEl = document.createElement('div');
      sEl.className = 'lesson-section';
      sEl.style.animationDelay = `${si * 0.1}s`;

      let html = `<h2>${section.title}</h2>`;

      section.content.forEach(block => {
        html += renderBlock(block);
      });

      sEl.innerHTML = html;
      main.appendChild(sEl);

      // Initialize interactive elements
      initAccordions(sEl);
      initSteps(sEl);
      initDiagrams(sEl);
    });

    // Quiz section
    const quizWrap = document.getElementById('quizSection');
    const quizStartLabel = currentLang === 'ru' ? 'Начать тест' : 'Тестті бастау';
    const quizIntro = currentLang === 'ru'
      ? `Проверь свои знания! 10 случайных вопросов, проходной балл — 80%.`
      : `Білімін тексер! 10 кездейсоқ сұрақ, өту балы — 80%.`;

    quizWrap.innerHTML = `
      <div class="quiz-container">
        <div class="quiz-body" style="text-align:center;padding:40px 24px">
          <div style="font-size:48px;margin-bottom:16px">📝</div>
          <div class="quiz-title" style="margin-bottom:8px">${quiz[currentLang].quizTitle}</div>
          <p style="color:var(--text-muted);font-size:14px;margin-bottom:24px">${quizIntro}</p>
          <button class="quiz-start-btn" id="startQuizBtn">${quizStartLabel}</button>
        </div>
      </div>
    `;

    document.getElementById('startQuizBtn').addEventListener('click', () => {
      new QuizEngine(quizWrap.querySelector('.quiz-container'), quiz, currentLang, (result) => {
        // Save progress
        const progress = loadFromStorage(STORAGE_KEYS.progress) || {};
        const existing = progress[topicId];
        if (!existing || result.pct > (existing.bestScore || 0)) {
          progress[topicId] = { passed: result.passed, bestScore: result.pct };
        } else if (result.passed) {
          progress[topicId].passed = true;
        }
        saveToStorage(STORAGE_KEYS.progress, progress);
      });
    });

  } catch (e) {
    console.error('Failed to load topic:', e);
    document.getElementById('lessonContent').innerHTML =
      `<div class="lesson-text" style="text-align:center;padding:40px">
        ${currentLang === 'ru' ? 'Контент этой темы ещё не готов. Скоро появится!' : 'Бұл тақырыптың мазмұны әлі дайын емес. Жақында қосылады!'}
      </div>`;
    document.getElementById('quizSection').innerHTML = '';
  }
}

// ── Block renderers ──
function renderBlock(block) {
  switch (block.type) {
    case 'text':
      return `<p class="lesson-text">${block.value}</p>`;

    case 'accordion':
      return `<div class="accordion">${block.items.map(item => `
        <div class="accordion-item">
          <button class="accordion-trigger">
            <span>${item.title}</span>
            <svg class="accordion-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 9l6 6 6-6"/></svg>
          </button>
          <div class="accordion-body">
            <div class="accordion-body-inner">
              <p>${item.content}</p>
              ${item.example ? `<div class="accordion-example">${item.example}</div>` : ''}
            </div>
          </div>
        </div>
      `).join('')}</div>`;

    case 'comparison_table':
      return `<div class="comp-table-wrap"><table class="comp-table">
        <caption>${block.title}</caption>
        <thead><tr>${block.headers.map(h => `<th>${h}</th>`).join('')}</tr></thead>
        <tbody>${block.rows.map(row => `<tr>${row.map(c => `<td>${c}</td>`).join('')}</tr>`).join('')}</tbody>
      </table></div>`;

    case 'interactive_steps':
      const stepsId = 'steps-' + Math.random().toString(36).substr(2, 6);
      return `<div class="steps-container" data-steps-id="${stepsId}">
        <div class="steps-title">${block.title}</div>
        <div class="steps-track">
          ${block.steps.map((s, i) => `
            <div class="step-item ${i === 0 ? 'active' : 'dimmed'}" data-step="${i}">
              <div class="step-indicator">
                <div class="step-icon">${s.icon}</div>
                <div class="step-line"></div>
              </div>
              <div class="step-content">
                <div class="step-label">${s.label}</div>
                <div class="step-desc">${s.description}</div>
              </div>
            </div>
          `).join('')}
        </div>
        <div class="steps-nav">
          <button class="step-nav-btn" data-dir="prev" disabled>←</button>
          <button class="step-nav-btn" data-dir="next">→</button>
        </div>
      </div>`;

    case 'cheatsheet':
      return `<div class="cheatsheet">
        <div class="cheatsheet-header">
          <div class="cheatsheet-title">${block.title}</div>
        </div>
        <div class="cheatsheet-body">
          ${block.items.map(item => `
            <div class="cheatsheet-item">
              <div class="cheatsheet-term">${item.term}</div>
              <div class="cheatsheet-def">${item.definition}</div>
            </div>
          `).join('')}
        </div>
      </div>`;

    case 'diagram':
      return `<div class="diagram-container">
        <div class="diagram-title">${block.title}</div>
        <div class="diagram-canvas" data-diagram='${JSON.stringify(block.data)}' data-type="${block.diagramType}"></div>
      </div>`;

    case 'interactive_3d_concept':
      return `<div class="concept-3d-box">
        <h4>${block.title}</h4>
        <p>${block.description}</p>
        <div class="concept-3d-visual" data-concept="coords"></div>
      </div>`;

    default:
      return '';
  }
}

// ── Interactive initializers ──
function initAccordions(root) {
  root.querySelectorAll('.accordion-trigger').forEach(trigger => {
    trigger.addEventListener('click', () => {
      const item = trigger.parentElement;
      const body = item.querySelector('.accordion-body');
      const isOpen = item.classList.contains('open');

      if (isOpen) {
        body.style.maxHeight = '0';
        item.classList.remove('open');
      } else {
        body.style.maxHeight = body.scrollHeight + 'px';
        item.classList.add('open');
      }
    });
  });
}

function initSteps(root) {
  root.querySelectorAll('.steps-container').forEach(container => {
    let current = 0;
    const items = container.querySelectorAll('.step-item');
    const total = items.length;
    const prevBtn = container.querySelector('[data-dir="prev"]');
    const nextBtn = container.querySelector('[data-dir="next"]');

    function updateSteps() {
      items.forEach((item, i) => {
        item.classList.toggle('active', i === current);
        item.classList.toggle('dimmed', i !== current);
      });
      prevBtn.disabled = current === 0;
      nextBtn.disabled = current === total - 1;
    }

    prevBtn.addEventListener('click', () => { if (current > 0) { current--; updateSteps(); } });
    nextBtn.addEventListener('click', () => { if (current < total - 1) { current++; updateSteps(); } });

    // Click on step
    items.forEach(item => {
      item.addEventListener('click', () => {
        current = parseInt(item.dataset.step);
        updateSteps();
      });
    });
  });
}

function initDiagrams(root) {
  root.querySelectorAll('.diagram-canvas').forEach(canvas => {
    const data = JSON.parse(canvas.dataset.diagram);
    const type = canvas.dataset.type;

    if (type === 'mindmap') {
      renderMindmap(canvas, data);
    }
  });
}

function renderMindmap(canvas, data) {
  const w = Math.min(canvas.offsetWidth, 700);
  const h = 400;
  const cx = w / 2, cy = h / 2;

  let svg = `<svg viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg" style="width:100%;max-width:${w}px">`;

  // Center node
  svg += `<circle cx="${cx}" cy="${cy}" r="50" fill="rgba(255,255,255,0.06)" stroke="rgba(255,255,255,0.15)" stroke-width="1.5"/>`;
  svg += `<text x="${cx}" y="${cy}" text-anchor="middle" dominant-baseline="middle" fill="#e8e8f0" font-family="Unbounded,sans-serif" font-size="11" font-weight="700">${data.center}</text>`;

  const branches = data.branches;
  const angleStep = (2 * Math.PI) / branches.length;
  const branchR = 140;
  const childR = 60;

  branches.forEach((branch, i) => {
    const angle = angleStep * i - Math.PI / 2;
    const bx = cx + Math.cos(angle) * branchR;
    const by = cy + Math.sin(angle) * branchR;

    // Line to branch
    svg += `<line x1="${cx}" y1="${cy}" x2="${bx}" y2="${by}" stroke="${branch.color}" stroke-width="2" opacity="0.3"/>`;

    // Branch circle
    svg += `<circle cx="${bx}" cy="${by}" r="32" fill="${branch.color}20" stroke="${branch.color}" stroke-width="1.5"/>`;
    svg += `<text x="${bx}" y="${by}" text-anchor="middle" dominant-baseline="middle" fill="${branch.color}" font-family="Unbounded,sans-serif" font-size="10" font-weight="600">${branch.label}</text>`;

    // Children
    if (branch.children) {
      const childAngleSpread = 0.6;
      const childAngleStart = angle - childAngleSpread / 2;
      const childAngleStep = branch.children.length > 1 ? childAngleSpread / (branch.children.length - 1) : 0;

      branch.children.forEach((child, ci) => {
        const ca = branch.children.length === 1 ? angle : childAngleStart + childAngleStep * ci;
        const ccx = bx + Math.cos(ca) * childR;
        const ccy = by + Math.sin(ca) * childR;

        svg += `<line x1="${bx}" y1="${by}" x2="${ccx}" y2="${ccy}" stroke="${branch.color}" stroke-width="1" opacity="0.2"/>`;
        svg += `<text x="${ccx}" y="${ccy}" text-anchor="middle" dominant-baseline="middle" fill="var(--text-muted)" font-family="Nunito,sans-serif" font-size="9">${child}</text>`;
      });
    }
  });

  svg += '</svg>';
  canvas.innerHTML = svg;
}

// Resolves base path for fetch — handles GitHub Pages subdirectory deployment
function getBasePath() {
  // topic.html sits at root, so we derive base from its location
  const path = window.location.pathname;
  const lastSlash = path.lastIndexOf('/');
  return path.substring(0, lastSlash + 1);
}

document.addEventListener('DOMContentLoaded', init);