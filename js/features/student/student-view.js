/* ==========================================================================
   Adaptive Quiz System - Student Views & Events Module (js/features/student/student-view.js)
   ========================================================================== */

const QUESTION_NAVIGATION_PAGE_SIZE = 30;

function initStudentModule() {
  bindStudentEvents();
  // Tự động render danh sách ngay khi khởi tạo module
  filterAndRenderQuizzes();

  // Khởi tạo và hiển thị Mascot Xô Nước Vui Vẻ
  if (window.MascotEngine && typeof window.MascotEngine.renderMascotUI === 'function') {
    window.MascotEngine.renderMascotUI();
  }
}

function bindStudentEvents() {

console.trace('bindStudentEvents called');
  
  bindStudentCatalogEvents();

  // Điều hướng câu hỏi
  document.getElementById('btn-prev-question')?.addEventListener('click', () => {
    if (window.AppState.currentQuestionIndex > 0) {
      window.AppState.currentQuestionIndex--;
      window.AppState.questionNavigationPage = Math.floor(
        window.AppState.currentQuestionIndex / QUESTION_NAVIGATION_PAGE_SIZE
      );
      renderCurrentQuestion(true);
    }
  });

  document.getElementById('btn-next-question')?.addEventListener('click', () => {
    if (window.AppState.currentQuestionIndex < window.AppState.currentQuestions.length - 1) {
      window.AppState.currentQuestionIndex++;
      window.AppState.questionNavigationPage = Math.floor(
        window.AppState.currentQuestionIndex / QUESTION_NAVIGATION_PAGE_SIZE
      );
      renderCurrentQuestion(true);
    }
  });

  document.addEventListener?.('keydown', (event) => {
    if (!['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
    if (document.getElementById('view-quiz')?.classList.contains('hidden')) return;
    if (event.target.closest('input:not([type="radio"]):not([type="checkbox"]), textarea, select, [contenteditable="true"]')) return;

    event.preventDefault();
    const direction = event.key === 'ArrowRight' ? 1 : -1;
    const targetIndex = window.AppState.currentQuestionIndex + direction;
    if (targetIndex < 0 || targetIndex >= window.AppState.currentQuestions.length) return;

    window.AppState.currentQuestionIndex = targetIndex;
    window.AppState.questionNavigationPage = Math.floor(
      targetIndex / QUESTION_NAVIGATION_PAGE_SIZE
    );
    renderCurrentQuestion(true);
  });

  document.getElementById('options-container')?.addEventListener('keydown', (event) => {
    const optionsContainer = event.currentTarget;
    const answerInputs = Array.from(optionsContainer.querySelectorAll('input:not(:disabled)'));
    const activeIndex = answerInputs.indexOf(event.target);
    if (activeIndex < 0) return;

    if (['ArrowUp', 'ArrowDown'].includes(event.key)) {
      event.preventDefault();
      const direction = event.key === 'ArrowDown' ? 1 : -1;
      const nextIndex = (activeIndex + direction + answerInputs.length) % answerInputs.length;
      answerInputs[nextIndex].focus();
      return;
    }

    if (event.key !== 'Enter' || event.repeat) return;
    event.preventDefault();
    const selectedOptionIndex = Number(answerInputs[activeIndex].value);
    answerInputs[activeIndex].click();

    const currentQuestion = window.AppState.currentQuestions[window.AppState.currentQuestionIndex];
    const savedAnswers = window.AppState.answers?.[currentQuestion?.id];
    if (!Array.isArray(savedAnswers) || savedAnswers.length === 0) {
      document.querySelector(
        `#options-container input[value="${selectedOptionIndex}"]:not(:disabled)`
      )?.focus();
      return;
    }

    if (window.AppState.currentQuestionIndex < window.AppState.currentQuestions.length - 1) {
      window.AppState.currentQuestionIndex++;
      window.AppState.questionNavigationPage = Math.floor(
        window.AppState.currentQuestionIndex / QUESTION_NAVIGATION_PAGE_SIZE
      );
      renderCurrentQuestion(true);
      document.querySelector('#options-container input:not(:disabled)')?.focus();
    } else {
      document.querySelector(
        `#options-container input[value="${selectedOptionIndex}"]:not(:disabled)`
      )?.focus();
    }
  });

  document.getElementById('question-navigation')?.addEventListener('click', (event) => {
    const button = event.target.closest('[data-question-index]');
    if (!button) return;

    const targetIndex = Number(button.dataset.questionIndex);
    const questionCount = window.AppState.currentQuestions?.length || 0;
    if (!Number.isInteger(targetIndex) || targetIndex < 0 || targetIndex >= questionCount ||
        targetIndex === window.AppState.currentQuestionIndex) return;

    window.AppState.currentQuestionIndex = targetIndex;
    window.AppState.questionNavigationPage = Math.floor(targetIndex / QUESTION_NAVIGATION_PAGE_SIZE);
    renderCurrentQuestion(true);
    document.querySelector(`#question-navigation [data-question-index="${targetIndex}"]`)?.focus();
  });

  document.getElementById('question-navigation-pagination')?.addEventListener('click', (event) => {
    const button = event.target.closest('[data-page-direction]');
    if (!button || button.disabled) return;

    const questionCount = window.AppState.currentQuestions?.length || 0;
    const pageCount = Math.ceil(questionCount / QUESTION_NAVIGATION_PAGE_SIZE);
    const currentPage = window.AppState.questionNavigationPage || 0;
    const direction = Number(button.dataset.pageDirection);
    const targetPage = currentPage + direction;
    if (!Number.isInteger(direction) || targetPage < 0 || targetPage >= pageCount) return;

    window.AppState.questionNavigationPage = targetPage;
    renderQuestionNavigation(
      window.AppState.currentQuestions,
      window.AppState.currentQuestionIndex,
      window.AppState.quizMode === 'PRACTICE'
    );
  });

  document.getElementById('btn-submit-quiz')?.addEventListener('click', confirmQuizSubmission);
  document.getElementById('btn-exit-quiz')?.addEventListener('click', async () => {
    if (typeof Swal === 'undefined' || typeof Swal.fire !== 'function') {
      console.error('Không thể xác nhận thoát bài vì hộp thoại chưa sẵn sàng.');
      return;
    }
    const confirmation = await Swal.fire({
      icon: 'warning',
      title: 'Thoát bài làm?',
      text: 'Câu trả lời chưa nộp sẽ không được lưu vào lịch sử.',
      showCancelButton: true,
      confirmButtonText: 'Thoát bài',
      cancelButtonText: 'Tiếp tục làm'
    });
    if (!confirmation.isConfirmed) return;
    window.QuizEngine?.stopTimer();
    window.MascotEngine?.emit('quizAbandoned');
    window.AppState.currentQuiz = null;
    window.AppState.currentQuestions = [];
    window.AppState.answers = {};
    window.AppState.practiceDraftAnswers = {};
    navigateTo('view-list');
    filterAndRenderQuizzes();
  });

  // AI Luyện tập câu sai
  document.getElementById('btn-trigger-ai')?.addEventListener('click', async () => {
    const wrongQs = window.AppState.quizResults?.wrongQuestions || [];
    if (wrongQs.length === 0) {
      if (typeof Swal !== 'undefined') Swal.fire({ icon: 'info', title: 'Tuyệt vời!', text: 'Bạn không làm sai câu nào.' });
      return;
    }

    const loadingModal = document.getElementById('ai-loading-modal');
    const loadingStatus = loadingModal?.querySelector('[role="status"]');
    if (loadingModal) {
      loadingModal.classList.remove('hidden');
      loadingModal.setAttribute('aria-hidden', 'false');
      loadingStatus?.setAttribute('aria-busy', 'true');
      document.body.classList.add('ai-loading-open');
    }

    let aiQuestions;
    try {
      aiQuestions = await window.AIService.generateRemediationQuiz(wrongQs);
    } catch (error) {
      if (typeof Swal !== 'undefined') {
        Swal.fire({ icon: 'error', title: 'Không thể tạo bài luyện tập', text: error.message });
      } else {
        console.error('Không thể tạo bài luyện tập:', error);
      }
      return;
    } finally {
      if (loadingModal) {
        loadingModal.classList.add('hidden');
        loadingModal.setAttribute('aria-hidden', 'true');
        loadingStatus?.setAttribute('aria-busy', 'false');
        document.body.classList.remove('ai-loading-open');
      }
    }

    if (aiQuestions && aiQuestions.length > 0) {
      window.AppState.currentQuestions = aiQuestions;
      window.AppState.currentQuestionIndex = 0;
      window.AppState.questionNavigationPage = 0;
      window.AppState.answers = {};
      window.AppState.practiceDraftAnswers = {};
      window.AppState.quizMode = 'EXAM';
      window.AppState.currentAttemptStartedAt = new Date().toISOString();
      navigateTo('view-quiz');
      renderCurrentQuestion();
      window.MascotEngine?.emit('quizStart', { quizTitle: 'Luyện tập câu sai', mode: 'EXAM' });
      window.QuizEngine.startTimer(aiQuestions.length * 60, (timeStr) => { 
        const timerEl = document.getElementById('countdown-timer');
        if (timerEl) timerEl.textContent = timeStr; 
      }, finishAndEvaluateQuiz);
    }
  });

  document.getElementById('btn-return-catalog')?.addEventListener('click', () => {
    if (window.AppState.resultReturnTo === 'admin-reports') {
      navigateTo('view-admin');
      const reportsTab = document.querySelector('[data-tab="tab-reports"]');
      if (reportsTab) reportsTab.click();
      else if (typeof renderAdminReports === 'function') renderAdminReports();
      return;
    }
    navigateTo('view-list');
    if (window.AppState.resultReturnTo === 'history') {
      switchStudentSubTab('subtab-history');
    } else {
      switchStudentSubTab('subtab-catalog');
    }
  });
}

function bindStudentCatalogEvents() {
  bindListEvents(['input-search-quiz', 'filter-topic', 'filter-difficulty', 'sort-quiz-catalog', 'pagesize-quiz-catalog'], 'catalog', filterAndRenderQuizzes);

  document.getElementById('quiz-grid-container')?.addEventListener('click', (e) => {
    const btn = e.target.closest('.btn-start-quiz');
    if (btn) startQuizExecution(btn.getAttribute('data-quiz-id'));
  });
}

function getCurrentStudentUserId() {
  const user = window.Auth?.getCurrentUser
    ? window.Auth.getCurrentUser()
    : window.AppState?.currentUser;
  return user?.role === 'student' && typeof user.userId === 'string'
    ? user.userId
    : null;
}

function isQuizAssignedToStudent(quiz, userId) {
  return Boolean(
    quiz &&
    typeof userId === 'string' &&
    Array.isArray(quiz.assignedStudentIds) &&
    quiz.assignedStudentIds.includes(userId)
  );
}

function getAssignedQuizForStudent(quizId, userId, database = window.LocalStorageDB.read()) {
  const quiz = database.quizzes.find(item => item.quizId === quizId);
  return isQuizAssignedToStudent(quiz, userId) ? quiz : null;
}

function getQuizStartStatus(quizId, userId, now = Date.now(), database = window.LocalStorageDB.read()) {
  const quiz = getAssignedQuizForStudent(quizId, userId, database);
  if (!quiz) return { quiz: null, reason: 'not-assigned', completedAttempts: 0 };

  const dueAt = quiz.dueAt ?? null;
  if (dueAt !== null && now >= Date.parse(dueAt)) {
    return { quiz, reason: 'deadline-passed', completedAttempts: 0 };
  }

  const completedAttempts = database.attempts.filter(attempt =>
    attempt.userId === userId &&
    attempt.quizId === quizId &&
    Number.isFinite(Date.parse(attempt.completedAt))
  ).length;
  const maxAttempts = quiz.maxAttempts ?? null;
  if (maxAttempts !== null && completedAttempts >= maxAttempts) {
    return { quiz, reason: 'attempts-exhausted', completedAttempts };
  }

  return { quiz, reason: null, completedAttempts };
}

function supportsBothQuizModes(quiz) {
  return (quiz.maxAttempts ?? null) === null && (quiz.dueAt ?? null) === null;
}

function formatQuizAttemptUsage(quiz, userId, attempts) {
  const maxAttempts = quiz.maxAttempts ?? null;
  if (maxAttempts === null) return 'Không giới hạn lượt';
  if (!userId) return '—';
  const completedAttempts = attempts.filter(attempt =>
    attempt.userId === userId &&
    attempt.quizId === quiz.id &&
    Number.isFinite(Date.parse(attempt.completedAt))
  ).length;
  return `${completedAttempts}/${maxAttempts} lượt`;
}

function formatQuizDeadline(dueAt, now = Date.now()) {
  if (dueAt == null) return 'Không giới hạn';
  const deadline = Date.parse(dueAt);
  if (!Number.isFinite(deadline)) return 'Hạn chót không hợp lệ';
  const remainingMs = deadline - now;
  if (remainingMs <= 0) return 'Đã hết hạn';
  const remainingDays = Math.floor(remainingMs / 86400000);
  if (remainingDays > 0) {
    const remainingHours = Math.ceil((remainingMs - remainingDays * 86400000) / 3600000);
    return `Còn ${remainingDays}N${remainingHours ? ` ${remainingHours}H` : ''}`;
  }
  const remainingHours = Math.ceil(remainingMs / 3600000);
  return remainingHours > 0 ? `Còn ${remainingHours}H` : 'Còn dưới 1H';
}

function showQuizStartRestriction(reason) {
  const messages = {
    'not-assigned': {
      icon: 'info',
      title: 'Bạn chưa được giao đề này',
      text: 'Chỉ học viên được giáo viên chọn mới có thể bắt đầu làm đề.'
    },
    'deadline-passed': {
      icon: 'info',
      title: 'Đã quá hạn làm đề',
      text: 'Bạn không thể bắt đầu lượt làm mới sau hạn chót. Nếu đã bắt đầu trước hạn, bạn vẫn có thể hoàn thành và nộp bài.'
    },
    'attempts-exhausted': {
      icon: 'info',
      title: 'Bạn đã hết lượt làm đề này',
      text: 'Số lượt làm tối đa đã được sử dụng. Mỗi lượt được tính khi kết quả đã nộp và lưu thành công.'
    }
  };
  const message = messages[reason];
  if (message && typeof Swal !== 'undefined') Swal.fire(message);
}

function filterAndRenderQuizzes() {
  const st = window.AppState?.listsState?.catalog || {};
  st.searchText = document.getElementById('input-search-quiz')?.value.trim().toLowerCase() || '';
  st.topic = document.getElementById('filter-topic')?.value || 'ALL';
  st.difficulty = document.getElementById('filter-difficulty')?.value || 'ALL';
  st.sort = document.getElementById('sort-quiz-catalog')?.value || 'DATE_DESC';
  st.pageSize = document.getElementById('pagesize-quiz-catalog')?.value || '10';

  if (!window.AppState || !window.AppState.allQuizzes) return;

  const currentStudentId = getCurrentStudentUserId();
  const listView = processListRecords(window.AppState.allQuizzes, {
    searchText: st.searchText,
    searchableText: ['title', 'topic'],
    filters: [
      quiz => isQuizAssignedToStudent(quiz, currentStudentId),
      quiz => st.topic === 'ALL' || String(quiz.topic || '').toLocaleLowerCase() === st.topic.toLocaleLowerCase(),
      quiz => st.difficulty === 'ALL' || String(quiz.difficulty || '').toLocaleLowerCase() === st.difficulty.toLocaleLowerCase()
    ],
    sortRecords: records => {
      if (st.sort === 'TITLE_ASC' || st.sort === 'TITLE_DESC') {
        const direction = st.sort === 'TITLE_ASC' ? 1 : -1;
        return records
          .map((record, index) => ({ record, index }))
          .sort((left, right) => direction * String(left.record.title || '').localeCompare(String(right.record.title || ''), 'vi') || left.index - right.index)
          .map(entry => entry.record);
      }
      return sortListByDate(records, st.sort);
    },
    currentPage: st.currentPage,
    pageSize: st.pageSize
  });
  st.currentPage = listView.currentPage;

  renderQuizCatalog(listView.records, listView.totalRecords);
  renderListPagination('pagination-quiz-catalog', listView, (newPage) => {
    st.currentPage = newPage;
    filterAndRenderQuizzes();
  }, 'đề thi');
}

function renderQuizCatalog(quizzes, totalCount) {
  const container = document.getElementById('quiz-grid-container');
  const countBadge = document.getElementById('quiz-count-badge');
  if (!container) return;
  container.innerHTML = '';
  
  if (countBadge) countBadge.textContent = `${totalCount || 0} đề thi`;

  if (!quizzes || quizzes.length === 0) {
    const emptyState = document.createElement('div');
    emptyState.className = 'catalog-empty-state';
    const icon = document.createElement('i');
    icon.dataset.lucide = 'search-x';
    icon.setAttribute('aria-hidden', 'true');
    const message = document.createElement('p');
    message.textContent = 'Không tìm thấy bài kiểm tra nào phù hợp!';
    emptyState.append(icon, message);
    container.appendChild(emptyState);
    if (typeof lucide !== 'undefined') lucide.createIcons();
    return;
  }

  const database = window.LocalStorageDB.read();
  const currentStudentId = getCurrentStudentUserId();
  quizzes.forEach(quiz => {
    const difficulty = String(quiz.difficulty || '').trim();
    const difficultyKey = difficulty.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    const difficultyType = ['easy', 'de', 'beginner'].includes(difficultyKey)
      ? 'easy'
      : ['medium', 'trung binh', 'intermediate'].includes(difficultyKey)
        ? 'medium'
        : ['hard', 'kho', 'advanced'].includes(difficultyKey)
          ? 'hard'
          : 'other';
    const difficultyLabel = difficultyType === 'easy'
      ? 'Dễ'
      : difficultyType === 'medium'
        ? 'Trung bình'
        : difficultyType === 'hard'
          ? 'Khó'
          : difficulty || (quiz.questions?.length ? 'Chưa xác định' : 'Chưa có câu hỏi');

    const card = document.createElement('article');
    card.className = 'quiz-card';
    card.dataset.difficulty = difficultyType;
    const content = document.createElement('div');
    const header = document.createElement('div');
    header.className = 'quiz-card-header';
    const topic = document.createElement('span');
    topic.className = 'tag tag-topic';
    topic.textContent = quiz.topic || 'Chung';
    const difficultyBadge = document.createElement('span');
    difficultyBadge.className = 'badge difficulty-badge';
    difficultyBadge.dataset.difficulty = difficultyType;
    difficultyBadge.setAttribute(
      'aria-label',
      quiz.questions?.length ? `Độ khó trung bình: ${difficultyLabel}` : 'Đề chưa có câu hỏi'
    );
    difficultyBadge.textContent = difficultyLabel;
    header.append(topic, difficultyBadge);

    const title = document.createElement('h3');
    title.className = 'student-list-item-title quiz-card-title';
    title.textContent = quiz.title || 'Bài kiểm tra';

    const metadata = document.createElement('div');
    metadata.className = 'quiz-card-meta';
    const questionCount = document.createElement('span');
    const questionIcon = document.createElement('i');
    questionIcon.dataset.lucide = 'help-circle';
    questionIcon.setAttribute('aria-hidden', 'true');
    questionCount.append(questionIcon, ` ${quiz.questions?.length || 0} câu`);
    const duration = document.createElement('span');
    const durationIcon = document.createElement('i');
    durationIcon.dataset.lucide = 'clock';
    durationIcon.setAttribute('aria-hidden', 'true');
    duration.append(durationIcon, ` ${quiz.timeLimit || 10} phút`);

    const attempts = document.createElement('span');
    const attemptsIcon = document.createElement('i');
    attemptsIcon.dataset.lucide = 'rotate-cw';
    attemptsIcon.setAttribute('aria-hidden', 'true');
    attempts.append(attemptsIcon, ` ${formatQuizAttemptUsage(quiz, currentStudentId, database.attempts)}`);

    const deadline = document.createElement('span');
    const deadlineIcon = document.createElement('i');
    deadlineIcon.dataset.lucide = 'calendar-clock';
    deadlineIcon.setAttribute('aria-hidden', 'true');
    deadline.append(deadlineIcon, ` ${formatQuizDeadline(quiz.dueAt)}`);
    metadata.append(questionCount, duration, attempts, deadline);
    content.append(header, title, metadata);

    const startButton = document.createElement('button');
    startButton.className = 'btn btn-primary btn-block btn-start-quiz';
    startButton.type = 'button';
    startButton.dataset.quizId = quiz.id;
    startButton.textContent = 'Bắt đầu làm bài';
    card.append(content, startButton);
    container.appendChild(card);
  });

  if (typeof lucide !== 'undefined') lucide.createIcons();
}

async function startQuizExecution(quizId) {
  const quiz = window.AppState.allQuizzes.find(q => q.id === quizId);
  if (!quiz) return;
  const studentId = getCurrentStudentUserId();
  let startStatus;
  try {
    startStatus = getQuizStartStatus(quizId, studentId);
  } catch (error) {
    console.error('Không thể xác minh quyền và chính sách làm đề:', error);
    if (typeof Swal !== 'undefined') {
      Swal.fire({
        icon: 'error',
        title: 'Không thể xác minh điều kiện làm đề',
        text: 'Không tải được thông tin giao đề và chính sách mới nhất. Hãy thử lại.'
      });
    }
    return;
  }
  if (startStatus.reason) {
    showQuizStartRestriction(startStatus.reason);
    filterAndRenderQuizzes();
    return;
  }

  if (!supportsBothQuizModes(startStatus.quiz)) {
    initQuizWithMode(quiz, 'EXAM');
    return;
  }

  if (typeof Swal === 'undefined' || typeof Swal.fire !== 'function') {
    console.error('Không thể hiển thị lựa chọn chế độ làm bài.');
    return;
  }
  const selection = await Swal.fire({
    title: 'Chọn chế độ làm bài',
    text: 'Ôn luyện không giới hạn thời gian; Thử thách dùng thời lượng của đề nếu có.',
    showDenyButton: true,
    showCancelButton: true,
    confirmButtonText: 'Thử thách (EXAM)',
    denyButtonText: 'Ôn luyện (PRACTICE)',
    cancelButtonText: 'Để sau'
  });
  if (selection.isConfirmed) initQuizWithMode(quiz, 'EXAM');
  else if (selection.isDenied) initQuizWithMode(quiz, 'PRACTICE');
}

// Khởi tạo bài thi với chế độ đã chọn
function initQuizWithMode(quiz, mode) {
  const studentId = getCurrentStudentUserId();
  let startStatus;
  try {
    startStatus = getQuizStartStatus(quiz.id, studentId);
  } catch (error) {
    console.error('Không thể xác minh lại điều kiện trước khi bắt đầu làm đề:', error);
    if (typeof Swal !== 'undefined') {
      Swal.fire({
        icon: 'error',
        title: 'Không thể bắt đầu đề thi',
        text: 'Không tải được chính sách làm đề mới nhất. Hãy thử lại.'
      });
    }
    return;
  }
  if (startStatus.reason) {
    showQuizStartRestriction(startStatus.reason);
    filterAndRenderQuizzes();
    return;
  }

  const currentQuiz = {
    ...quiz,
    timeLimit: startStatus.quiz.timeLimitMinutes,
    maxAttempts: startStatus.quiz.maxAttempts ?? null,
    dueAt: startStatus.quiz.dueAt ?? null
  };
  const effectiveMode = supportsBothQuizModes(startStatus.quiz) && mode === 'PRACTICE'
    ? 'PRACTICE'
    : 'EXAM';
  window.AppState.currentQuiz = currentQuiz;
  window.AppState.currentQuestions = currentQuiz.questions || [];
  window.AppState.currentQuestionIndex = 0;
  window.AppState.questionNavigationPage = 0;
  window.AppState.answers = {};
  window.AppState.practiceDraftAnswers = {};
  window.AppState.quizMode = effectiveMode;
  window.AppState.currentAttemptStartedAt = new Date().toISOString();
  window.MascotEngine?.resetAnswerStreak();

  const titleEl = document.getElementById('current-quiz-title');
  if (titleEl) {
    const modeBadge = effectiveMode === 'PRACTICE' ? ' [Chế độ Ôn luyện]' : ' [Chế độ Thử thách]';
    titleEl.textContent = currentQuiz.title + modeBadge;
  }
  
  if (typeof navigateTo === 'function') navigateTo('view-quiz');
  renderCurrentQuestion();

  // Ở chế độ EXAM mới bật đồng hồ đếm ngược
  if (effectiveMode === 'EXAM') {
    const timeLimitMinutes = parseInt(currentQuiz.timeLimit) || 10;
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
  window.MascotEngine?.emit('quizStart', { quizTitle: currentQuiz.title, mode: effectiveMode });
}

function renderCurrentQuestion(animateTransition = false) {
  const qList = window.AppState.currentQuestions || [];
  const idx = window.AppState.currentQuestionIndex || 0;
  const q = qList[idx];
  const isPracticeMode = window.AppState.quizMode === 'PRACTICE';

  if (!q) return;

  const tracker = document.getElementById('question-tracker');
  if (tracker) tracker.textContent = `Câu ${idx + 1} / ${qList.length}`;
  
  const answeredCount = qList.reduce((count, question) => {
    const savedAnswers = window.AppState.answers?.[question.id];
    return count + (Array.isArray(savedAnswers) && savedAnswers.length > 0 ? 1 : 0);
  }, 0);
  const correctCount = qList.reduce((count, question) => {
    const savedAnswers = window.AppState.answers?.[question.id];
    if (!Array.isArray(savedAnswers) || savedAnswers.length === 0) return count;

    const correctAnswers = Array.isArray(question.correctAnswer)
      ? question.correctAnswer
      : [question.correctAnswer || 0];
    const isCorrect = savedAnswers.length === correctAnswers.length &&
      savedAnswers.every(answer => correctAnswers.includes(answer));
    return count + (isCorrect ? 1 : 0);
  }, 0);
  const progressBar = document.getElementById('quiz-progress-bar');
  const progressValue = qList.length > 0
    ? Math.round((answeredCount / qList.length) * 100)
    : 0;
  if (progressBar) progressBar.style.setProperty('--progress', `${progressValue}%`);
  document.getElementById('quiz-progress')?.setAttribute('aria-valuenow', String(progressValue));
  const practiceScore = document.getElementById('practice-score');
  const practiceScoreValue = document.getElementById('practice-score-value');
  const practiceScoreRing = document.getElementById('practice-score-ring-fill');
  if (practiceScore) {
    practiceScore.hidden = !isPracticeMode;
    practiceScore.setAttribute('aria-label', `Điểm luyện tập: ${correctCount}/${qList.length} câu đúng`);
  }
  if (practiceScoreValue) practiceScoreValue.textContent = `${correctCount}/${qList.length}`;
  if (practiceScoreRing) {
    const scoreProgress = qList.length > 0 ? (correctCount / qList.length) * 100 : 0;
    practiceScoreRing.setAttribute('stroke-dashoffset', String(100 - scoreProgress));
  }

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
  const correctSel = Array.isArray(q.correctAnswer) ? q.correctAnswer : [q.correctAnswer || 0];
  const hasAnswered = currentSavedAnswers.length > 0;
  const isPracticeMultiSelect = isPracticeMode && q.type !== 'single';
  const draftAnswers = window.AppState.practiceDraftAnswers?.[q.id] || [];
  const displayedAnswers = isPracticeMultiSelect && !hasAnswered
    ? draftAnswers
    : currentSavedAnswers;

  renderQuestionNavigation(qList, idx, isPracticeMode);

  (q.options || []).forEach((optText, optIdx) => {
    const item = document.createElement('label');
    item.className = 'option-item';
    const isChecked = displayedAnswers.includes(optIdx);
    if (isChecked) item.classList.add('selected');

    // Nếu ở Practice Mode và ĐÃ CHỌN ĐÁP ÁN -> Khóa không cho bấm lại & hiển thị màu Đúng/Sai
    const inputType = q.type === 'single' ? 'radio' : 'checkbox';
    const input = document.createElement('input');
    input.type = inputType;
    input.name = `question-${q.id}`;
    input.value = String(optIdx);
    input.checked = isChecked;
    input.disabled = isPracticeMode && hasAnswered;

    const optionText = document.createElement('span');
    optionText.textContent = optText;
    item.append(input, optionText);

    if (isPracticeMode && hasAnswered) {
      item.classList.add('option-item-locked');
      if (correctSel.includes(optIdx)) item.classList.add('option-item-correct');
      else if (isChecked) item.classList.add('option-item-incorrect');
    }

    // Chỉ gán sự kiện change nếu chưa khóa câu trả lời
    if (!isPracticeMode || !hasAnswered) {
      input.addEventListener('change', (e) => {
        e.stopPropagation(); // Chặn sự kiện lan ra ngoài
        const inputs = container.querySelectorAll('input:checked');
        const selectedIndices = Array.from(inputs).map(inp => parseInt(inp.value));

        if (isPracticeMultiSelect) {
          if (!window.AppState.practiceDraftAnswers) window.AppState.practiceDraftAnswers = {};
          window.AppState.practiceDraftAnswers[q.id] = selectedIndices;
          renderCurrentQuestion();
          return;
        }
        
        if (window.QuizEngine && typeof window.QuizEngine.recordAnswer === 'function') {
          window.QuizEngine.recordAnswer(q.id, selectedIndices);
        }

        if (isPracticeMode && window.MascotEngine?.recordAnswer) {
          const isCorrect = selectedIndices.length === correctSel.length &&
            selectedIndices.every(value => correctSel.includes(value));
          window.MascotEngine.recordAnswer(isCorrect);
        }
        
        // Render lại giao diện câu hiện tại mà KHÔNG đụng vào index
        renderCurrentQuestion();
      });
    }

    container.appendChild(item);
  });

  // Hiển thị khung Giải thích chi tiết nếu ở Practice Mode và ĐÃ CHỌN ĐÁP ÁN
  let explanationBox = document.getElementById('practice-explanation-box');
  if (!explanationBox) {
    explanationBox = document.createElement('div');
    explanationBox.id = 'practice-explanation-box';
    const stepNavigation = container.parentNode.querySelector('.question-step-navigation');
    container.parentNode.insertBefore(explanationBox, stepNavigation || null);
  }

  if (isPracticeMode && hasAnswered) {
    const isCorrect = currentSavedAnswers.length === correctSel.length &&
                      currentSavedAnswers.every(val => correctSel.includes(val));
    
    explanationBox.className = `practice-explanation ${isCorrect ? 'is-correct' : 'is-incorrect'}`;
    explanationBox.hidden = false;
    explanationBox.setAttribute('role', 'status');
    explanationBox.setAttribute('aria-live', 'polite');
    explanationBox.replaceChildren();

    const resultMessage = document.createElement('p');
    resultMessage.className = 'practice-explanation-result';
    resultMessage.textContent = isCorrect
      ? '🎉 Rất tốt! Bạn trả lời chính xác!'
      : '❌ Chưa chính xác! Câu trả lời đã được khóa.';

    const explanationText = document.createElement('p');
    explanationText.className = 'practice-explanation-copy';
    const explanationLabel = document.createElement('strong');
    explanationLabel.textContent = '💡 Giải thích: ';
    explanationText.append(explanationLabel, q.explanation || 'Không có giải thích chi tiết cho câu hỏi này.');
    explanationBox.append(resultMessage, explanationText);
  } else if (isPracticeMultiSelect) {
    explanationBox.className = 'practice-explanation practice-explanation-pending';
    explanationBox.hidden = false;
    explanationBox.replaceChildren();

    const instruction = document.createElement('p');
    instruction.className = 'practice-explanation-copy';
    instruction.textContent = 'Chọn tất cả đáp án phù hợp, sau đó kiểm tra đáp án.';

    const checkAnswerButton = document.createElement('button');
    checkAnswerButton.className = 'btn btn-primary practice-check-answer';
    checkAnswerButton.type = 'button';
    checkAnswerButton.textContent = '✓';
    checkAnswerButton.setAttribute('aria-label', 'Kiểm tra đáp án');
    checkAnswerButton.title = 'Kiểm tra đáp án';
    checkAnswerButton.disabled = draftAnswers.length === 0;
    checkAnswerButton.addEventListener('click', () => {
      const selectedIndices = window.AppState.practiceDraftAnswers?.[q.id] || [];
      if (selectedIndices.length === 0) return;

      if (window.QuizEngine && typeof window.QuizEngine.recordAnswer === 'function') {
        window.QuizEngine.recordAnswer(q.id, selectedIndices);
      }
      delete window.AppState.practiceDraftAnswers[q.id];

      const isCorrect = selectedIndices.length === correctSel.length &&
        selectedIndices.every(value => correctSel.includes(value));
      window.MascotEngine?.recordAnswer?.(isCorrect);
      renderCurrentQuestion();
    });

    explanationBox.append(instruction, checkAnswerButton);
  } else {
    explanationBox.className = 'practice-explanation';
    explanationBox.hidden = true;
  }

  const btnPrev = document.getElementById('btn-prev-question');
  if (btnPrev) btnPrev.disabled = (idx === 0);

  const btnNext = document.getElementById('btn-next-question');
  if (btnNext) btnNext.disabled = (idx === qList.length - 1);

  if (animateTransition) {
    const questionCard = document.querySelector('.quiz-execution-container .question-card');
    if (questionCard) {
      questionCard.classList.remove('question-transition-in');
      void questionCard.offsetWidth;
      questionCard.classList.add('question-transition-in');
    }
  }
}

function renderQuestionNavigation(qList, currentIndex, isPracticeMode) {
  const navigation = document.getElementById('question-navigation');
  const navigationProgress = document.getElementById('question-navigation-progress');
  const pageStatus = document.getElementById('question-navigation-page-status');
  const previousPageButton = document.getElementById('btn-question-navigation-prev');
  const nextPageButton = document.getElementById('btn-question-navigation-next');
  if (!navigation) return;

  const pageCount = Math.ceil(qList.length / QUESTION_NAVIGATION_PAGE_SIZE);
  const page = Math.min(
    Math.max(window.AppState.questionNavigationPage || 0, 0),
    Math.max(pageCount - 1, 0)
  );
  window.AppState.questionNavigationPage = page;
  const pageStart = page * QUESTION_NAVIGATION_PAGE_SIZE;
  const pageEnd = Math.min(pageStart + QUESTION_NAVIGATION_PAGE_SIZE, qList.length);
  const fragment = document.createDocumentFragment();
  let answeredCount = 0;

  qList.forEach((question, questionIndex) => {
    const savedAnswers = window.AppState.answers?.[question.id];
    const isAnswered = Array.isArray(savedAnswers) && savedAnswers.length > 0;
    const correctAnswers = Array.isArray(question.correctAnswer)
      ? question.correctAnswer
      : [question.correctAnswer || 0];
    const isCorrect = isAnswered &&
      savedAnswers.length === correctAnswers.length &&
      savedAnswers.every(answer => correctAnswers.includes(answer));
    if (isAnswered) answeredCount++;
    if (questionIndex < pageStart || questionIndex >= pageEnd) return;

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'question-number-button';
    button.dataset.questionIndex = String(questionIndex);
    button.textContent = String(questionIndex + 1);
    button.setAttribute(
      'aria-label',
      `Câu ${questionIndex + 1}${isPracticeMode && isAnswered
        ? (isCorrect ? ', trả lời đúng' : ', trả lời sai')
        : (isAnswered ? ', đã trả lời' : ', chưa trả lời')}${questionIndex === currentIndex ? ', câu hiện tại' : ''}`
    );

    if (questionIndex === currentIndex) {
      button.classList.add('is-current');
      button.setAttribute('aria-current', 'step');
    }
    if (isAnswered) {
      button.classList.add('is-answered');
      if (isPracticeMode) button.classList.add(isCorrect ? 'is-correct' : 'is-incorrect');
    }

    fragment.appendChild(button);
  });

  navigation.replaceChildren(fragment);
  if (navigationProgress) {
    navigationProgress.textContent = `${answeredCount}/${qList.length} đã trả lời`;
  }
  if (pageStatus) pageStatus.textContent = `Trang ${page + 1} / ${pageCount || 1}`;
  if (previousPageButton) previousPageButton.disabled = page === 0;
  if (nextPageButton) nextPageButton.disabled = page >= pageCount - 1;
}

async function confirmQuizSubmission() {
  if (typeof Swal === 'undefined' || typeof Swal.fire !== 'function') {
    console.error('Không thể xác nhận nộp bài vì hộp thoại chưa sẵn sàng.');
    return;
  }

  const questions = window.AppState.currentQuestions || [];
  const answers = window.AppState.answers || {};
  const unansweredCount = questions.filter(question => {
    const selectedAnswers = answers[question.id];
    return !Array.isArray(selectedAnswers) || selectedAnswers.length === 0;
  }).length;
  const hasUnansweredQuestions = unansweredCount > 0;
  const confirmation = await Swal.fire({
    icon: hasUnansweredQuestions ? 'warning' : 'question',
    title: hasUnansweredQuestions ? 'Bạn còn câu chưa làm' : 'Xác nhận nộp bài?',
    text: hasUnansweredQuestions
      ? `Còn ${unansweredCount} câu chưa trả lời. Bạn có muốn quay lại làm tiếp không?`
      : 'Bạn có chắc muốn nộp bài và xem kết quả?',
    showCancelButton: true,
    confirmButtonText: hasUnansweredQuestions ? 'Vẫn nộp bài' : 'Nộp bài',
    cancelButtonText: hasUnansweredQuestions ? 'Làm tiếp' : 'Kiểm tra lại'
  });

  if (confirmation.isConfirmed) finishAndEvaluateQuiz();
}

function finishAndEvaluateQuiz() {
  if (window.QuizEngine && typeof window.QuizEngine.stopTimer === 'function') {
    window.QuizEngine.stopTimer();
  }

  const questions = window.AppState.currentQuestions || [];
  const answers = window.AppState.answers || {};

  const results = window.QuizEngine.evaluateQuiz(questions, answers);
  window.AppState.quizResults = results;
  const quizTitle = window.AppState.currentQuiz?.title || 'Luyện tập AI';
  const currentUser = window.Auth ? window.Auth.getCurrentUser() : null;
  const quizId = window.AppState.currentQuiz?.id || null;
  const previousAttempts = typeof getQuizHistoryForCurrentUser === 'function'
    ? getQuizHistoryForCurrentUser()
    : [];
  const latestPriorAttempt = previousAttempts
    .filter(item => item.quizId === quizId && item.completedAt)
    .sort((left, right) => new Date(right.completedAt) - new Date(left.completedAt))[0];
  renderQuizResultPage(results, quizTitle);

  // Lưu Lịch sử Bài thi
  try {
    const completedAt = new Date();
    const historyItem = {
      attemptId: `${completedAt.getTime()}_${Math.random().toString(36).slice(2)}`,
      quizId,
      timestamp: completedAt.toLocaleString('vi-VN'),
      completedAt: completedAt.toISOString(),
      startedAt: window.AppState.currentAttemptStartedAt || completedAt.toISOString(),
      username: currentUser ? currentUser.fullName : 'Học viên',
      ownerUsername: currentUser?.username || null,
      quizTitle,
      topic: window.AppState.currentQuiz?.topic || 'Chung',
      score: results.score,
      correctCount: results.correctCount,
      totalQuestions: results.totalQuestions,
      mode: window.AppState.quizMode || 'EXAM',
      questions: JSON.parse(JSON.stringify(questions)),
      answers: JSON.parse(JSON.stringify(answers))
    };
    if (window.QuizHistoryStorage) {
      window.QuizHistoryStorage.save(historyItem);
    } else {
      throw new Error('Không tìm thấy dịch vụ lưu lịch sử làm bài.');
    }
  } catch (error) {
    console.error('Không thể lưu lịch sử làm bài vào database demo:', error);
    if (typeof Swal !== 'undefined') {
      Swal.fire({
        icon: 'error',
        title: 'Không thể lưu kết quả',
        text: `Kết quả hiện tại vẫn được hiển thị nhưng chưa lưu vào lịch sử: ${error.message}`
      });
    }
  }

  // 💧 XỬ LÝ MASCOT & CỘNG NƯỚC KHI NỘP BÀI
  let fullBucketEarned = false;
  let fullBucketCount = 0;
  let previousFullBucketCount = 0;
  let waterProgress = 0;
  if (window.MascotEngine) {
    if (results.score === 10) {
      // Đạt điểm tối đa -> Tích nước vào xô
      const data = window.MascotEngine.getData();
      previousFullBucketCount = Number(data.fullBucketCount) || 0;
      data.waterProgress += 1;

      if (data.waterProgress >= 5) {
        data.waterProgress = 0;
        data.fullBucketCount += 1;
        fullBucketEarned = true;
        fullBucketCount = data.fullBucketCount;
      }
      waterProgress = data.waterProgress;
      window.MascotEngine.saveData(data);
    }
    window.MascotEngine.emit?.('quizComplete', {
      score: results.score,
      improved: Boolean(latestPriorAttempt && results.score > Number(latestPriorAttempt.score)),
      previousScore: latestPriorAttempt?.score,
      bucketEarned: fullBucketEarned,
      fullBucketCount,
      previousFullBucketCount,
      waterProgress,
      user: currentUser
    });
  }

  if (results.score >= 8.0 && typeof confetti === 'function') {
    confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 } });
  }

  window.AppState.resultReturnTo = 'catalog';
  if (typeof navigateTo === 'function') navigateTo('view-result');
  if (fullBucketEarned) {
    window.MascotEngine.celebrateFullBucket(fullBucketCount);
  }
}

