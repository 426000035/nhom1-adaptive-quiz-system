/* ==========================================================================
   Adaptive Quiz System - Student Views & Events Module (js/student-view.js)
   ========================================================================== */

function initStudentModule() {
  bindStudentEvents();
  // Tự động render danh sách ngay khi khởi tạo module
  filterAndRenderQuizzes();
}

function bindStudentEvents() {
  // Lọc & Phân trang Danh sách Catalog
  bindListEvents(['input-search-quiz', 'filter-topic', 'filter-difficulty', 'sort-quiz-catalog', 'pagesize-quiz-catalog'], 'catalog', filterAndRenderQuizzes);

  // Sự kiện chọn bài thi
  document.getElementById('quiz-grid-container')?.addEventListener('click', (e) => {
    const btn = e.target.closest('.btn-start-quiz');
    if (btn) startQuizExecution(btn.getAttribute('data-quiz-id'));
  });

  // Điều hướng câu hỏi
  document.getElementById('btn-prev-question')?.addEventListener('click', () => {
    if (window.AppState.currentQuestionIndex > 0) {
      window.AppState.currentQuestionIndex--;
      renderCurrentQuestion();
    }
  });

  document.getElementById('btn-next-question')?.addEventListener('click', () => {
    if (window.AppState.currentQuestionIndex < window.AppState.currentQuestions.length - 1) {
      window.AppState.currentQuestionIndex++;
      renderCurrentQuestion();
    }
  });

  document.getElementById('btn-submit-quiz')?.addEventListener('click', finishAndEvaluateQuiz);

  // AI Luyện tập câu sai
  document.getElementById('btn-trigger-ai')?.addEventListener('click', async () => {
    const wrongQs = window.AppState.quizResults?.wrongQuestions || [];
    if (wrongQs.length === 0) {
      if (typeof Swal !== 'undefined') Swal.fire({ icon: 'info', title: 'Tuyệt vời!', text: 'Bạn không làm sai câu nào.' });
      return;
    }

    document.getElementById('ai-loading-modal')?.classList.remove('hidden');
    const aiQuestions = await window.AIService.generateRemediationQuiz(wrongQs);
    document.getElementById('ai-loading-modal')?.classList.add('hidden');

    if (aiQuestions && aiQuestions.length > 0) {
      window.AppState.currentQuestions = aiQuestions;
      window.AppState.currentQuestionIndex = 0;
      window.AppState.answers = {};
      navigateTo('view-quiz');
      renderCurrentQuestion();
      window.QuizEngine.startTimer(aiQuestions.length * 60, (timeStr) => { 
        const timerEl = document.getElementById('countdown-timer');
        if (timerEl) timerEl.textContent = timeStr; 
      }, finishAndEvaluateQuiz);
    }
  });

  document.getElementById('btn-return-catalog')?.addEventListener('click', () => navigateTo('view-list'));
}

function filterAndRenderQuizzes() {
  const st = window.AppState?.listsState?.catalog || {};
  st.searchText = document.getElementById('input-search-quiz')?.value.trim().toLowerCase() || '';
  st.topic = document.getElementById('filter-topic')?.value || 'ALL';
  st.difficulty = document.getElementById('filter-difficulty')?.value || 'ALL';
  st.sort = document.getElementById('sort-quiz-catalog')?.value || 'DEFAULT';
  st.pageSize = document.getElementById('pagesize-quiz-catalog')?.value || '10';

  if (!window.AppState || !window.AppState.allQuizzes) return;

  let filtered = window.AppState.allQuizzes.filter(quiz => {
    const title = (quiz.title || '').toLowerCase();
    const topic = (quiz.topic || '').toLowerCase();
    
    const matchesSearch = !st.searchText || title.includes(st.searchText) || topic.includes(st.searchText);
    const matchesTopic = (st.topic === 'ALL') || (quiz.topic && quiz.topic.toLowerCase() === st.topic.toLowerCase());
    const matchesDiff = (st.difficulty === 'ALL') || (quiz.difficulty && quiz.difficulty.toLowerCase() === st.difficulty.toLowerCase());

    return matchesSearch && matchesTopic && matchesDiff;
  });

  if (st.sort === 'TITLE_ASC') filtered.sort((a, b) => a.title.localeCompare(b.title));
  else if (st.sort === 'TITLE_DESC') filtered.sort((a, b) => b.title.localeCompare(a.title));

  const totalItems = filtered.length;
  let pagedData = filtered;
  let totalPages = 1;

  if (st.pageSize !== 'ALL') {
    const sz = parseInt(st.pageSize) || 10;
    totalPages = Math.ceil(totalItems / sz) || 1;
    st.currentPage = Math.min(Math.max(1, st.currentPage || 1), totalPages);
    const start = (st.currentPage - 1) * sz;
    pagedData = filtered.slice(start, start + sz);
  }

  renderQuizCatalog(pagedData, totalItems);
  renderPaginationUI('pagination-quiz-catalog', totalPages, st.currentPage || 1, (newPage) => {
    st.currentPage = newPage;
    filterAndRenderQuizzes();
  });
}

