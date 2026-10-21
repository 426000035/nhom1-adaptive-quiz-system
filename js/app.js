/* ==========================================================================
   Adaptive Quiz System - SPA Router & App Central Manager (js/app.js)
   ========================================================================== */

// 1. Khai báo Trạng thái Tập trung Toàn cục (Centralized State)
window.AppState = {
  currentUser: null,
  allQuizzes: [],
  allQuestions: [],
  currentQuiz: null,
  currentQuestions: [],
  currentQuestionIndex: 0,
  answers: {},
  timerInterval: null,
  timeRemaining: 0,
  quizResults: null,
  aiQuestions: null
};

// 2. Kích hoạt Ứng dụng khi DOM sẵn sàng
document.addEventListener('DOMContentLoaded', async () => {
  // Khởi tạo Auth
  await window.Auth.init();
  
  // Tải Ngân hàng Câu hỏi
  await loadQuestionsData();

  // Kiểm tra Session người dùng
  const user = window.Auth.getCurrentUser();
  updateNavUI(user);

  if (user) {
    navigateTo('view-list');
  } else {
    navigateTo('view-auth');
  }

  // Khởi tạo các sự kiện Tương tác (Event Listeners)
  bindEvents();
});

/**
 * Tải dữ liệu câu hỏi từ data/questions.json
 */
async function loadQuestionsData() {
  try {
    const response = await fetch('data/questions.json');
    if (response.ok) {
      window.AppState.allQuestions = await response.json();
      groupQuestionsIntoQuizzes();
    }
  } catch (err) {
    console.error("Lỗi khi tải data/questions.json:", err);
  }
}

/**
 * Gom nhóm các câu hỏi theo Chủ đề & Độ khó để tạo Danh sách Bài thi
 */
function groupQuestionsIntoQuizzes() {
  const groups = {};
  window.AppState.allQuestions.forEach(q => {
    const key = `${q.topic}_${q.difficulty}`;
    if (!groups[key]) {
      groups[key] = {
        id: `quiz_${key.toLowerCase()}`,
        title: `Bài kiểm tra ${q.topic} (${q.difficulty})`,
        topic: q.topic,
        difficulty: q.difficulty,
        timeLimit: 10, // 10 phút mặc định
        questions: []
      };
    }
    groups[key].questions.push(q);
  });

  window.AppState.allQuizzes = Object.values(groups);
  renderQuizCatalog(window.AppState.allQuizzes);
}

/**
 * SPA View Router - Điều hướng hiển thị giữa các View Section
 */
function navigateTo(viewId) {
  document.querySelectorAll('.view-section').forEach(sec => {
    sec.classList.add('hidden');
  });

  const targetView = document.getElementById(viewId);
  if (targetView) {
    targetView.classList.remove('hidden');
  }
}

/**
 * Cập nhật thanh Navigation Bar theo trạng thái Đăng nhập
 */
function updateNavUI(user) {
  const navGuest = document.getElementById('nav-guest');
  const navUser = document.getElementById('nav-user');
  const userFullname = document.getElementById('user-fullname');

  if (user) {
    navGuest.classList.add('hidden');
    navUser.classList.remove('hidden');
    userFullname.textContent = user.fullName;
  } else {
    navGuest.classList.remove('hidden');
    navUser.classList.add('hidden');
  }
}

/**
 * Render Danh sách Thẻ Đề thi ở Trang 1
 */
function renderQuizCatalog(quizzes) {
  const container = document.getElementById('quiz-grid-container');
  const countBadge = document.getElementById('quiz-count-badge');
  
  if (!container) return;
  container.innerHTML = '';
  countBadge.textContent = `${quizzes.length} đề thi`;

  if (quizzes.length === 0) {
    container.innerHTML = `<p style="color: var(--text-muted); grid-column: 1/-1;">Không tìm thấy bài kiểm tra phù hợp.</p>`;
    return;
  }

  quizzes.forEach(quiz => {
    const card = document.createElement('div');
    card.className = 'quiz-card';
    card.innerHTML = `
      <div>
        <div class="quiz-card-header">
          <span class="tag tag-topic">${quiz.topic}</span>
          <span class="badge badge-student">${quiz.difficulty}</span>
        </div>
        <h4 class="quiz-card-title">${quiz.title}</h4>
        <div class="quiz-card-meta">
          <span><i data-lucide="help-circle"></i> ${quiz.questions.length} câu</span>
          <span><i data-lucide="clock"></i> ${quiz.timeLimit} phút</span>
        </div>
      </div>
      <button class="btn btn-primary btn-block btn-start-quiz" data-quiz-id="${quiz.id}">
        Bắt Đầu Làm Bài
      </button>
    `;
    container.appendChild(card);
  });

  lucide.createIcons();
}

/**
 * Gắn Sự Kiện (Event Binding)
 */