function renderQuizResultPage(results, quizTitle, options = {}) {
  const teacherReview = options.teacherReview === true;
  const pageTitle = document.getElementById('result-page-title');
  if (pageTitle) pageTitle.textContent = 'Chi tiết kết quả bài làm';

  const scoreNum = document.getElementById('result-score-number');
  if (scoreNum) scoreNum.textContent = results.score;

  const quizName = document.getElementById('result-quiz-name');
  if (quizName) quizName.textContent = `Đề thi: ${quizTitle}`;

  if (window.QuizEngine && typeof window.QuizEngine.renderChart === 'function') {
    const subjectChartStats = results.subjectStats || results.topicStats || {};
    window.QuizEngine.renderChart('skills-chart', subjectChartStats);
    renderSubjectChartLegend(subjectChartStats);
  }

  renderSkillAnalysis(results.subjectStats || {});
  const aiBanner = document.querySelector('.ai-banner');
  if (aiBanner) {
    aiBanner.hidden = teacherReview;
    aiBanner.classList.toggle('hidden', teacherReview);
  }
  const reviewTitle = document.getElementById('review-section-title');
  const reviewLabel = document.getElementById('review-section-label');
  if (reviewLabel) reviewLabel.textContent = 'Chi tiết tất cả câu hỏi';
  const returnLabel = document.getElementById('result-return-label');
  if (returnLabel) {
    returnLabel.textContent = teacherReview
      ? 'Quay lại lịch sử nộp bài'
      : 'Quay Lại Danh Sách Đề Thi';
  }
  renderWrongQuestionsReview(results.reviewQuestions || results.wrongQuestions || []);
}