function renderQuizCatalog(quizzes, totalCount) {
  const container = document.getElementById('quiz-grid-container');
  const countBadge = document.getElementById('quiz-count-badge');
  if (!container) return;
  container.innerHTML = '';
  
  if (countBadge) countBadge.textContent = `${totalCount || 0} đề thi`;

  if (!quizzes || quizzes.length === 0) {
    container.innerHTML = `
      <div style="grid-column: 1/-1; text-align: center; padding: 3rem 1rem; color: var(--text-muted);">
        <i data-lucide="search-x" style="width: 3rem; height: 3rem; margin-bottom: 1rem; opacity: 0.5;"></i>
        <p style="font-size: 1.1rem; font-weight: 500;">Không tìm thấy bài kiểm tra nào phù hợp!</p>
      </div>
    `;
    if (typeof lucide !== 'undefined') lucide.createIcons();
    return;
  }

  quizzes.forEach(quiz => {
    const card = document.createElement('div');
    card.className = 'quiz-card';
    card.innerHTML = `
      <div>
        <div class="quiz-card-header">
          <span class="tag tag-topic">${quiz.topic || 'Chung'}</span>
          <span class="badge badge-student">${quiz.difficulty || 'Easy'}</span>
        </div>
        <h4 class="quiz-card-title">${quiz.title}</h4>
        <div class="quiz-card-meta">
          <span><i data-lucide="help-circle"></i> ${quiz.questions ? quiz.questions.length : 0} câu</span>
          <span><i data-lucide="clock"></i> ${quiz.timeLimit || 10} phút</span>
        </div>
      </div>
      <button class="btn btn-primary btn-block btn-start-quiz" data-quiz-id="${quiz.id}">
        Bắt Đầu Làm Bài
      </button>
    `;
    container.appendChild(card);
  });

  if (typeof lucide !== 'undefined') lucide.createIcons();
}

// Hàm hiển thị Modal chọn Chế độ Thi trước khi bắt đầu
function startQuizExecution(quizId) {
  const quiz = window.AppState.allQuizzes.find(q => q.id === quizId);
  if (!quiz) return;

  // Sử dụng SweetAlert2 để tạo Modal chọn chế độ mượt mà
  if (typeof Swal !== 'undefined') {
    Swal.fire({
      title: '🎯 Chọn Chế Độ Làm Bài',
      html: `
        <p style="color: var(--text-muted); margin-bottom: 1.5rem;">
          Bạn muốn thực hiện bài thi <strong>"${quiz.title}"</strong> theo chế độ nào?
        </p>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; text-align: left;">
          <div id="select-mode-practice" style="border: 2px solid var(--border-color); padding: 1rem; border-radius: 8px; cursor: pointer; transition: all 0.2s;" onmouseover="this.style.borderColor='var(--primary)'" onmouseout="this.style.borderColor='var(--border-color)'">
            <h4 style="color: var(--primary); margin-bottom: 0.5rem;">📖 Ôn Luyện</h4>
            <p style="font-size: 0.85rem; color: var(--text-muted); margin: 0;">
              Hiện đáp án & giải thích ngay sau mỗi câu. Không giới hạn thời gian gắt gao.
            </p>
          </div>
          <div id="select-mode-exam" style="border: 2px solid var(--border-color); padding: 1rem; border-radius: 8px; cursor: pointer; transition: all 0.2s;" onmouseover="this.style.borderColor='var(--warning)'" onmouseout="this.style.borderColor='var(--border-color)'">
            <h4 style="color: var(--warning); margin-bottom: 0.5rem;">⏱️ Thử Thách</h4>
            <p style="font-size: 0.85rem; color: var(--text-muted); margin: 0;">
              Tính giờ nghiêm ngặt (${quiz.timeLimit || 10} phút). Xem điểm & lời giải sau khi Nộp bài.
            </p>
          </div>
        </div>
      `,
      showConfirmButton: false,
      showCloseButton: true,
      didOpen: () => {
        document.getElementById('select-mode-practice').onclick = () => {
          Swal.close();
          initQuizWithMode(quiz, 'PRACTICE');
        };
        document.getElementById('select-mode-exam').onclick = () => {
          Swal.close();
          initQuizWithMode(quiz, 'EXAM');
        };
      }
    });
  } else {
    // Fallback nếu không có SweetAlert2
    initQuizWithMode(quiz, 'EXAM');
  }
}

