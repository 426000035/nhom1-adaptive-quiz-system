const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const stateSource = fs.readFileSync(
  path.join(__dirname, '..', 'js', 'core', 'state.js'),
  'utf8'
);
const modalSource = fs.readFileSync(
  path.join(__dirname, '..', 'views', 'shared', 'modals.html'),
  'utf8'
);
const coreSource = fs.readFileSync(
  path.join(__dirname, '..', 'js', 'features', 'admin', 'admin-core.js'),
  'utf8'
);
const quizzesSource = fs.readFileSync(
  path.join(__dirname, '..', 'js', 'features', 'admin', 'admin-quizzes.js'),
  'utf8'
);

function createQuizFormModule() {
  const elements = new Map();
  const getElement = id => {
    if (!elements.has(id)) {
      elements.set(id, {
        value: '',
        checked: false,
        addEventListener(eventName, callback) {
          this.listeners ||= {};
          this.listeners[eventName] = callback;
        },
        classList: { add() {}, remove() {} },
        setAttribute() {},
        replaceChildren() {}
      });
    }
    return elements.get(id);
  };
  const savedQuizzes = [];
  let saveCount = 0;
  const context = {
    Set,
    Array,
    String,
    Number,
    Math,
    parseInt,
    document: { getElementById: getElement },
    window: {
      AppState: { allQuizzes: savedQuizzes, listsState: { adminQuizzes: {} } },
      AdminCatalogs: {
        getActiveCatalogs: async () => ({
          subjects: [{ subjectId: 'subject_math', name: 'Toán', status: 'active' }],
          difficulties: []
        })
      }
    },
    bindListEvents() {},
    getAssignedStudentIdsFromForm: () => [],
    updateQuizAssignmentSelectionSummary() {},
    populateQuizPolicyFields() {},
    saveQuizzesAndQuestionsToStorage() {
      saveCount++;
    },
    renderAdminQuizzesTable() {},
    Swal: { fire() {} }
  };
  vm.createContext(context);
  vm.runInContext(quizzesSource, context);
  context.renderAdminQuizzesTable = () => {};

  getElement('quiz-form-id').value = '';
  getElement('quiz-form-title-input').value = 'Đề Toán';
  getElement('quiz-form-topic-select').value = 'subject_math';
  getElement('quiz-form-time-input').value = '10';
  getElement('quiz-form-unlimited-attempts').checked = true;
  getElement('quiz-form-max-attempts-input').value = '1';
  getElement('quiz-form-has-deadline').checked = false;
  getElement('quiz-form-due-at').value = '';
  getElement('quiz-form-score-policy').value = 'highest';

  context.bindAdminQuizzesEvents();
  return {
    context,
    elements,
    savedQuizzes,
    get saveCount() {
      return saveCount;
    }
  };
}

test('quiz form omits manual difficulty while the question form retains question difficulty', () => {
  assert.equal(modalSource.includes('id="quiz-form-diff-select"'), false);
  assert.equal(modalSource.includes('id="q-form-difficulty"'), true);
  assert.equal(coreSource.includes('quiz-form-diff-select'), false);
});

test('creates a quiz without requiring or assigning a manually selected difficulty', async () => {
  const module = createQuizFormModule();
  const submit = module.elements.get('form-manage-quiz').listeners.submit;
  assert.equal(typeof submit, 'function');

  await submit({ preventDefault() {} });

  assert.equal(module.savedQuizzes.length, 1);
  assert.equal(module.savedQuizzes[0].title, 'Đề Toán');
  assert.equal(module.savedQuizzes[0].subjectId, 'subject_math');
  assert.equal(Object.hasOwn(module.savedQuizzes[0], 'difficulty'), false);
  assert.equal(Object.hasOwn(module.savedQuizzes[0], 'difficultyId'), false);
  assert.equal(module.saveCount, 1);
});

