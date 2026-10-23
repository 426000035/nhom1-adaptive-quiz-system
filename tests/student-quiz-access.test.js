const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const moduleSource = fs.readFileSync(
  path.join(__dirname, '..', 'js', 'features', 'student', 'student-view.js'),
  'utf8'
);
const utilitySource = fs.readFileSync(
  path.join(__dirname, '..', 'js', 'core', 'utils.js'),
  'utf8'
);

function createStudentView({ userId = 'student_1', role = 'student', quizzes = [], attempts = [], aiService = null, document = null } = {}) {
  const alerts = [];
  const database = {
    quizzes: quizzes.map(quiz => ({
      ...quiz,
      quizId: quiz.id,
      timeLimitMinutes: quiz.timeLimitMinutes ?? quiz.timeLimit ?? 15
    })),
    attempts
  };
  const timerStarts = [];
  const context = {
    console,
    window: {
      Auth: { getCurrentUser: () => ({ userId, role }) },
      AppState: {
        currentUser: { userId, role },
        allQuizzes: quizzes,
        listsState: { catalog: { currentPage: 1 } }
      },
      LocalStorageDB: { read: () => database },
      QuizEngine: { startTimer: (...args) => timerStarts.push(args) },
      AIService: aiService
    },
    document: document || { getElementById: () => null, body: { classList: { add() {}, remove() {} } } },
    Swal: { fire: alert => alerts.push(alert) },
    alerts,
    sortListByDate(records, sort) {
      const direction = sort === 'DATE_ASC' ? 1 : -1;
      return records.slice().sort((left, right) =>
        ((Date.parse(left.createdAt || '') || 0) - (Date.parse(right.createdAt || '') || 0)) * direction
      );
    },
    timerStarts
  };
  vm.createContext(context);
  vm.runInContext(utilitySource, context);
  vm.runInContext(moduleSource, context);
  context.renderQuizCatalog = (items, totalCount) => {
    context.renderedQuizzes = items;
    context.renderedCount = totalCount;
  };
  context.renderPaginationUI = () => {};
  return context;
}

function createAiLoadingContext(generateRemediationQuiz) {
  const attributes = {};
  const modalClasses = new Set(['hidden']);
  const bodyClasses = new Set();
  const statusAttributes = {};
  const classList = (classes, history) => ({
    add(value) {
      classes.add(value);
      history.push({ action: 'add', value });
    },
    remove(value) {
      classes.delete(value);
      history.push({ action: 'remove', value });
    }
  });
  const modalHistory = [];
  const bodyHistory = [];
  const status = {
    setAttribute(name, value) {
      statusAttributes[name] = value;
    }
  };
  const modal = {
    classList: classList(modalClasses, modalHistory),
    setAttribute(name, value) {
      attributes[name] = value;
    },
    querySelector(selector) {
      return selector === '[role="status"]' ? status : null;
    }
  };
  let triggerHandler;
  const trigger = {
    addEventListener(eventName, callback) {
      if (eventName === 'click') triggerHandler = callback;
    }
  };
  const document = {
    body: { classList: classList(bodyClasses, bodyHistory) },
    getElementById(id) {
      if (id === 'btn-trigger-ai') return trigger;
      if (id === 'ai-loading-modal') return modal;
      return null;
    }
  };
  const context = createStudentView({
    document,
    aiService: { generateRemediationQuiz }
  });
  context.console.trace = () => {};
  context.window.AppState.quizResults = { wrongQuestions: [{ id: 'wrong_1' }] };
  context.bindStudentEvents();

  return { context, triggerHandler, modalClasses, bodyClasses, attributes, statusAttributes, modalHistory, bodyHistory };
}

test('AI loading overlay restores its accessible idle state after a successful empty result', async () => {
  const state = createAiLoadingContext(async () => []);

  await state.triggerHandler();

  assert.equal(state.modalClasses.has('hidden'), true);
  assert.equal(state.bodyClasses.has('ai-loading-open'), false);
  assert.equal(state.attributes['aria-hidden'], 'true');
  assert.equal(state.statusAttributes['aria-busy'], 'false');
  assert.deepEqual(state.modalHistory.slice(0, 2), [
    { action: 'remove', value: 'hidden' },
    { action: 'add', value: 'hidden' }
  ]);
  assert.deepEqual(state.bodyHistory.slice(0, 2), [
    { action: 'add', value: 'ai-loading-open' },
    { action: 'remove', value: 'ai-loading-open' }
  ]);
});