// Khởi tạo bài thi với chế độ đã chọn
function initQuizWithMode(quiz, mode) {
  window.AppState.currentQuiz = quiz;
  window.AppState.currentQuestions = quiz.questions || [];
  window.AppState.currentQuestionIndex = 0;
  window.AppState.answers = {};
  window.AppState.quizMode = mode; // Lưu chế độ làm bài hiện tại

  const titleEl = document.getElementById('current-quiz-title');
  if (titleEl) {
    const modeBadge = mode === 'PRACTICE' ? ' [Chế độ Ôn luyện]' : ' [Chế độ Thử thách]';
    titleEl.textContent = quiz.title + modeBadge;
  }
  
  if (typeof navigateTo === 'function') navigateTo('view-quiz');
  renderCurrentQuestion();

  // Ở chế độ EXAM mới bật đồng hồ đếm ngược
  if (mode === 'EXAM') {
    const timeLimitMinutes = parseInt(quiz.timeLimit) || 10;
    const totalSeconds = timeLimitMinutes * 60;

    if (window.QuizEngine && typeof window.QuizEngine.startTimer === 'function') {
      window.QuizEngine.startTimer(
        totalSeconds,
        (timeStr) => { 
          const timerEl = document.getElementById('countdown-timer');
          if (timerEl) timerEl.textContent = timeStr; 
        },
        finishAndEvaluateQuiz
      );
    }
  } else {
    // Chế độ PRACTICE: Hiển thị "Vô thời hạn"
    const timerEl = document.getElementById('countdown-timer');
    if (timerEl) timerEl.textContent = "∞ Ôn tập";
  }
}

function renderCurrentQuestion() {
  const qList = window.AppState.currentQuestions || [];
  const idx = window.AppState.currentQuestionIndex || 0;
  const q = qList[idx];

  if (!q) return;

  const tracker = document.getElementById('question-tracker');
  if (tracker) tracker.textContent = `Câu ${idx + 1} / ${qList.length}`;
  
  const progressBar = document.getElementById('quiz-progress-bar');
  if (progressBar) progressBar.style.width = `${Math.round(((idx + 1) / qList.length) * 100)}%`;

  const topicTag = document.getElementById('question-topic-tag');
  if (topicTag) topicTag.textContent = q.topic || 'Chung';

  const typeTag = document.getElementById('question-type-tag');
  if (typeTag) typeTag.textContent = q.type === 'single' ? 'Radio (Chọn 1)' : 'Checkbox (Chọn nhiều)';

  const qText = document.getElementById('question-text');
  if (qText) qText.textContent = q.question || '';

  const container = document.getElementById('options-container');
  if (!container) return;
  container.innerHTML = '';
  
  const currentSavedAnswers = (window.AppState.answers && window.AppState.answers[q.id]) || [];

  (q.options || []).forEach((optText, optIdx) => {
    const item = document.createElement('label');
    item.className = 'option-item';
    const isChecked = currentSavedAnswers.includes(optIdx);
    if (isChecked) item.classList.add('selected');

    const inputType = q.type === 'single' ? 'radio' : 'checkbox';
    item.innerHTML = `
      <input type="${inputType}" name="q_options" value="${optIdx}" ${isChecked ? 'checked' : ''}>
      <span>${optText}</span>
    `;

    item.addEventListener('change', () => {
      const inputs = container.querySelectorAll('input:checked');
      const selectedIndices = Array.from(inputs).map(inp => parseInt(inp.value));
      if (window.QuizEngine && typeof window.QuizEngine.recordAnswer === 'function') {
        window.QuizEngine.recordAnswer(q.id, selectedIndices);
      }
      
      container.querySelectorAll('.option-item').forEach(el => el.classList.remove('selected'));
      container.querySelectorAll('input:checked').forEach(inp => inp.closest('.option-item')?.classList.add('selected'));
    });

    container.appendChild(item);
  });

  const btnPrev = document.getElementById('btn-prev-question');
  if (btnPrev) btnPrev.disabled = (idx === 0);

  const btnNext = document.getElementById('btn-next-question');
  if (btnNext) btnNext.disabled = (idx === qList.length - 1);
}