window.renderQuizResultPage = renderQuizResultPage;

function renderSubjectChartLegend(subjectStats) {
  const container = document.getElementById('skills-chart-legend');
  if (!container) return;
  container.replaceChildren();

  Object.entries(subjectStats || {}).forEach(([subjectId, subject]) => {
    const total = Number(subject.total) || 0;
    const correct = Number(subject.correct) || 0;
    const accuracy = total ? Math.round((correct / total) * 100) : 0;
    const item = document.createElement('p');
    item.className = 'chart-subject-legend-item';
    item.textContent = `Đạt ${accuracy}%`;
    item.setAttribute('aria-label', `${subject.subjectName || subjectId}: Đạt ${accuracy}%`);
    container.appendChild(item);
  });
}

function renderSkillAnalysis(subjectStats) {
  const container = document.getElementById('result-skill-analysis');
  if (!container) return;
  container.replaceChildren();

  const subjects = Object.values(subjectStats || {});
  if (subjects.length === 0) {
    const message = document.createElement('p');
    message.className = 'skill-analysis-empty';
    message.textContent = 'Chưa có dữ liệu môn học hoặc kỹ năng để phân tích.';
    container.appendChild(message);
    return;
  }

  subjects.forEach(subject => {
    const subjectCard = document.createElement('article');
    subjectCard.className = 'skill-subject-card';
    const heading = document.createElement('h3');
    heading.className = 'skill-subject-title';
    heading.textContent = subject.subjectName;

    const subjectAccuracy = subject.total
      ? Math.round((subject.correct / subject.total) * 100)
      : 0;
    const summary = document.createElement('p');
    summary.className = 'skill-subject-summary';
    summary.textContent = `${subject.correct}/${subject.total} câu đúng · ${subjectAccuracy}%`;
    subjectCard.append(heading, summary);

    const skills = Object.values(subject.skills || {});
    if (skills.length === 0) {
      const emptySkill = document.createElement('p');
      emptySkill.className = 'skill-analysis-empty';
      emptySkill.textContent = 'Đề này chưa có câu hỏi được gắn kỹ năng.';
      subjectCard.appendChild(emptySkill);
    }
    skills.forEach(skill => {
      const accuracy = skill.total ? Math.round((skill.correct / skill.total) * 100) : 0;
      const isWeak = accuracy < window.QuizEngine.WEAK_SKILL_THRESHOLD;
      const row = document.createElement('div');
      row.className = 'skill-analysis-row';

      const name = document.createElement('span');
      name.className = 'skill-analysis-name';
      name.textContent = skill.skillName;

      const progress = document.createElement('progress');
      progress.className = `skill-analysis-progress${isWeak ? ' is-weak' : ''}`;
      progress.max = 100;
      progress.value = accuracy;
      progress.setAttribute('aria-label', `${skill.skillName}: ${accuracy}%`);

      const value = document.createElement('span');
      value.className = `skill-analysis-value${isWeak ? ' is-weak' : ' is-strong'}`;
      value.textContent = `${skill.correct}/${skill.total} · ${accuracy}% · ${isWeak ? 'Cần củng cố' : 'Mạnh'}`;
      row.append(name, progress, value);
      subjectCard.appendChild(row);
    });

    container.appendChild(subjectCard);
  });
}