test('opens an existing quiz in the edit form with its assignment and policy fields', async () => {
  const module = createQuizFormModule();
  const quiz = {
    id: 'quiz-random',
    title: 'Đề ngẫu nhiên',
    subjectId: 'subject_math',
    topic: 'Toán',
    timeLimit: 20,
    assignedStudentIds: ['student-1'],
    maxAttempts: 3,
    scorePolicy: 'average',
    dueAt: '2026-10-30T10:00:00.000Z'
  };
  let selectedSubject;
  module.context.populateQuizModalSelects = async (subjectId, topic) => {
    selectedSubject = [subjectId, topic];
  };
  module.context.updateQuizAssignmentSelectionSummary = () => {};

  const opened = await module.context.openQuizEditModal(quiz, 'Hoàn Thiện Thông Tin Đề Ngẫu Nhiên');

  assert.equal(opened, true);
  assert.deepEqual(selectedSubject, ['subject_math', 'Toán']);
  assert.equal(module.elements.get('quiz-form-id').value, 'quiz-random');
  assert.equal(module.elements.get('quiz-form-title-input').value, 'Đề ngẫu nhiên');
  assert.equal(module.elements.get('quiz-form-time-input').value, 20);
  assert.equal(module.elements.get('quiz-form-unlimited-attempts').checked, false);
  assert.equal(module.elements.get('quiz-form-max-attempts-input').value, '3');
  assert.equal(module.elements.get('quiz-form-score-policy').value, 'average');
  assert.equal(module.elements.get('quiz-form-has-deadline').checked, true);
  assert.equal(module.elements.get('modal-quiz-title').textContent, 'Hoàn Thiện Thông Tin Đề Ngẫu Nhiên');
});

test('admin quiz difficulty filter matches the calculated average difficulty label', () => {
  const { filterAdminQuizzes } = createQuizFormModule().context;
  const quizzes = [
    { title: 'Phân số', topic: 'Toán', difficulty: 'Medium' },
    { title: 'Phép cộng', topic: 'Toán', difficulty: 'Easy' },
    { title: 'Khoa học', topic: 'Khoa học', difficulty: 'Hard' },
    { title: 'Đề đang soạn', topic: 'Toán', questions: [] }
  ];

  assert.deepEqual(
    Array.from(filterAdminQuizzes(quizzes, { difficulty: 'Medium' }), quiz => quiz.title),
    ['Phân số']
  );
  assert.deepEqual(
    Array.from(filterAdminQuizzes(quizzes, { topic: 'Toán', difficulty: 'ALL' }), quiz => quiz.title),
    ['Phân số', 'Phép cộng', 'Đề đang soạn']
  );
});

test('difficulty filter options include current catalog labels in admin and student lists', () => {
  const selects = new Map();
  const getElementById = id => {
    if (!selects.has(id)) {
      selects.set(id, {
        value: 'ALL',
        options: [],
        replaceChildren() {
          this.options = [];
        },
        appendChild(option) {
          this.options.push(option);
        }
      });
    }
    return selects.get(id);
  };
  const createElement = () => ({ value: '', textContent: '' });
  const context = {
    window: {
      AppStorageKeys: { quizzes: '', questions: '', settings: '' }
    },
    document: { getElementById, createElement },
    localStorage: { getItem() {}, setItem() {}, removeItem() {} },
    Map,
    Array,
    String
  };
  vm.createContext(context);
  vm.runInContext(stateSource, context);
  context.window.AppState.settings = {
    topics: ['Toán'],
    difficulties: ['Easy', 'Medium', 'Khá khó']
  };
  context.updateFilterOptionsUI();

  for (const id of ['filter-difficulty', 'filter-difficulty-admin-quizzes']) {
    assert.deepEqual(
      Array.from(selects.get(id).options, option => [option.value, option.textContent]),
      [
        ['ALL', 'Tất cả Độ khó'],
        ['Easy', 'Easy'],
        ['Medium', 'Medium'],
        ['Khá khó', 'Khá khó']
      ]
    );
  }
});