function finishAndEvaluateQuiz() {
  if (window.QuizEngine && typeof window.QuizEngine.stopTimer === 'function') {
    window.QuizEngine.stopTimer();
  }

  const questions = window.AppState.currentQuestions || [];
  const answers = window.AppState.answers || {};

  const results = window.QuizEngine.evaluateQuiz(questions, answers);
  window.AppState.quizResults = results;

  const scoreNum = document.getElementById('result-score-number');
  if (scoreNum) scoreNum.textContent = results.score;

  const quizName = document.getElementById('result-quiz-name');
  if (quizName) quizName.textContent = `Chủ đề: ${window.AppState.currentQuiz?.title || 'Luyện tập AI'}`;

  if (window.QuizEngine && typeof window.QuizEngine.renderChart === 'function') {
    window.QuizEngine.renderChart('skills-chart', results.topicStats);
  }

  renderWrongQuestionsReview(results.wrongQuestions || []);

  try {
    const historyAll = JSON.parse(localStorage.getItem('quiz_history_all') || '[]');
    const currentUser = window.Auth ? window.Auth.getCurrentUser() : null;
    historyAll.unshift({
      timestamp: new Date().toLocaleString('vi-VN'),
      username: currentUser ? currentUser.fullName : 'Học viên',
      quizTitle: window.AppState.currentQuiz?.title || 'Luyện tập AI',
      score: results.score,
      correctCount: results.correctCount
    });
    localStorage.setItem('quiz_history_all', JSON.stringify(historyAll));
  } catch (e) {
    console.warn("Không thể lưu lịch sử làm bài:", e);
  }

  if (results.score >= 8.0 && typeof confetti === 'function') {
    confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
  }

  if (typeof navigateTo === 'function') navigateTo('view-result');
}

function renderWrongQuestionsReview(wrongQs) {
  const container = document.getElementById('wrong-questions-container');
  if (!container) return;
  container.innerHTML = '';

  if (!wrongQs || wrongQs.length === 0) {
    container.innerHTML = `
      <div class="question-card" style="border-left: 4px solid var(--success); text-align: center; padding: 1.5rem;">
        <h4 style="color: var(--success); font-size: 1.1rem; margin: 0;">
          🎉 Xin chúc mừng! Bạn đã trả lời chính xác 100% tất cả các câu hỏi trong bài thi.
        </h4>
      </div>
    `;
    return;
  }

  wrongQs.forEach((q, idx) => {
    const card = document.createElement('div');
    card.className = 'question-card';
    card.style.borderLeft = '4px solid var(--danger)';
    card.style.marginBottom = '1rem';

    const userAnsText = (q.userSelection && q.userSelection.length > 0)
      ? q.userSelection.map(i => q.options[i]).join(', ')
      : 'Chưa chọn đáp án';

    const correctAnsText = (q.correctAnswer || [])
      .map(i => q.options[i])
      .join(', ');

    card.innerHTML = `
      <h4 style="font-size: 1rem; font-weight: 600; color: var(--text-main); margin-bottom: 0.5rem;">
        Câu ${idx + 1}: ${q.question}
      </h4>
      <p style="color: var(--danger); font-size: 0.9rem; margin-top: 0.35rem;">
        <strong>❌ Lựa chọn của bạn:</strong> ${userAnsText}
      </p>
      <p style="color: var(--success); font-size: 0.9rem; margin-top: 0.25rem;">
        <strong>✅ Đáp án đúng:</strong> ${correctAnsText}
      </p>
      <div style="color: var(--text-muted); font-size: 0.875rem; margin-top: 0.65rem; background: rgba(0, 0, 0, 0.25); padding: 0.65rem 0.85rem; border-radius: 6px; border: 1px solid var(--border-color);">
        💡 <strong>Giải thích chi tiết:</strong> ${q.explanation || 'Không có giải thích.'}
      </div>
    `;

    container.appendChild(card);
  });
}