/* ═══════════════════════════════════════════
   quiz.js — Quiz Engine
   Loads questions from JSON, randomizes,
   enforces passing score, saves progress
   ═══════════════════════════════════════════ */

class QuizEngine {
  constructor(container, quizData, lang, onComplete) {
    this.container = container;
    this.lang = lang;
    this.onComplete = onComplete;

    const ld = quizData[lang];
    this.title = ld.quizTitle;
    this.passMessage = ld.passMessage;
    this.failMessage = ld.failMessage;
    this.passingScore = quizData.passingScore;
    this.questionsPerTest = quizData.questionsPerTest;

    // Shuffle and pick N questions
    const shuffled = [...ld.questions].sort(() => Math.random() - 0.5);
    this.questions = shuffled.slice(0, this.questionsPerTest);

    this.currentIndex = 0;
    this.score = 0;
    this.answered = false;

    this.render();
  }

  render() {
    this.container.innerHTML = '';
    this.container.className = 'quiz-container';

    // Header
    const header = document.createElement('div');
    header.className = 'quiz-header';
    header.innerHTML = `
      <div class="quiz-title">${this.title}</div>
      <div class="quiz-progress-text">
        ${this.currentIndex + 1} / ${this.questions.length}
      </div>
    `;
    this.container.appendChild(header);

    // Progress bar
    const pbar = document.createElement('div');
    pbar.className = 'quiz-progress-bar';
    const pct = ((this.currentIndex) / this.questions.length) * 100;
    pbar.innerHTML = `<div class="quiz-progress-fill" style="width:${pct}%"></div>`;
    this.container.appendChild(pbar);

    // Body
    const body = document.createElement('div');
    body.className = 'quiz-body';

    const q = this.questions[this.currentIndex];

    body.innerHTML = `
      <div class="quiz-question">
        <span class="quiz-question-num">${this.lang === 'ru' ? 'Вопрос' : 'Сұрақ'} ${this.currentIndex + 1}</span>
        ${q.question}
      </div>
      <div class="quiz-options">
        ${q.options.map((opt, i) => `
          <button class="quiz-option" data-index="${i}">
            <span class="quiz-option-marker">${String.fromCharCode(65 + i)}</span>
            <span>${opt}</span>
          </button>
        `).join('')}
      </div>
      <div class="quiz-explanation-slot"></div>
      <div class="quiz-action-slot"></div>
    `;

    this.container.appendChild(body);
    this.answered = false;

    // Bind option clicks
    body.querySelectorAll('.quiz-option').forEach(btn => {
      btn.addEventListener('click', () => this.handleAnswer(btn, q));
    });
  }

  handleAnswer(btn, q) {
    if (this.answered) return;
    this.answered = true;

    const chosen = parseInt(btn.dataset.index);
    const isCorrect = chosen === q.correct;

    if (isCorrect) this.score++;

    // Disable all options
    const options = this.container.querySelectorAll('.quiz-option');
    options.forEach((opt, i) => {
      opt.disabled = true;
      if (i === q.correct) opt.classList.add('correct');
      if (i === chosen && !isCorrect) opt.classList.add('wrong');
    });

    btn.classList.add('selected');

    // Show explanation
    const slot = this.container.querySelector('.quiz-explanation-slot');
    slot.innerHTML = `<div class="quiz-explanation">${q.explanation}</div>`;

    // Show next button
    const actionSlot = this.container.querySelector('.quiz-action-slot');
    const isLast = this.currentIndex >= this.questions.length - 1;
    const nextLabel = isLast
      ? (this.lang === 'ru' ? 'Показать результат' : 'Нәтижені көрсету')
      : (this.lang === 'ru' ? 'Следующий вопрос →' : 'Келесі сұрақ →');

    actionSlot.innerHTML = `<button class="quiz-next-btn">${nextLabel}</button>`;
    actionSlot.querySelector('.quiz-next-btn').addEventListener('click', () => {
      if (isLast) {
        this.showResult();
      } else {
        this.currentIndex++;
        this.render();
      }
    });
  }

  showResult() {
    const pct = this.score / this.questions.length;
    const passed = pct >= this.passingScore;

    this.container.innerHTML = `
      <div class="quiz-header">
        <div class="quiz-title">${this.title}</div>
      </div>
      <div class="quiz-progress-bar">
        <div class="quiz-progress-fill" style="width:100%"></div>
      </div>
      <div class="quiz-result">
        <div class="quiz-result-icon">${passed ? '🎉' : '📚'}</div>
        <div class="quiz-result-score ${passed ? 'passed' : 'failed'}">
          ${this.score} / ${this.questions.length}
        </div>
        <div class="quiz-result-message">
          ${passed ? this.passMessage : this.failMessage}
        </div>
        <div style="display:flex;gap:12px;justify-content:center;flex-wrap:wrap">
          ${!passed ? `<button class="quiz-retry-btn" id="quizRetry">
            ${this.lang === 'ru' ? '🔄 Повторить тест' : '🔄 Тестті қайталау'}
          </button>` : ''}
          <a href="index.html" class="quiz-retry-btn" style="text-decoration:none">
            ${this.lang === 'ru' ? '← Вернуться к Roadmap' : '← Roadmap-қа оралу'}
          </a>
        </div>
      </div>
    `;

    // Callback
    if (this.onComplete) {
      this.onComplete({ score: this.score, total: this.questions.length, passed, pct });
    }

    // Retry handler
    const retryBtn = this.container.querySelector('#quizRetry');
    if (retryBtn) {
      retryBtn.addEventListener('click', () => {
        // Re-shuffle
        this.currentIndex = 0;
        this.score = 0;
        const ld = this._rawData ? this._rawData[this.lang] : null;
        // Just reinit
        location.reload();
      });
    }
  }
}

window.QuizEngine = QuizEngine;
