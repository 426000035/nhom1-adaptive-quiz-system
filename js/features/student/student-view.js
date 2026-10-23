/* ==========================================================================
   Adaptive Quiz System - Student Views & Events Module (js/features/student/student-view.js)
   ========================================================================== */

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
      window.AppState.answers = {};
      window.AppState.quizMode = 'EXAM';
      window.AppState.currentAttemptStartedAt = new Date().toISOString();
      navigateTo('view-quiz');
      renderCurrentQuestion();
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

// Đề thi có thời lượng được bắt đầu trực tiếp ở chế độ EXAM.
function startQuizExecution(quizId) {
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

  initQuizWithMode(quiz, 'EXAM');
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
  const effectiveMode = Number(currentQuiz.timeLimit) > 0 ? 'EXAM' : mode;
  window.AppState.currentQuiz = currentQuiz;
  window.AppState.currentQuestions = currentQuiz.questions || [];
  window.AppState.currentQuestionIndex = 0;
  window.AppState.answers = {};
  window.AppState.quizMode = effectiveMode;
  window.AppState.currentAttemptStartedAt = new Date().toISOString();

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
}

function renderCurrentQuestion() {
  const qList = window.AppState.currentQuestions || [];
  const idx = window.AppState.currentQuestionIndex || 0;
  const q = qList[idx];
  const isPracticeMode = window.AppState.quizMode === 'PRACTICE';

  if (!q) return;

  const tracker = document.getElementById('question-tracker');
  if (tracker) tracker.textContent = `Câu ${idx + 1} / ${qList.length}`;
  
  const progressBar = document.getElementById('quiz-progress-bar');
  const progressValue = Math.round(((idx + 1) / qList.length) * 100);
  if (progressBar) progressBar.style.setProperty('--progress', `${progressValue}%`);
  document.getElementById('quiz-progress')?.setAttribute('aria-valuenow', String(progressValue));

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

  (q.options || []).forEach((optText, optIdx) => {
    const item = document.createElement('label');
    item.className = 'option-item';
    const isChecked = currentSavedAnswers.includes(optIdx);
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
        
        if (window.QuizEngine && typeof window.QuizEngine.recordAnswer === 'function') {
          window.QuizEngine.recordAnswer(q.id, selectedIndices);
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
    container.parentNode.appendChild(explanationBox);
  }

  if (isPracticeMode && hasAnswered) {
    const isCorrect = currentSavedAnswers.length === correctSel.length &&
                      currentSavedAnswers.every(val => correctSel.includes(val));
    
    if (window.MascotEngine && typeof window.MascotEngine.speak === 'function') {
      if (isCorrect) {
        window.MascotEngine.speak("Đỉnh quá! Chính xác 100%!", 'correct');
      } else {
        window.MascotEngine.speak("Không sao cả, xem giải thích nhé!", 'wrong');
      }
    }

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
  } else {
    explanationBox.className = 'practice-explanation';
    explanationBox.hidden = true;
  }

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
  const quizTitle = window.AppState.currentQuiz?.title || 'Luyện tập AI';
  renderQuizResultPage(results, quizTitle);

  // Lưu Lịch sử Bài thi
  try {
    const currentUser = window.Auth ? window.Auth.getCurrentUser() : null;
    const completedAt = new Date();
    const historyItem = {
      attemptId: `${completedAt.getTime()}_${Math.random().toString(36).slice(2)}`,
      quizId: window.AppState.currentQuiz?.id || null,
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
  if (window.MascotEngine) {
    if (results.score === 10) {
      // Đạt điểm tối đa -> Tích nước vào xô
      const data = window.MascotEngine.getData();
      data.waterProgress += 1;

      if (data.waterProgress >= 5) {
        data.waterProgress = 0;
        data.fullBucketCount += 1;
        fullBucketEarned = true;
        fullBucketCount = data.fullBucketCount;
        window.MascotEngine.speak(`🎉 XÔ NƯỚC ĐÃ ĐẦY 100%! Bạn có ${data.fullBucketCount} xô tưới cây rồi!`, 'excited');
      } else {
        window.MascotEngine.speak(`🏆 ĐỈNH CAO 10/10! +1 vạch nước! (${data.waterProgress}/5)`, 'correct');
      }
      window.MascotEngine.saveData(data);
    } else if (results.score >= 8.0) {
      window.MascotEngine.speak(`Giỏi lắm! Đạt ${results.score} điểm! Thêm chút nữa là được 10 rồi! 💪`, 'happy');
    } else {
      window.MascotEngine.speak(`Hoàn thành bài thi! Ôn lại các câu sai bên dưới để lấy điểm 10 lượt sau nhé! 😉`, 'happy');
    }
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
