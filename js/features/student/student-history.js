/* ==========================================================================
   Adaptive Quiz System - Student History Module (js/features/student/student-history.js)
   ========================================================================== */

const LEGACY_QUIZ_HISTORY_KEY = 'quiz_history_all';

function normalizeHistoryOwner(value) {
  return String(value || '').trim().toLocaleLowerCase();
}

function resolveHistoryUser(historyItem, users) {
  const owner = normalizeHistoryOwner(historyItem.ownerUsername);
  const username = normalizeHistoryOwner(historyItem.username);
  const identifiers = users.filter(user => {
    const userId = normalizeHistoryOwner(user.userId);
    return (owner && owner === userId) || (username && username === userId);
  });
  if (identifiers.length === 1) return identifiers[0];
  if (identifiers.length > 1) return null;

  const names = users.filter(user => {
    const fullName = normalizeHistoryOwner(user.fullName);
    return (owner && owner === fullName) || (username && username === fullName);
  });
  return names.length === 1 ? names[0] : null;
}

function createLegacyAttemptId(historyItem, completedAt, correctCount, totalQuestions) {
  if (typeof historyItem.attemptId === 'string' && historyItem.attemptId.trim()) {
    return historyItem.attemptId;
  }
  const serialized = JSON.stringify(historyItem);
  let hash = 2166136261;
  for (let index = 0; index < serialized.length; index++) {
    hash ^= serialized.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `legacy_attempt_${Date.parse(completedAt)}_${correctCount}_${totalQuestions}_${(hash >>> 0).toString(36)}`;
}

function createAttemptFromLegacyHistory(historyItem, database, user) {
  if (!historyItem || typeof historyItem !== 'object' || Array.isArray(historyItem)) {
    throw new Error('Bản ghi lịch sử phải là một object.');
  }
  if (!Array.isArray(historyItem.questions) || !historyItem.answers ||
      typeof historyItem.answers !== 'object' || Array.isArray(historyItem.answers)) {
    throw new Error('Bản ghi không có snapshot câu hỏi và đáp án đầy đủ.');
  }
  const questions = historyItem.questions;
  const totalQuestions = Number(historyItem.totalQuestions);
  const correctCount = Number(historyItem.correctCount);
  const score = Number(historyItem.score);
  if (!Number.isInteger(totalQuestions) || totalQuestions < 1 || totalQuestions !== questions.length ||
      !Number.isInteger(correctCount) || correctCount < 0 || correctCount > totalQuestions ||
      !Number.isFinite(score) || score < 0 || score > 10) {
    throw new Error('Điểm hoặc số lượng câu trong bản ghi lịch sử không hợp lệ.');
  }
  if (!['EXAM', 'PRACTICE'].includes(historyItem.mode)) {
    throw new Error('Chế độ làm bài trong bản ghi lịch sử không hợp lệ.');
  }
  const completedDate = new Date(historyItem.completedAt || historyItem.timestamp);
  if (!Number.isFinite(completedDate.getTime())) {
    throw new Error('Bản ghi lịch sử không có thời gian hoàn thành hợp lệ.');
  }
  const completedAt = completedDate.toISOString();
  const startedDate = new Date(historyItem.startedAt || completedAt);
  if (!Number.isFinite(startedDate.getTime()) || startedDate > completedDate) {
    throw new Error('Thời gian bắt đầu lượt làm không hợp lệ.');
  }
  const currentQuestions = new Map(database.questions.map(question => [question.questionId, question]));
  const difficulties = new Map(database.difficulties.map(item => [item.difficultyId, item]));
  const questionIds = new Set();
  const items = questions.map((question, questionIndex) => {
    if (!question || typeof question.id !== 'string' || !question.id.trim() ||
        questionIds.has(question.id) || typeof question.question !== 'string' || !question.question.trim() ||
        !Array.isArray(question.options)) {
      throw new Error('Snapshot có câu hỏi thiếu ID, nội dung hoặc danh sách phương án hợp lệ.');
    }
    questionIds.add(question.id);
    const options = question.options.map((content, index) => ({ content, index }))
      .filter(option => typeof option.content === 'string' && option.content.trim());
    if (options.length < 2) throw new Error(`Câu hỏi ${question.id} không có đủ phương án hợp lệ.`);
    const rawCorrectAnswers = Array.isArray(question.correctAnswer)
      ? question.correctAnswer
      : [question.correctAnswer];
    if (rawCorrectAnswers.length === 0 ||
        rawCorrectAnswers.some(index => !Number.isInteger(index) || !options.some(option => option.index === index))) {
      throw new Error(`Câu hỏi ${question.id} có đáp án đúng không hợp lệ.`);
    }
    const selectedIndexes = historyItem.answers[question.id] || [];
    if (!Array.isArray(selectedIndexes) ||
        selectedIndexes.some(index => !Number.isInteger(index) || !options.some(option => option.index === index))) {
      throw new Error(`Câu trả lời của ${question.id} không hợp lệ.`);
    }
    const optionIdByIndex = new Map(options.map((option, index) => [option.index, `attempt_option_${questionIndex}_${index}`]));
    const correctOptionIdsSnapshot = rawCorrectAnswers.map(index => optionIdByIndex.get(index));
    const selectedOptionIds = selectedIndexes.map(index => optionIdByIndex.get(index));
    const correctSet = new Set(correctOptionIdsSnapshot);
    const selectedSet = new Set(selectedOptionIds);
    const isCorrect = correctSet.size === selectedSet.size &&
      [...correctSet].every(optionId => selectedSet.has(optionId));
    const databaseQuestion = currentQuestions.get(question.id);
    const skillIdSnapshot = database.skills.some(skill => skill.skillId === question.skillId)
      ? question.skillId
      : databaseQuestion?.skillId || null;
    const difficultyRankSnapshot = Number.isInteger(question.difficultyRank)
      ? question.difficultyRank
      : difficulties.get(databaseQuestion?.difficultyId)?.rank || null;
    const legacyMetadata = { ...question };
    delete legacyMetadata.id;
    delete legacyMetadata.question;
    delete legacyMetadata.options;
    delete legacyMetadata.correctAnswer;
    return {
      questionId: question.id,
      questionSnapshot: {
        content: question.question,
        legacyMetadata,
        legacyOptionCount: question.options.length
      },
      optionsSnapshot: options.map((option, index) => ({
        optionId: optionIdByIndex.get(option.index),
        content: option.content,
        legacyIndex: option.index
      })),
      correctOptionIdsSnapshot,
      selectedOptionIds,
      isCorrect,
      skillIdSnapshot,
      difficultyRankSnapshot
    };
  });
  const actualCorrectCount = items.filter(item => item.isCorrect).length;
  const expectedScore = Number(((actualCorrectCount / totalQuestions) * 10).toFixed(1));
  if (actualCorrectCount !== correctCount || score !== expectedScore) {
    throw new Error('Điểm tổng hợp không khớp snapshot đáp án.');
  }
  const quizExists = database.quizzes.some(quiz => quiz.quizId === historyItem.quizId);
  return {
    attemptId: createLegacyAttemptId(historyItem, completedAt, correctCount, totalQuestions),
    userId: user.userId,
    quizId: quizExists ? historyItem.quizId : null,
    mode: historyItem.mode,
    startedAt: startedDate.toISOString(),
    completedAt,
    score,
    correctCount,
    totalQuestions,
    items,
    timestamp: historyItem.timestamp || completedDate.toLocaleString('vi-VN'),
    username: historyItem.username || user.fullName,
    ownerUsername: user.userId,
    quizTitle: historyItem.quizTitle || 'Bài kiểm tra',
    topic: historyItem.topic || 'Chung'
  };
}

function createHistoryFromAttempt(attempt, database) {
  const questions = [];
  const answers = {};
  attempt.items.forEach(item => {
    const optionsById = new Map(item.optionsSnapshot.map(option => [option.optionId, option]));
    const optionIndex = option => Number.isInteger(option.legacyIndex)
      ? option.legacyIndex
      : item.optionsSnapshot.indexOf(option);
    const question = item.questionSnapshot.legacyMetadata
      ? {
          ...item.questionSnapshot.legacyMetadata,
          id: item.questionId,
          question: item.questionSnapshot.content,
          options: [],
          correctAnswer: []
        }
      : {
          id: item.questionId,
          question: item.questionSnapshot.content,
          options: [],
          correctAnswer: [],
          type: item.correctOptionIdsSnapshot.length > 1 ? 'multiple' : 'single',
          topic: attempt.topic || 'Chung'
        };
    const legacyOptions = item.optionsSnapshot.map(option => optionIndex(option));
    const optionCount = Number.isInteger(item.questionSnapshot.legacyOptionCount)
      ? item.questionSnapshot.legacyOptionCount
      : legacyOptions.length ? Math.max(...legacyOptions) + 1 : 0;
    question.options = Array(optionCount).fill('');
    item.optionsSnapshot.forEach(option => {
      question.options[optionIndex(option)] = option.content;
    });
    question.correctAnswer = item.correctOptionIdsSnapshot
      .map(optionId => {
        const option = optionsById.get(optionId);
        return option ? optionIndex(option) : -1;
      })
      .filter(index => index >= 0);
    questions.push(question);
    answers[item.questionId] = item.selectedOptionIds
      .map(optionId => {
        const option = optionsById.get(optionId);
        return option ? optionIndex(option) : -1;
      })
      .filter(index => index >= 0);
  });
  return {
    attemptId: attempt.attemptId,
    quizId: attempt.quizId ?? null,
    timestamp: attempt.timestamp || new Date(attempt.completedAt).toLocaleString('vi-VN'),
    startedAt: attempt.startedAt,
    completedAt: attempt.completedAt,
    username: attempt.username || database.users.find(user => user.userId === attempt.userId)?.fullName || 'Học viên',
    ownerUsername: attempt.ownerUsername || attempt.userId,
    quizTitle: attempt.quizTitle || 'Bài kiểm tra',
    topic: attempt.topic || 'Chung',
    score: attempt.score,
    correctCount: attempt.correctCount,
    totalQuestions: attempt.totalQuestions,
    mode: attempt.mode,
    questions,
    answers
  };
}

function migrateLegacyQuizHistory() {
  const storedHistory = localStorage.getItem(LEGACY_QUIZ_HISTORY_KEY);
  if (storedHistory === null) return [];

  let legacyHistory;
  try {
    legacyHistory = JSON.parse(storedHistory);
    if (!Array.isArray(legacyHistory)) throw new Error('Dữ liệu lịch sử không phải mảng.');
  } catch (error) {
    console.error('Không thể đọc lịch sử làm bài; khóa cũ được giữ nguyên:', error);
    return [];
  }

  const database = window.LocalStorageDB.read();
  const knownAttemptIds = new Set(database.attempts.map(attempt => attempt.attemptId));
  const pendingHistory = [];
  const attemptsToImport = [];
  legacyHistory.forEach(item => {
    const user = resolveHistoryUser(item, database.users);
    if (!user) {
      pendingHistory.push(item);
      return;
    }
    try {
      const attempt = createAttemptFromLegacyHistory(item, database, user);
      if (!knownAttemptIds.has(attempt.attemptId)) {
        attemptsToImport.push(attempt);
        knownAttemptIds.add(attempt.attemptId);
      }
    } catch (error) {
      console.warn('Giữ lại bản ghi lịch sử legacy chưa thể chuyển đổi:', error.message);
      pendingHistory.push(item);
    }
  });

  if (attemptsToImport.length > 0) {
    try {
      window.LocalStorageDB.update(draft => {
        draft.attempts.unshift(...attemptsToImport);
      });
    } catch (error) {
      console.error('Không thể chuyển lịch sử làm bài vào database; khóa cũ được giữ nguyên:', error);
      return legacyHistory;
    }
  }
  try {
    if (pendingHistory.length === 0) {
      localStorage.removeItem(LEGACY_QUIZ_HISTORY_KEY);
    } else if (attemptsToImport.length > 0) {
      localStorage.setItem(LEGACY_QUIZ_HISTORY_KEY, JSON.stringify(pendingHistory));
    }
  } catch (error) {
    console.error('Không thể cập nhật khóa lịch sử legacy sau khi import:', error);
  }
  return pendingHistory;
}

window.QuizHistoryStorage = {
  readAll() {
    let pendingHistory = [];
    try {
      pendingHistory = migrateLegacyQuizHistory();
    } catch (error) {
      console.error('Không thể chuyển lịch sử legacy vào database demo:', error);
    }
    const refreshedDatabase = window.LocalStorageDB.read();
    const histories = refreshedDatabase.attempts.map(attempt => createHistoryFromAttempt(attempt, refreshedDatabase));
    const knownAttemptIds = new Set(histories.map(item => item.attemptId));
    return histories.concat(pendingHistory.filter(item => !knownAttemptIds.has(item?.attemptId)));
  },

  save(historyItem) {
    const user = window.Auth?.getCurrentUser();
    if (!user) throw new Error('Cần đăng nhập để lưu kết quả làm bài.');
    const database = window.LocalStorageDB.read();
    const attempt = createAttemptFromLegacyHistory(historyItem, database, user);
    window.LocalStorageDB.update(draft => {
      if (draft.attempts.some(item => item.attemptId === attempt.attemptId)) {
        throw new Error(`Lượt làm bài ${attempt.attemptId} đã được lưu trước đó.`);
      }
      draft.attempts.unshift(attempt);
    });
    return attempt;
  }
};

function readQuizHistoryForUser(currentUser) {
  const history = window.QuizHistoryStorage.readAll();
  if (!currentUser) return [];

  const username = String(currentUser.username || '').trim().toLocaleLowerCase();
  const userId = String(currentUser.userId || '').trim().toLocaleLowerCase();
  const fullName = String(currentUser.fullName || '').trim().toLocaleLowerCase();
  if (!username && !userId && !fullName) return [];

  return history.filter(item => {
    if (item.ownerUsername) {
      const owner = String(item.ownerUsername).trim().toLocaleLowerCase();
      return owner === userId || owner === username;
    }

    const legacyOwner = String(item.username || '').trim().toLocaleLowerCase();
    return legacyOwner === username || legacyOwner === userId || (fullName && legacyOwner === fullName);
  });
}

function readQuizHistoryForCurrentUser() {
  return readQuizHistoryForUser(window.Auth?.getCurrentUser());
}

function getQuizHistoryForCurrentUser() {
  try {
    return readQuizHistoryForCurrentUser();
  } catch (error) {
    console.error('Không thể đọc lịch sử làm bài của học viên:', error);
    return [];
  }
}

function getQuizHistoryForUser(user) {
  try {
    return readQuizHistoryForUser(user);
  } catch (error) {
    console.error('Không thể đọc lịch sử làm bài của học viên:', error);
    return [];
  }
}

function renderQuizHistoryView() {
  const container = document.getElementById('student-history-mount-point');
  if (!container) return;

  const state = window.AppState.listsState.studentHistory;
  container.innerHTML = `
    <section class="history-filters" aria-label="Tìm kiếm và lọc lịch sử">
      <label class="history-filter history-search">
        <span class="history-filter-label">Tìm kiếm</span>
        <span class="search-box">
          <i data-lucide="search" class="search-icon" aria-hidden="true"></i>
          <input id="input-search-history" type="search" placeholder="Tên bài, chủ đề hoặc ngày">
        </span>
      </label>
      <label class="history-filter">
        <span class="history-filter-label">Chế độ</span>
        <select id="filter-history-mode" class="select-control">
          <option value="ALL">Tất cả chế độ</option>
          <option value="EXAM">Thử thách</option>
          <option value="PRACTICE">Ôn luyện</option>
        </select>
      </label>
      <label class="history-filter">
        <span class="history-filter-label">Điểm số</span>
        <select id="filter-history-score" class="select-control">
          <option value="ALL">Tất cả điểm</option>
          <option value="HIGH">Từ 8 điểm</option>
          <option value="LOW">Dưới 8 điểm</option>
        </select>
      </label>
      <label class="history-filter">
        <span class="history-filter-label">Sắp xếp</span>
        <select id="sort-student-history" class="select-control">
          <option value="DATE_DESC" selected>Mới nhất trước</option>
          <option value="DATE_ASC">Cũ nhất trước</option>
          <option value="TITLE_ASC">Tên bài (A - Z)</option>
          <option value="TITLE_DESC">Tên bài (Z - A)</option>
        </select>
      </label>
      <label class="history-filter">
        <span class="history-filter-label">Số kết quả mỗi trang</span>
        <select id="pagesize-student-history" class="select-control">
          <option value="10" selected>10 / trang</option>
          <option value="20">20 / trang</option>
          <option value="50">50 / trang</option>
          <option value="ALL">Hiện tất cả</option>
        </select>
      </label>
    </section>
    <header class="catalog-header history-results-header">
      <h2><i data-lucide="history" aria-hidden="true"></i> Lịch sử làm bài</h2>
      <span id="history-count-badge" class="count-badge" aria-live="polite">0 lượt</span>
    </header>
    <p id="history-status" class="history-status" role="status" aria-live="polite"></p>
    <div id="history-items-container" class="history-list" aria-live="polite"></div>
    <nav id="pagination-student-history" class="pagination-wrapper" aria-label="Phân trang lịch sử làm bài"></nav>
  `;

  const searchInput = document.getElementById('input-search-history');
  const modeFilter = document.getElementById('filter-history-mode');
  const scoreFilter = document.getElementById('filter-history-score');
  const sortSelect = document.getElementById('sort-student-history');
  const pageSizeSelect = document.getElementById('pagesize-student-history');

  searchInput.value = state.searchText;
  modeFilter.value = state.mode;
  scoreFilter.value = state.score;
  sortSelect.value = state.sort;
  pageSizeSelect.value = state.pageSize;

  searchInput.addEventListener('input', () => {
    state.searchText = searchInput.value.trim().toLocaleLowerCase();
    state.currentPage = 1;
    renderQuizHistoryItems();
  });

  modeFilter.addEventListener('change', () => {
    state.mode = modeFilter.value;
    state.currentPage = 1;
    renderQuizHistoryItems();
  });

  scoreFilter.addEventListener('change', () => {
    state.score = scoreFilter.value;
    state.currentPage = 1;
    renderQuizHistoryItems();
  });

  sortSelect.addEventListener('change', () => {
    state.sort = sortSelect.value;
    state.currentPage = 1;
    renderQuizHistoryItems();
  });

  pageSizeSelect.addEventListener('change', () => {
    state.pageSize = pageSizeSelect.value;
    state.currentPage = 1;
    renderQuizHistoryItems();
  });

  if (container.dataset.historyReviewEventsBound !== 'true') {
    container.addEventListener('click', event => {
      if (event.target.closest('[data-retry-history]')) {
        renderQuizHistoryItems();
        return;
      }
      const reviewButton = event.target.closest('[data-review-attempt]');
      if (reviewButton) reviewQuizHistoryEntry(reviewButton.dataset.reviewAttempt);
    });
    container.dataset.historyReviewEventsBound = 'true';
  }

  bindListResetControl(
    ['input-search-history', 'filter-history-mode', 'filter-history-score', 'sort-student-history', 'pagesize-student-history'],
    'studentHistory',
    () => {
      state.searchText = searchInput.value.trim().toLocaleLowerCase();
      state.mode = modeFilter.value;
      state.score = scoreFilter.value;
      state.sort = sortSelect.value;
      state.pageSize = pageSizeSelect.value;
      renderQuizHistoryItems();
    }
  );
  renderQuizHistoryItems();
  if (typeof lucide !== 'undefined') lucide.createIcons();
}

function renderQuizHistoryItems() {
  const container = document.getElementById('history-items-container');
  const countBadge = document.getElementById('history-count-badge');
  const status = document.getElementById('history-status');
  if (!container || !countBadge) return;

  const state = window.AppState.listsState.studentHistory;
  const searchText = state.searchText.trim().toLocaleLowerCase();
  let userHistory;
  try {
    userHistory = readQuizHistoryForCurrentUser();
  } catch (error) {
    console.error('Không thể tải lịch sử làm bài của học viên:', error);
    countBadge.textContent = 'Chưa tải được';
    if (status) status.textContent = `Không thể tải lịch sử làm bài: ${error.message}`;
    container.replaceChildren();
    const errorState = document.createElement('div');
    errorState.className = 'history-empty-state history-error-state';
    const message = document.createElement('p');
    message.textContent = 'Đã xảy ra lỗi khi tải lịch sử. Kết quả cũ không bị xóa.';
    const retryButton = document.createElement('button');
    retryButton.type = 'button';
    retryButton.className = 'btn btn-outline';
    retryButton.dataset.retryHistory = '';
    retryButton.textContent = 'Thử tải lại';
    errorState.append(message, retryButton);
    container.appendChild(errorState);
    clearListPagination('pagination-student-history');
    return;
  }
  if (status) status.textContent = '';
  const listView = processListRecords(userHistory, {
    searchText,
    searchableText: ['quizTitle', 'topic', 'timestamp', 'completedAt', 'username'],
    filters: [
      item => state.mode === 'ALL' || item.mode === state.mode,
      item => {
        const score = Number.parseFloat(item.score);
        return state.score === 'ALL' ||
          (state.score === 'HIGH' && score >= 8) ||
          (state.score === 'LOW' && score < 8);
      }
    ],
    sortRecords: records => state.sort === 'TITLE_ASC' || state.sort === 'TITLE_DESC'
      ? records.map((record, index) => ({ record, index }))
        .sort((left, right) => (state.sort === 'TITLE_DESC' ? -1 : 1) *
          String(left.record.quizTitle || '').localeCompare(String(right.record.quizTitle || ''), 'vi', { sensitivity: 'base' }) || left.index - right.index)
        .map(entry => entry.record)
      : sortListByDate(records, state.sort),
    currentPage: state.currentPage,
    pageSize: state.pageSize
  });
  state.currentPage = listView.currentPage;

  countBadge.textContent = `${listView.totalRecords} lượt`;
  container.innerHTML = '';

  if (listView.totalRecords === 0) {
    const emptyMessage = document.createElement('p');
    emptyMessage.className = 'history-empty-state';
    emptyMessage.textContent = userHistory.length === 0
      ? 'Bạn chưa hoàn thành bài thi nào.'
      : 'Không tìm thấy lượt làm bài phù hợp.';
    container.appendChild(emptyMessage);
    renderListPagination('pagination-student-history', listView, () => {}, 'lượt làm bài');
    return;
  }

  listView.records.forEach(item => container.appendChild(createHistoryCard(item)));
  renderListPagination('pagination-student-history', listView, newPage => {
    state.currentPage = newPage;
    renderQuizHistoryItems();
  }, 'lượt làm bài');
}

function createHistoryCard(item) {
  const card = document.createElement('article');
  card.className = 'history-item-card';

  const details = document.createElement('div');
  details.className = 'history-item-details';
  const mode = document.createElement('p');
  mode.className = `history-mode-label ${item.mode === 'PRACTICE' ? 'is-practice' : 'is-exam'}`;
  mode.textContent = `${item.mode === 'PRACTICE' ? '📖 Ôn Luyện' : '⏱️ Thử Thách'} • ${item.timestamp || item.completedAt || ''}`;

  const title = document.createElement('h3');
  title.className = 'student-list-item-title history-item-title';
  title.textContent = item.quizTitle || 'Bài kiểm tra';

  const resultDetails = document.createElement('p');
  resultDetails.className = 'history-item-summary';
  resultDetails.textContent = `Số câu đúng: ${item.correctCount || 0}/${item.totalQuestions || '?'} câu`;

  details.append(mode, title, resultDetails);

  const actions = document.createElement('div');
  actions.className = 'history-item-actions';

  const score = document.createElement('strong');
  score.className = `history-item-score ${Number.parseFloat(item.score) >= 8 ? 'is-high' : 'is-low'}`;
  score.textContent = `${item.score ?? '0'} /10`;
  actions.appendChild(score);

  const canReview = Array.isArray(item.questions) && item.questions.length > 0
    && item.answers && typeof item.answers === 'object';
  const reviewButton = document.createElement('button');
  reviewButton.className = 'btn btn-outline';
  reviewButton.textContent = canReview ? 'Xem kết quả' : 'Không có dữ liệu xem lại';
  reviewButton.disabled = !canReview;
  if (canReview) reviewButton.dataset.reviewAttempt = item.attemptId;
  else reviewButton.title = 'Lượt làm bài cũ không lưu câu hỏi và đáp án nên không thể xem lại.';
  actions.appendChild(reviewButton);

  card.append(details, actions);
  return card;
}

function reviewQuizHistoryEntry(attemptId) {
  const historyItem = getQuizHistoryForCurrentUser().find(item => item.attemptId === attemptId);
  if (!historyItem || !Array.isArray(historyItem.questions) || !historyItem.answers) {
    if (typeof Swal !== 'undefined') {
      Swal.fire({
        icon: 'info',
        title: 'Không thể xem lại lượt này',
        text: 'Lượt làm bài được lưu trước khi có tính năng xem lại nên chưa có câu hỏi và đáp án chi tiết.'
      });
    }
    return;
  }

  const results = window.QuizEngine.evaluateQuiz(historyItem.questions, historyItem.answers);
  window.AppState.currentQuiz = {
    id: historyItem.quizId || historyItem.attemptId,
    title: historyItem.quizTitle || 'Bài kiểm tra',
    topic: historyItem.topic || 'Chung'
  };
  window.AppState.currentQuestions = historyItem.questions;
  window.AppState.answers = historyItem.answers;
  window.AppState.quizMode = historyItem.mode || 'EXAM';
  window.AppState.quizResults = results;
  window.AppState.resultReturnTo = 'history';

  window.renderQuizResultPage(results, historyItem.quizTitle || 'Bài kiểm tra');
  navigateTo('view-result');
}

window.renderQuizHistoryView = renderQuizHistoryView;
window.getQuizHistoryForCurrentUser = getQuizHistoryForCurrentUser;
window.getQuizHistoryForUser = getQuizHistoryForUser;
