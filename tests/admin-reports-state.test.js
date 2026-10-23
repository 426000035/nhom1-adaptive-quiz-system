const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const source = fs.readFileSync(
  path.join(__dirname, '..', 'js', 'features', 'admin', 'admin-reports.js'),
  'utf8'
);
const utilitySource = fs.readFileSync(
  path.join(__dirname, '..', 'js', 'core', 'utils.js'),
  'utf8'
);

class MockElement {
  constructor() {
    this.textContent = '';
    this.children = [];
    this.attributes = {};
    this.style = {};
  }

  replaceChildren() {
    this.children = [];
  }

  appendChild(child) {
    this.children.push(child);
  }

  addEventListener(type, handler) {
    this.listeners = this.listeners || {};
    this.listeners[type] = handler;
  }

  click() {
    this.listeners?.click?.();
  }
}

function createReportContext(readHistory, sortValue = 'DATE_DESC') {
  const elements = new Map([
    ['admin-history-tbody', new MockElement()],
    ['stat-total-attempts', new MockElement()],
    ['stat-avg-score', new MockElement()],
    ['admin-reports-status', new MockElement()],
    ['search-admin-reports', Object.assign(new MockElement(), { value: '' })],
    ['sort-admin-reports', Object.assign(new MockElement(), { value: sortValue })],
    ['pagesize-admin-reports', Object.assign(new MockElement(), { value: 'ALL' })]
  ]);
  const alerts = [];
  const context = {
    document: {
      getElementById: id => elements.get(id) || null,
      createElement: () => new MockElement()
    },
    window: {
      Auth: { getCurrentUser: () => ({ role: 'admin' }) },
      QuizHistoryStorage: { readAll: readHistory },
      QuizEngine: { aggregateQuizScores: () => [] },
      AppState: { listsState: { adminReports: { currentPage: 1 } } }
    },
    renderAdminEmptyRow(tbody, columnCount, message, className) {
      const cell = new MockElement();
      cell.colSpan = columnCount;
      cell.textContent = message;
      cell.className = className;
      const row = new MockElement();
      row.appendChild(cell);
      tbody.appendChild(row);
    },
    renderPaginationUI() {},
    Swal: { fire: alert => alerts.push(alert) }
  };
  vm.createContext(context);
  vm.runInContext(utilitySource, context);
  context.renderPaginationUI = () => {};
  vm.runInContext(source, context);
  return { context, elements, alerts };
}

test('report read failures show an explicit error instead of successful empty results', () => {
  const { context, elements, alerts } = createReportContext(() => {
    throw new Error('Database unavailable');
  });

  context.renderAdminReports();

  assert.equal(elements.get('stat-total-attempts').textContent, '—');
  assert.equal(elements.get('stat-avg-score').textContent, '—');
  assert.match(elements.get('admin-reports-status').textContent, /Database unavailable/);
  assert.equal(elements.get('admin-history-tbody').children[0].children[0].className, 'admin-error-state');
  assert.equal(alerts[0].title, 'Không thể tải báo cáo');
});

test('reports distinguish an empty history from a read failure', () => {
  const { context, elements, alerts } = createReportContext(() => []);

  context.renderAdminReports();

  assert.equal(elements.get('stat-total-attempts').textContent, 0);
  assert.equal(elements.get('stat-avg-score').textContent, '0.0');
  assert.match(elements.get('admin-reports-status').textContent, /Đã tải 0 lượt/);
  assert.equal(
    elements.get('admin-history-tbody').children[0].children[0].textContent,
    'Không có dữ liệu lượt nộp bài phù hợp.'
  );
  assert.equal(alerts.length, 0);
});

test('reports sort by newest timestamp and number of correct answers', () => {
  const history = [
    { attemptId: 'old', timestamp: '08:30:00 02/03/2026', username: 'An', score: 9, correctCount: 8 },
    { attemptId: 'new', completedAt: '2026-03-10T08:00:00.000Z', timestamp: '10/03/2026', username: 'An', score: 7, correctCount: 3 },
    { attemptId: 'middle', timestamp: '09:15:00 05/03/2026', username: 'An', score: 5, correctCount: 6 }
  ];
  const { context, elements } = createReportContext(() => history);

  context.renderAdminReports();
  const rowsByNewest = elements.get('admin-history-tbody').children;
  assert.equal(rowsByNewest[0].children[0].textContent, '10/03/2026');
  assert.equal(rowsByNewest[0].children.length, 7);
  assert.equal(rowsByNewest[1].children[0].textContent, '09:15:00 05/03/2026');
  assert.equal(rowsByNewest[2].children[0].textContent, '08:30:00 02/03/2026');

  elements.get('sort-admin-reports').value = 'SCORE_ASC';
  context.renderAdminReports();
  const rowsByScore = elements.get('admin-history-tbody').children;
  assert.equal(rowsByScore[0].children[3].textContent, '5 / 10');
  assert.equal(rowsByScore[1].children[3].textContent, '7 / 10');
  assert.equal(rowsByScore[2].children[3].textContent, '9 / 10');

  elements.get('sort-admin-reports').value = 'CORRECT_DESC';
  context.renderAdminReports();
  const rowsByCorrectCount = elements.get('admin-history-tbody').children;
  assert.equal(rowsByCorrectCount[0].children[3].textContent, '9 / 10');
  assert.equal(rowsByCorrectCount[1].children[3].textContent, '5 / 10');
  assert.equal(rowsByCorrectCount[2].children[3].textContent, '7 / 10');
});

test('teacher opens an attempt in the shared result view with every answered question', () => {
  const historyItem = {
    attemptId: 'attempt_review',
    username: 'An',
    quizTitle: 'Đề Toán',
    score: 5,
    correctCount: 1,
    totalQuestions: 2,
    questions: [
      { id: 'q1', question: 'Câu một', options: ['A', 'B'], correctAnswer: [0] },
      { id: 'q2', question: 'Câu hai', options: ['C', 'D'], correctAnswer: [1] }
    ],
    answers: { q1: [0], q2: [0] }
  };
  const { context, elements } = createReportContext(() => [historyItem]);
  let renderedResult;
  let navigatedTo;
  context.window.QuizEngine.evaluateQuiz = () => ({
    score: 5,
    correctCount: 1,
    totalQuestions: 2,
    wrongQuestions: [{ id: 'q2' }],
    subjectStats: {}
  });
  context.window.renderQuizResultPage = (...args) => { renderedResult = args; };
  context.navigateTo = viewId => { navigatedTo = viewId; };

  context.renderAdminReports();
  const detailButton = elements.get('admin-history-tbody').children[0].children[6].children[0];
  assert.equal(detailButton.textContent, 'Xem chi tiết');
  detailButton.click();

  assert.equal(renderedResult[1], 'An · Đề Toán');
  assert.equal(renderedResult[2].teacherReview, true);
  assert.equal(renderedResult[0].reviewQuestions.length, 2);
  assert.equal(renderedResult[0].reviewQuestions[0].isCorrect, true);
  assert.equal(renderedResult[0].reviewQuestions[1].isCorrect, false);
  assert.equal(context.window.AppState.resultReturnTo, 'admin-reports');
  assert.equal(navigatedTo, 'view-result');
});

test('student cannot open a teacher attempt result', () => {
  const { context, alerts } = createReportContext(() => []);
  context.window.Auth.getCurrentUser = () => ({ role: 'student' });

  context.reviewAdminAttempt('attempt_review');

  assert.equal(alerts[0].title, 'Không thể xem kết quả');
  assert.match(alerts[0].text, /Chỉ giáo viên/);
});