function bindEvents() {
  // Chuyển form Đăng nhập / Đăng ký
  document.getElementById('link-to-register')?.addEventListener('click', (e) => {
    e.preventDefault();
    document.getElementById('form-login-box').classList.add('hidden');
    document.getElementById('form-register-box').classList.remove('hidden');
  });

  document.getElementById('link-to-login')?.addEventListener('click', (e) => {
    e.preventDefault();
    document.getElementById('form-register-box').classList.add('hidden');
    document.getElementById('form-login-box').classList.remove('hidden');
  });

  // Submit Form Đăng Nhập
  document.getElementById('form-login')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const u = document.getElementById('login-username').value;
    const p = document.getElementById('login-password').value;
    const user = window.Auth.login(u, p);

    if (user) {
      updateNavUI(user);
      navigateTo('view-list');
      Swal.fire({ icon: 'success', title: 'Đăng nhập thành công!', timer: 1200, showConfirmButton: false });
    } else {
      Swal.fire({ icon: 'error', title: 'Thất bại', text: 'Sai tên đăng nhập hoặc mật khẩu!' });
    }
  });

  // Submit Form Đăng Ký
  document.getElementById('form-register')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const fn = document.getElementById('reg-fullname').value;
    const u = document.getElementById('reg-username').value;
    const p = document.getElementById('reg-password').value;
    
    const res = window.Auth.register(fn, u, p);
    if (res.success) {
      Swal.fire({ icon: 'success', title: 'Thành công', text: res.message });
      document.getElementById('form-register-box').classList.add('hidden');
      document.getElementById('form-login-box').classList.remove('hidden');
    } else {
      Swal.fire({ icon: 'error', title: 'Lỗi', text: res.message });
    }
  });

  // Đăng Xuất
  document.getElementById('btn-logout')?.addEventListener('click', () => {
    window.Auth.logout();
    updateNavUI(null);
    navigateTo('view-auth');
  });

  // Event Delegation Bắt đầu Làm bài
  document.getElementById('quiz-grid-container')?.addEventListener('click', (e) => {
    if (e.target.classList.contains('btn-start-quiz')) {
      const qId = e.target.getAttribute('data-quiz-id');
      startQuizExecution(qId);
    }
  });

  // Chuyển câu hỏi Trước / Sau
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

  // Nộp Bài
  document.getElementById('btn-submit-quiz')?.addEventListener('click', () => {
    Swal.fire({
      title: 'Xác nhận nộp bài?',
      text: 'Bạn có chắc chắn muốn nộp bài làm ngay bây giờ?',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Nộp bài',
      cancelButtonText: 'Làm tiếp',
      confirmColor: '#10b981'
    }).then((res) => {
      if (res.isConfirmed) {
        finishAndEvaluateQuiz();
      }
    });
  });

  // Kích hoạt Gemini AI Luyện tập câu sai
  document.getElementById('btn-trigger-ai')?.addEventListener('click', async () => {
    const wrongQs = window.AppState.quizResults?.wrongQuestions || [];
    if (wrongQs.length === 0) {
      Swal.fire({ icon: 'info', title: 'Tuyệt vời!', text: 'Bạn không làm sai câu nào nên không cần ôn tập lại.' });
      return;
    }

    document.getElementById('ai-loading-modal').classList.remove('hidden');
    const aiQuestions = await window.AIService.generateRemediationQuiz(wrongQs);
    document.getElementById('ai-loading-modal').classList.add('hidden');

    if (aiQuestions && aiQuestions.length > 0) {
      window.AppState.currentQuestions = aiQuestions;
      window.AppState.currentQuestionIndex = 0;
      window.AppState.answers = {};
      
      navigateTo('view-quiz');
      renderCurrentQuestion();
      window.QuizEngine.startTimer(
        aiQuestions.length * 60,
        (timeStr) => { document.getElementById('countdown-timer').textContent = timeStr; },
        () => { finishAndEvaluateQuiz(); }
      );
    }
  });

  // Quay lại Danh sách Đề thi
  document.getElementById('btn-return-catalog')?.addEventListener('click', () => {
    navigateTo('view-list');
  });
}

/**
 * Bắt đầu Bài Thi
 */
function startQuizExecution(quizId) {
  const quiz = window.AppState.allQuizzes.find(q => q.id === quizId);
  if (!quiz) return;

  window.AppState.currentQuiz = quiz;
  window.AppState.currentQuestions = quiz.questions;
  window.AppState.currentQuestionIndex = 0;
  window.AppState.answers = {};

  document.getElementById('current-quiz-title').textContent = quiz.title;
  navigateTo('view-quiz');
  renderCurrentQuestion();

  // Bật đồng hồ đếm ngược
  window.QuizEngine.startTimer(
    quiz.timeLimit * 60,
    (timeStr) => { document.getElementById('countdown-timer').textContent = timeStr; },
    () => { finishAndEvaluateQuiz(); }
  );
}