function renderWrongQuestionsReview(wrongQs) {
  const container = document.getElementById('wrong-questions-container');
  if (!container) return;
  container.innerHTML = '';

  if (!wrongQs || wrongQs.length === 0) {
    const successCard = document.createElement('article');
    successCard.className = 'question-card review-success-card';
    const successMessage = document.createElement('h3');
    successMessage.textContent = '🎉 Xin chúc mừng! Bạn đã trả lời chính xác 100% tất cả các câu hỏi trong bài thi.';
    successCard.appendChild(successMessage);
    container.appendChild(successCard);
    return;
  }

  wrongQs.forEach((q, idx) => {
    const card = document.createElement('article');
    card.className = 'question-card review-question-card';

    const userSelection = Array.isArray(q.userSelection) ? q.userSelection : [];
    const userAnsText = userSelection.length > 0
      ? userSelection.map(i => q.options?.[i] || '').filter(Boolean).join(', ')
      : 'Chưa chọn đáp án';

    const correctAnswers = Array.isArray(q.correctAnswer) ? q.correctAnswer : [q.correctAnswer];
    const correctAnsText = correctAnswers
      .filter(Number.isInteger)
      .map(index => q.options?.[index] || '')
      .filter(Boolean)
      .join(', ');
    const isCorrect = typeof q.isCorrect === 'boolean'
      ? q.isCorrect
      : userSelection.length === correctAnswers.length &&
        userSelection.every(index => correctAnswers.includes(index));

    const questionTitle = document.createElement('h3');
    questionTitle.className = 'review-question-title';
    questionTitle.textContent = `Câu ${q.questionNumber || idx + 1}: ${q.question || ''}`;

    const userAnswer = document.createElement('p');
    userAnswer.className = `review-user-answer ${isCorrect ? 'is-correct' : 'is-incorrect'}`;
    const userAnswerLabel = document.createElement('strong');
    userAnswerLabel.textContent = `${isCorrect ? '✅' : '❌'} Lựa chọn của bạn: `;
    userAnswer.append(userAnswerLabel, userAnsText);

    const correctAnswer = document.createElement('p');
    correctAnswer.className = 'review-correct-answer';
    const correctAnswerLabel = document.createElement('strong');
    correctAnswerLabel.textContent = '✅ Đáp án đúng: ';
    correctAnswer.append(correctAnswerLabel, correctAnsText);

    const explanation = document.createElement('p');
    explanation.className = 'review-explanation';
    const explanationLabel = document.createElement('strong');
    explanationLabel.textContent = '💡 Giải thích chi tiết: ';
    explanation.append(explanationLabel, q.explanation || 'Không có giải thích.');

    card.classList.add(isCorrect ? 'is-correct' : 'is-incorrect');
    card.append(questionTitle, userAnswer, correctAnswer, explanation);

    container.appendChild(card);
  });
}
