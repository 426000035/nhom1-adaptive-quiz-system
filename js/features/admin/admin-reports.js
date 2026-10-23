/* ==========================================================================
   Adaptive Quiz System - Admin Reports Module (js/features/admin/admin-reports.js)
   ========================================================================== */

function initAdminReportsModule() {
  bindAdminReportsEvents();
}

function bindAdminReportsEvents() {
  // Lọc & Phân trang Danh sách 5
  bindListEvents(['search-admin-reports', 'sort-admin-reports', 'pagesize-admin-reports'], 'adminReports', renderAdminReports);
}

function getReportTimestamp(item) {
  const completedAt = Date.parse(item.completedAt || '');
  if (Number.isFinite(completedAt)) return completedAt;

  const timestamp = String(item.timestamp || '').trim();
  const vietnameseDate = timestamp.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?\s+(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (vietnameseDate) {
    const [, hour, minute, second = '0', day, month, year] = vietnameseDate;
    const date = new Date(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute), Number(second));
    if (
      date.getFullYear() === Number(year) &&
      date.getMonth() === Number(month) - 1 &&
      date.getDate() === Number(day)
    ) {
      return date.getTime();
    }
    return null;
  }

  const parsedTimestamp = Date.parse(timestamp);
  return Number.isFinite(parsedTimestamp) ? parsedTimestamp : null;
}