test('AI loading overlay exposes a status announcement and reduced-motion styling', () => {
  const template = fs.readFileSync(path.join(__dirname, '..', 'views', 'shared', 'modals.html'), 'utf8');
  const componentStyles = fs.readFileSync(path.join(__dirname, '..', 'css', 'components.css'), 'utf8');

  assert.match(template, /id="ai-loading-modal"[^>]*aria-hidden="true"/);
  assert.match(template, /role="status" aria-live="polite" aria-atomic="true" aria-busy="false"/);
  assert.match(template, /class="spinner-pulse" aria-hidden="true"/);
  assert.match(componentStyles, /@media \(prefers-reduced-motion: reduce\)\s*\{[^}]*\.spinner-pulse\s*\{\s*animation:\s*none/s);
});

test('AI loading overlay closes and reports an error when generation rejects', async () => {
  const state = createAiLoadingContext(async () => {
    throw new Error('Service unavailable');
  });

  await state.triggerHandler();

  assert.equal(state.modalClasses.has('hidden'), true);
  assert.equal(state.bodyClasses.has('ai-loading-open'), false);
  assert.equal(state.attributes['aria-hidden'], 'true');
  assert.equal(state.statusAttributes['aria-busy'], 'false');
  assert.match(state.context.alerts[0].text, /Service unavailable/);
});

test('student catalog includes only quizzes explicitly assigned to the current user', () => {
  const context = createStudentView({
    quizzes: [
      { id: 'assigned', title: 'Được giao', topic: 'Toán', difficulty: 'Easy', assignedStudentIds: ['student_1'] },
      { id: 'other-student', title: 'Giao người khác', topic: 'Toán', difficulty: 'Easy', assignedStudentIds: ['student_2'] },
      { id: 'unassigned', title: 'Chưa giao', topic: 'Toán', difficulty: 'Easy', assignedStudentIds: [] },
      { id: 'legacy-unassigned', title: 'Đề cũ chưa giao', topic: 'Toán', difficulty: 'Easy' }
    ]
  });

  context.filterAndRenderQuizzes();
  assert.deepEqual(
    Array.from(context.renderedQuizzes, quiz => quiz.id),
    ['assigned']
  );
  assert.equal(context.renderedCount, 1);
});

test('catalog stays empty when there is no authenticated student', () => {
  const context = createStudentView({
    userId: 'teacher_1',
    role: 'admin',
    quizzes: [
      { id: 'assigned', title: 'Được giao', topic: 'Toán', difficulty: 'Easy', assignedStudentIds: ['teacher_1'] }
    ]
  });

  context.filterAndRenderQuizzes();
  assert.equal(context.renderedQuizzes.length, 0);
});

test('start authorization reads the latest assignment from the database', () => {
  const context = createStudentView({
    quizzes: [
      { id: 'quiz_1', title: 'Đề Toán', topic: 'Toán', difficulty: 'Easy', assignedStudentIds: ['student_1'] }
    ]
  });
  const latestQuiz = context.window.LocalStorageDB.read().quizzes[0];
  assert.equal(context.getAssignedQuizForStudent('quiz_1', 'student_1'), latestQuiz);

  latestQuiz.assignedStudentIds = ['student_2'];
  assert.equal(context.getAssignedQuizForStudent('quiz_1', 'student_1'), null);
});

test('blocks a stale catalog card if the assignment was revoked before starting', () => {
  const context = createStudentView({
    quizzes: [
      { id: 'quiz_1', title: 'Đề Toán', topic: 'Toán', difficulty: 'Easy', assignedStudentIds: ['student_1'] }
    ]
  });
  context.window.LocalStorageDB.read().quizzes[0].assignedStudentIds = ['student_2'];

  context.startQuizExecution('quiz_1');

  assert.equal(context.alerts.length, 1);
  assert.equal(context.alerts[0].title, 'Bạn chưa được giao đề này');
  assert.equal(context.window.AppState.currentQuiz, undefined);
});

test('blocks starts at or after the deadline while allowing a start before it', () => {
  const dueAt = '2026-10-22T12:00:00.000Z';
  const context = createStudentView({
    quizzes: [
      { id: 'quiz_1', title: 'Đề Toán', topic: 'Toán', assignedStudentIds: ['student_1'], dueAt }
    ]
  });

  assert.equal(
    context.getQuizStartStatus('quiz_1', 'student_1', Date.parse(dueAt) - 1).reason,
    null
  );
  assert.equal(
    context.getQuizStartStatus('quiz_1', 'student_1', Date.parse(dueAt)).reason,
    'deadline-passed'
  );
});

test('counts only saved attempts for the current student and quiz', () => {
  const context = createStudentView({
    quizzes: [
      { id: 'quiz_1', title: 'Đề Toán', assignedStudentIds: ['student_1'], maxAttempts: 2 }
    ],
    attempts: [
      { userId: 'student_1', quizId: 'quiz_1', completedAt: '2026-10-20T10:00:00.000Z' },
      { userId: 'student_1', quizId: 'quiz_other', completedAt: '2026-10-20T10:00:00.000Z' },
      { userId: 'student_2', quizId: 'quiz_1', completedAt: '2026-10-20T10:00:00.000Z' }
    ]
  });

  const status = context.getQuizStartStatus('quiz_1', 'student_1', Date.parse('2026-10-21T10:00:00.000Z'));
  assert.equal(status.reason, null);
  assert.equal(status.completedAttempts, 1);
});

test('formats displayed quiz attempt usage from saved attempts and the assigned student', () => {
  const context = createStudentView();
  const attempts = [
    { userId: 'student_1', quizId: 'quiz_1', completedAt: '2026-10-20T10:00:00.000Z' },
    { userId: 'student_1', quizId: 'quiz_1', completedAt: 'not-a-date' },
    { userId: 'student_2', quizId: 'quiz_1', completedAt: '2026-10-20T10:00:00.000Z' },
    { userId: 'student_1', quizId: 'quiz_other', completedAt: '2026-10-20T10:00:00.000Z' }
  ];

  assert.equal(context.formatQuizAttemptUsage({ id: 'quiz_1', maxAttempts: 2 }, 'student_1', attempts), '1/2 lượt');
  assert.equal(context.formatQuizAttemptUsage({ id: 'quiz_1', maxAttempts: 2 }, 'student_2', attempts), '1/2 lượt');
  assert.equal(context.formatQuizAttemptUsage({ id: 'quiz_1', maxAttempts: null }, 'student_1', attempts), 'Không giới hạn lượt');
  assert.equal(context.formatQuizAttemptUsage({ id: 'quiz_1', maxAttempts: 2 }, null, attempts), '—');
});

test('formats quiz deadlines as unlimited, remaining time, or expired', () => {
  const context = createStudentView();
  const now = Date.parse('2026-10-23T00:00:00.000Z');

  assert.equal(context.formatQuizDeadline(null, now), 'Không giới hạn');
  assert.equal(context.formatQuizDeadline('2026-10-24T02:00:00.000Z', now), 'Còn 1N 2H');
  assert.equal(context.formatQuizDeadline('2026-10-23T00:30:00.000Z', now), 'Còn 1H');
  assert.equal(context.formatQuizDeadline('2026-10-22T23:59:00.000Z', now), 'Đã hết hạn');
});

test('blocks starting after all allowed attempts have been saved', () => {
  const context = createStudentView({
    quizzes: [
      { id: 'quiz_1', title: 'Đề Toán', assignedStudentIds: ['student_1'], maxAttempts: 1 }
    ],
    attempts: [
      { userId: 'student_1', quizId: 'quiz_1', completedAt: '2026-10-20T10:00:00.000Z' }
    ]
  });

  const status = context.getQuizStartStatus('quiz_1', 'student_1', Date.parse('2026-10-21T10:00:00.000Z'));
  assert.equal(status.reason, 'attempts-exhausted');
  assert.equal(status.completedAttempts, 1);
});

test('rechecks current assignment and policies when a student confirms the mode', () => {
  const context = createStudentView({
    quizzes: [
      { id: 'quiz_1', title: 'Đề Toán', assignedStudentIds: ['student_1'], maxAttempts: 1 }
    ],
    attempts: [
      { userId: 'student_1', quizId: 'quiz_1', completedAt: '2026-10-20T10:00:00.000Z' }
    ]
  });

  context.initQuizWithMode(context.window.AppState.allQuizzes[0], 'EXAM');

  assert.equal(context.alerts[0].title, 'Bạn đã hết lượt làm đề này');
  assert.equal(context.window.AppState.currentQuiz, undefined);
});

test('starts timed quizzes directly in EXAM mode without a mode-selection dialog', () => {
  const context = createStudentView({
    quizzes: [
      {
        id: 'quiz_1',
        title: 'Đề Toán',
        timeLimit: 12,
        assignedStudentIds: ['student_1']
      }
    ]
  });

  context.startQuizExecution('quiz_1');

  assert.equal(context.window.AppState.currentQuiz.id, 'quiz_1');
  assert.equal(context.window.AppState.quizMode, 'EXAM');
  assert.equal(context.timerStarts.length, 1);
  assert.equal(context.timerStarts[0][0], 12 * 60);
  assert.equal(context.alerts.length, 0);
});

test('forces timed quizzes into EXAM mode even if initialization requests PRACTICE', () => {
  const context = createStudentView({
    quizzes: [
      {
        id: 'quiz_1',
        title: 'Đề Toán',
        timeLimit: 8,
        assignedStudentIds: ['student_1']
      }
    ]
  });

  context.initQuizWithMode(context.window.AppState.allQuizzes[0], 'PRACTICE');

  assert.equal(context.window.AppState.quizMode, 'EXAM');
  assert.equal(context.timerStarts.length, 1);
  assert.equal(context.timerStarts[0][0], 8 * 60);
});