/**
 * Render Câu hỏi Hiện tại
 */
function renderCurrentQuestion() {
  const qList = window.AppState.currentQuestions;
  const idx = window.AppState.currentQuestionIndex;
  const q = qList[idx];

  if (!q) return;

  // Cập nhật Tracker & Progress Bar
  document.getElementById('question-tracker').textContent = `Câu ${idx + 1} / ${qList.length}`;
  const progressPercent = Math.round(((idx + 1) / qList.length) * 100);
  document.getElementById('quiz-progress-bar').style.width = `${progressPercent}%`;

  // Cập nhật Thẻ thông tin
  document.getElementById('question-topic-tag').textContent = q.topic;
  document.getElementById('question-type-tag').textContent = q.type === 'single' ? 'Radio (Chọn 1)' : 'Checkbox (Chọn nhiều)';
  document.getElementById('question-text').textContent = q.question;

  // Render Options
  const container = document.getElementById('options-container');
  container.innerHTML = '';
  const currentSavedAnswers = window.AppState.answers[q.id] || [];

  q.options.forEach((optText, optIdx) => {
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
      // Cập nhật đáp án được chọn
      const inputs = container.querySelectorAll('input:checked');
      const selectedIndices = Array.from(inputs).map(inp => parseInt(inp.value));
      window.QuizEngine.recordAnswer(q.id, selectedIndices);
      
      // Update styling
      container.querySelectorAll('.option-item').forEach(el => el.classList.remove('selected'));
      container.querySelectorAll('input:checked').forEach(inp => inp.closest('.option-item').classList.add('selected'));
    });

    container.appendChild(item);
  });

  // Enable/Disable Prev/Next Buttons
  document.getElementById('btn-prev-question').disabled = (idx === 0);
  document.getElementById('btn-next-question').disabled = (idx === qList.length - 1);
}

/**
 * Hoàn thành và Chấm điểm
 */
function finishAndEvaluateQuiz() {
  window.QuizEngine.stopTimer();
  const results = window.QuizEngine.evaluateQuiz(window.AppState.currentQuestions, window.AppState.answers);

  // Hiển thị Điểm
  document.getElementById('result-score-number').textContent = results.score;
  document.getElementById('result-quiz-name').textContent = `Chủ đề: ${window.AppState.currentQuiz?.title || 'Luyện tập AI'}`;

  // Vẽ Biểu đồ
  window.QuizEngine.renderChart('skills-chart', results.topicStats);

  // Render Danh sách Câu sai
  renderWrongQuestionsReview(results.wrongQuestions);

  // Hiệu ứng ăn mừng nếu điểm >= 8.0
  if (results.score >= 8.0) {
    confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
  }

  navigateTo('view-result');
}

/**
 * Render Danh sách Xem lại Câu sai ở Trang Kết quả
 * @param {Array} wrongQs - Danh sách các câu hỏi làm sai
 */
function renderWrongQuestionsReview(wrongQs) {
  // Lấy thẻ container chứa danh sách câu sai
  const container = document.getElementById('wrong-questions-container');
  if (!container) return;
  
  // Xóa sạch nội dung cũ
  container.innerHTML = '';

  // Nếu người dùng không làm sai câu nào (Đạt điểm tối đa 10/10)
  if (wrongQs.length === 0) {
    container.innerHTML = `
      <div class="question-card" style="border-left: 4px solid var(--success); text-align: center; padding: 1.5rem;">
        <h4 style="color: var(--success); font-size: 1.1rem; margin: 0;">
          🎉 Xin chúc mừng! Bạn đã trả lời chính xác 100% tất cả các câu hỏi trong bài thi.
        </h4>
      </div>
    `;
    return;
  }

  // Duyệt qua từng câu hỏi làm sai và render giao diện chi tiết
  wrongQs.forEach((q, idx) => {
    // Tạo thẻ div bao quanh từng thẻ câu hỏi
    const card = document.createElement('div');
    card.className = 'question-card';
    card.style.borderLeft = '4px solid var(--danger)';
    card.style.marginBottom = '1rem';

    // Chuyển đổi chỉ số đáp án chọn thành văn bản hiển thị
    const userAnsText = (q.userSelection && q.userSelection.length > 0)
      ? q.userSelection.map(i => q.options[i]).join(', ')
      : 'Chưa chọn đáp án';

    const correctAnsText = (q.correctAnswer || [])
      .map(i => q.options[i])
      .join(', ');

    // Ghi nội dung HTML chuẩn không chứa ký tự ẩn hay lỗi thẻ lồng
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
        💡 <strong>Giải thích chi tiết:</strong> ${q.explanation}
      </div>
    `;

    // Thêm thẻ card vào container
    container.appendChild(card);
  });
}