function getReportNumber(value) {
  if (value === null || value === undefined || value === '') return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function sortAdminReportRecords(records, sort) {
  const direction = sort.endsWith('_DESC') ? -1 : 1;
  return records
    .map((item, index) => ({ item, index }))
    .sort((left, right) => {
      let leftValue;
      let rightValue;
      let numeric = false;
      switch (sort) {
        case 'DATE_DESC':
        case 'DATE_ASC':
          leftValue = getReportTimestamp(left.item);
          rightValue = getReportTimestamp(right.item);
          numeric = true;
          break;
        case 'SCORE_DESC':
        case 'SCORE_ASC':
          leftValue = getReportNumber(left.item.score);
          rightValue = getReportNumber(right.item.score);
          numeric = true;
          break;
        case 'CORRECT_DESC':
        case 'CORRECT_ASC':
          leftValue = getReportNumber(left.item.correctCount);
          rightValue = getReportNumber(right.item.correctCount);
          numeric = true;
          break;
        case 'TITLE_DESC':
          leftValue = String(left.item.username || '');
          rightValue = String(right.item.username || '');
          break;
        case 'TITLE_ASC':
        default:
          leftValue = String(left.item.username || '');
          rightValue = String(right.item.username || '');
          break;
      }
      let comparison = 0;
      if (numeric && (leftValue === null || rightValue === null)) {
        comparison = leftValue === rightValue ? 0 : leftValue === null ? 1 : -1;
      } else if (numeric) {
        comparison = (leftValue - rightValue) * direction;
      } else {
        comparison = leftValue.localeCompare(rightValue, 'vi', { sensitivity: 'base' }) * direction;
      }
      return comparison || left.index - right.index;
    })
    .map(entry => entry.item);
}

function renderAdminReports() {
  const historyTbody = document.getElementById('admin-history-tbody');
  const attemptsEl = document.getElementById('stat-total-attempts');
  const avgScoreEl = document.getElementById('stat-avg-score');
  const status = document.getElementById('admin-reports-status');
  if (!historyTbody) return;

  if (status) status.textContent = 'Đang tải lịch sử nộp bài...';
  historyTbody.replaceChildren();

  let history;
  let quizScores;
  try {
    if (typeof window.QuizHistoryStorage?.readAll !== 'function') {
      throw new Error('Dịch vụ lịch sử nộp bài chưa sẵn sàng.');
    }
    if (typeof window.QuizEngine?.aggregateQuizScores !== 'function') {
      throw new Error('Dịch vụ tổng hợp điểm chưa sẵn sàng.');
    }
    history = window.QuizHistoryStorage.readAll();
    quizScores = window.QuizEngine.aggregateQuizScores(history);
  } catch (error) {
    if (attemptsEl) attemptsEl.textContent = '—';
    if (avgScoreEl) avgScoreEl.textContent = '—';
    if (status) status.textContent = `Không thể tải lịch sử nộp bài: ${error.message}`;
    renderAdminEmptyRow(historyTbody, 7, 'Không tải được dữ liệu báo cáo.', 'admin-error-state');
    if (typeof Swal !== 'undefined') {
      Swal.fire({ icon: 'error', title: 'Không thể tải báo cáo', text: error.message });
    } else {
      console.error('Không thể tải báo cáo quản trị:', error);
    }
    clearListPagination('pagination-admin-reports');
    return;
  }
  const aggregateByAttemptId = new Map();
  quizScores.forEach(group => {
    group.attemptIds.forEach(attemptId => aggregateByAttemptId.set(attemptId, group));
  });

  if (attemptsEl) attemptsEl.textContent = history.length;
  if (quizScores.length > 0) {
    const totalScore = quizScores.reduce((sum, item) => sum + item.aggregateScore, 0);
    if (avgScoreEl) avgScoreEl.textContent = (totalScore / quizScores.length).toFixed(1);
  } else if (avgScoreEl) {
    avgScoreEl.textContent = "0.0";
  }

  const st = window.AppState.listsState.adminReports;
  st.searchText = document.getElementById('search-admin-reports')?.value.trim().toLowerCase() || '';
  st.sort = document.getElementById('sort-admin-reports')?.value || 'DATE_DESC';
  st.pageSize = document.getElementById('pagesize-admin-reports')?.value || '10';

  const listView = processListRecords(history, {
    searchText: st.searchText,
    searchableText: ['username', 'quizTitle'],
    sortRecords: records => sortAdminReportRecords(records, st.sort),
    currentPage: st.currentPage,
    pageSize: st.pageSize
  });
  st.currentPage = listView.currentPage;
  if (status) status.textContent = `Đã tải ${history.length} lượt; có ${listView.totalRecords} lượt phù hợp.`;
  const pagedData = listView.records;

  if (pagedData.length === 0) {
    renderAdminEmptyRow(historyTbody, 7, 'Không có dữ liệu lượt nộp bài phù hợp.');
  } else {
    const policyLabels = { highest: 'Cao nhất', average: 'Trung bình', latest: 'Lần cuối' };
    pagedData.forEach(item => {
      const tr = document.createElement('tr');
      const values = [
        item.timestamp || 'N/A',
        item.username || 'Học viên',
        item.quizTitle || 'Bài kiểm tra'
      ];
      values.forEach((value, index) => {
        const td = document.createElement('td');
        td.textContent = value;
        if (index === 0) {
          td.className = 'admin-report-timestamp';
        } else if (index === 1) {
          td.className = 'admin-table-cell--strong';
        }
        tr.appendChild(td);
      });

      const attemptScore = document.createElement('td');
      attemptScore.className = `admin-report-score ${item.score >= 8 ? 'admin-report-score--success' : 'admin-report-score--danger'}`;
      attemptScore.textContent = `${item.score} / 10`;
      tr.appendChild(attemptScore);

      const aggregateCell = document.createElement('td');
      const aggregate = aggregateByAttemptId.get(item.attemptId);
      aggregateCell.textContent = aggregate
        ? `${aggregate.aggregateScore.toFixed(1)} / 10 · ${policyLabels[aggregate.scorePolicy] || 'Không xác định'} (${aggregate.attemptCount} lượt)`
        : '—';
      tr.appendChild(aggregateCell);

      const correctCount = document.createElement('td');
      correctCount.textContent = `${item.correctCount || 0} câu`;
      tr.appendChild(correctCount);

      const actionCell = document.createElement('td');
      const reviewButton = document.createElement('button');
      reviewButton.type = 'button';
      reviewButton.className = 'btn btn-outline';
      const canReview = Array.isArray(item.questions) && item.questions.length > 0 &&
        item.answers && typeof item.answers === 'object' && !Array.isArray(item.answers);
      reviewButton.textContent = canReview ? 'Xem chi tiết' : 'Không có chi tiết';
      reviewButton.disabled = !canReview;
      if (canReview) {
        reviewButton.addEventListener('click', () => reviewAdminAttempt(item.attemptId));
      } else {
        reviewButton.title = 'Lượt làm bài này không lưu snapshot câu hỏi và đáp án.';
      }
      actionCell.appendChild(reviewButton);
      tr.appendChild(actionCell);
      historyTbody.appendChild(tr);
    });
  }

  renderListPagination('pagination-admin-reports', listView, (newPage) => {
    st.currentPage = newPage;
    renderAdminReports();
  }, 'lượt làm bài');
}

function reviewAdminAttempt(attemptId) {
  const currentUser = window.Auth?.getCurrentUser?.() || window.AppState?.currentUser;
  if (currentUser?.role !== 'admin') {
    const error = new Error('Chỉ giáo viên mới có thể xem chi tiết lượt làm bài.');
    if (typeof Swal !== 'undefined') {
      Swal.fire({ icon: 'error', title: 'Không thể xem kết quả', text: error.message });
    } else {
      console.error(error.message);
    }
    return;
  }

  try {
    const historyItem = window.QuizHistoryStorage.readAll()
      .find(item => item.attemptId === attemptId);
    if (!historyItem || !Array.isArray(historyItem.questions) || !historyItem.answers ||
        typeof historyItem.answers !== 'object' || Array.isArray(historyItem.answers)) {
      throw new Error('Lượt làm bài này không có snapshot câu hỏi và đáp án để xem lại.');
    }
    if (typeof window.QuizEngine?.evaluateQuiz !== 'function' ||
        typeof window.renderQuizResultPage !== 'function') {
      throw new Error('Màn hình kết quả chưa sẵn sàng.');
    }

    const results = window.QuizEngine.evaluateQuiz(historyItem.questions, historyItem.answers);
    const allQuestionReviews = historyItem.questions.map((question, index) => ({
      ...question,
      userSelection: historyItem.answers[question.id] || [],
      isCorrect: !results.wrongQuestions.some(item => item.id === question.id),
      questionNumber: index + 1
    }));
    results.reviewQuestions = allQuestionReviews;

    window.AppState.currentQuiz = {
      id: historyItem.quizId || historyItem.attemptId,
      title: historyItem.quizTitle || 'Bài kiểm tra',
      topic: historyItem.topic || 'Chung'
    };
    window.AppState.currentQuestions = historyItem.questions;
    window.AppState.answers = historyItem.answers;
    window.AppState.quizMode = historyItem.mode || 'EXAM';
    window.AppState.quizResults = results;
    window.AppState.resultReturnTo = 'admin-reports';

    const studentName = historyItem.username || 'Học viên';
    const quizTitle = historyItem.quizTitle || 'Bài kiểm tra';
    window.renderQuizResultPage(results, `${studentName} · ${quizTitle}`, { teacherReview: true });
    navigateTo('view-result');
  } catch (error) {
    console.error('Không thể mở chi tiết lượt làm bài:', error);
    if (typeof Swal !== 'undefined') {
      Swal.fire({ icon: 'error', title: 'Không thể xem kết quả', text: error.message });
    }
  }
}