const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const databaseSource = fs.readFileSync(
  path.join(__dirname, '..', 'js', 'services', 'local-storage-db.js'),
  'utf8'
);
const stateSource = fs.readFileSync(
  path.join(__dirname, '..', 'js', 'core', 'state.js'),
  'utf8'
);

function createContext() {
  const values = new Map();
  const storage = {
    getItem: key => values.has(key) ? values.get(key) : null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: key => values.delete(key)
  };
  const loggedErrors = [];
  const context = {
    console: {
      ...console,
      error: (...args) => loggedErrors.push(args)
    },
    localStorage: storage,
    fetch: async () => { throw new Error('Unexpected fetch'); },
    document: { getElementById: () => null },
    window: { localStorage: storage }
  };
  vm.createContext(context);
  vm.runInContext(databaseSource, context);
  vm.runInContext(stateSource, context);

  const database = context.window.LocalStorageDB.createEmptyDatabase();
  database.users.push({
    userId: 'student_demo',
    username: 'student_demo',
    password: '123',
    fullName: 'Học viên demo',
    nickname: '',
    avatar: 'seedling',
    birthDate: '',
    phone: '',
    role: 'student',
    status: 'active',
    classIds: []
  });
  database.subjects.push({ subjectId: 'subject_math', name: 'Toán', status: 'active' });
  database.skills.push({ skillId: 'skill_algebra', subjectId: 'subject_math', name: 'Đại số', status: 'active' });
  database.difficulties.push(
    { difficultyId: 'difficulty_easy', label: 'Easy', rank: 1, status: 'active' },
    { difficultyId: 'difficulty_medium', label: 'Medium', rank: 2, status: 'active' },
    { difficultyId: 'difficulty_hard', label: 'Hard', rank: 3, status: 'active' }
  );
  context.window.LocalStorageDB.write(database);
  return { context, storage, loggedErrors };
}

function legacyQuestion(id, overrides = {}) {
  return {
    id,
    topic: 'Toán',
    subTopic: 'Số học',
    difficulty: 'Easy',
    type: 'single',
    question: `${id}: 1 + 1 bằng bao nhiêu?`,
    options: ['2', '3', '', ''],
    correctAnswer: [0],
    explanation: 'Giải thích mẫu',
    remediation: { concept: 'Cộng số tự nhiên' },
    ...overrides
  };
}

test('imports existing quiz and question caches into the database before removing legacy keys', async () => {
  const { context, storage } = createContext();
  const createdAt = '2026-10-22T10:00:00.000Z';
  const firstQuestion = legacyQuestion('question_1', { createdAt });
  const hardQuestion = legacyQuestion('question_hard', { difficulty: 'Hard' });
  const bankOnlyQuestion = legacyQuestion('question_bank_only', {
    question: 'Câu hỏi chỉ có trong ngân hàng'
  });
  storage.setItem('adaptive_quiz_quizzes', JSON.stringify([
    {
      id: 'quiz_legacy_1',
      title: 'Đề cũ',
      topic: 'Toán',
      difficulty: 'Hard',
      timeLimit: 12,
      createdAt,
      questions: [firstQuestion, hardQuestion]
    },
    {
      id: 'quiz_empty',
      title: 'Đề đang soạn',
      topic: 'Toán',
      difficulty: 'Medium',
      timeLimit: 10,
      questions: []
    }
  ]));
  storage.setItem('adaptive_quiz_questions', JSON.stringify([firstQuestion, hardQuestion, bankOnlyQuestion]));

  await context.loadQuestionsData();

  const database = context.window.LocalStorageDB.read();
  assert.equal(database.questions.length, 3);
  assert.equal(database.quizzes.length, 2);
  assert.equal(database.quizzes[0].quizId, 'quiz_legacy_1');
  assert.deepEqual(Array.from(database.quizzes[0].questionIds), ['question_1', 'question_hard']);
  assert.equal(database.quizzes[0].difficultyId, 'difficulty_medium');
  assert.equal(database.quizzes[1].questionIds.length, 0);
  assert.equal(Object.hasOwn(database.quizzes[1], 'difficultyId'), false);
  assert.equal(database.questions[0].options.length, 2);
  assert.equal(database.questions[0].createdAt, createdAt);
  assert.equal(database.quizzes[0].createdAt, createdAt);
  assert.deepEqual(Array.from(database.questions[0].correctOptionIds), ['option_question_1_1']);
  assert.deepEqual(JSON.parse(JSON.stringify(database.questions[0].remediation)), { concept: 'Cộng số tự nhiên' });
  assert.equal(context.window.AppState.allQuestions.length, 3);
  assert.equal(context.window.AppState.allQuizzes[0].difficulty, 'Medium');
  assert.equal(context.window.AppState.allQuizzes[0].createdAt, createdAt);
  assert.equal(Object.hasOwn(context.window.AppState.allQuizzes[1], 'difficulty'), false);
  assert.equal(storage.getItem('adaptive_quiz_quizzes'), null);
  assert.equal(storage.getItem('adaptive_quiz_questions'), null);
  assert.equal(context.window.LocalStorageDB.validate(database), true);
});

test('does not remove the old caches or replace database records when import fails', async () => {
  const { context, storage, loggedErrors } = createContext();
  const invalidCaches = JSON.stringify([legacyQuestion('invalid_question', { difficulty: 'Unknown' })]);
  storage.setItem('adaptive_quiz_questions', invalidCaches);
  storage.setItem('adaptive_quiz_quizzes', JSON.stringify([]));

  await context.loadQuestionsData();

  assert.equal(storage.getItem('adaptive_quiz_questions'), invalidCaches);
  assert.equal(storage.getItem('adaptive_quiz_quizzes'), '[]');
  assert.equal(context.window.LocalStorageDB.read().questions.length, 0);
  assert.equal(loggedErrors.length, 1);
});

test('loads quiz data from database after legacy caches have been migrated', async () => {
  const { context, storage } = createContext();
  storage.setItem('adaptive_quiz_questions', JSON.stringify([legacyQuestion('question_1')]));
  storage.setItem('adaptive_quiz_quizzes', JSON.stringify([{
    id: 'quiz_1',
    title: 'Đề Toán',
    topic: 'Toán',
    difficulty: 'Easy',
    timeLimit: 15,
    questions: [legacyQuestion('question_1')]
  }]));
  await context.loadQuestionsData();

  await context.loadQuestionsData();
  assert.equal(context.window.AppState.allQuizzes[0].id, 'quiz_1');
  assert.equal(context.window.AppState.allQuizzes[0].questions[0].id, 'question_1');
  assert.equal(context.window.AppState.allQuizzes[0].difficulty, 'Easy');
  assert.deepEqual(
    JSON.parse(JSON.stringify(context.window.AppState.allQuizzes[0].generationSpec)),
    { skill_algebra: 1 }
  );
  assert.deepEqual(Array.from(context.window.AppState.allQuizzes[0].assignedStudentIds), []);
  assert.equal(context.window.AppState.allQuizzes[0].maxAttempts, null);
  assert.equal(context.window.AppState.allQuizzes[0].scorePolicy, 'highest');
  assert.equal(context.window.AppState.allQuizzes[0].dueAt, null);

  Object.assign(context.window.AppState.allQuizzes[0], {
    generationSpec: { skill_algebra: 1 },
    assignedStudentIds: ['student_demo'],
    maxAttempts: 4,
    scorePolicy: 'latest',
    dueAt: '2026-10-22T12:00:00Z'
  });
  context.saveQuizzesAndQuestionsToStorage();
  const persistedQuiz = context.window.LocalStorageDB.read().quizzes[0];
  assert.equal(persistedQuiz.difficultyId, 'difficulty_easy');
  assert.deepEqual(JSON.parse(JSON.stringify(persistedQuiz.generationSpec)), { skill_algebra: 1 });
  assert.deepEqual(Array.from(persistedQuiz.assignedStudentIds), ['student_demo']);
  assert.equal(persistedQuiz.maxAttempts, 4);
  assert.equal(persistedQuiz.scorePolicy, 'latest');
  assert.equal(persistedQuiz.dueAt, '2026-10-22T12:00:00Z');

  await context.loadQuestionsData();
  const reloadedQuiz = context.window.AppState.allQuizzes[0];
  assert.deepEqual(JSON.parse(JSON.stringify(reloadedQuiz.generationSpec)), { skill_algebra: 1 });
  assert.deepEqual(Array.from(reloadedQuiz.assignedStudentIds), ['student_demo']);
  assert.equal(reloadedQuiz.maxAttempts, 4);
  assert.equal(reloadedQuiz.scorePolicy, 'latest');
  assert.equal(reloadedQuiz.dueAt, '2026-10-22T12:00:00Z');

  const quizQuestion = reloadedQuiz.questions[0];
  Object.assign(quizQuestion, {
    difficulty: 'Hard',
    difficultyId: 'difficulty_hard',
    difficultyRank: 3
  });
  context.window.AppState.allQuestions[0] = { ...quizQuestion };
  context.saveQuizzesAndQuestionsToStorage();
  assert.equal(context.window.AppState.allQuizzes[0].difficulty, 'Hard');
  assert.equal(context.window.LocalStorageDB.read().quizzes[0].difficultyId, 'difficulty_hard');

  reloadedQuiz.questions = [];
  context.updateQuizGenerationSpec(reloadedQuiz);
  context.saveQuizzesAndQuestionsToStorage();
  assert.equal(Object.hasOwn(reloadedQuiz, 'difficulty'), false);
  assert.equal(
    Object.hasOwn(context.window.LocalStorageDB.read().quizzes.find(quiz => quiz.quizId === 'quiz_1'), 'difficultyId'),
    false
  );

  context.window.AppState.allQuizzes.push({
    id: 'quiz_new_empty',
    title: 'Đề mới',
    topic: 'Toán',
    subjectId: 'subject_math',
    difficulty: 'Medium',
    difficultyId: 'difficulty_medium',
    timeLimit: 15,
    questions: []
  });
  context.saveQuizzesAndQuestionsToStorage();
  const newEmptyQuiz = context.window.LocalStorageDB.read().quizzes.find(quiz => quiz.quizId === 'quiz_new_empty');
  assert.ok(newEmptyQuiz);
  assert.equal(Object.hasOwn(newEmptyQuiz, 'difficultyId'), false);
});

test('persists and reloads multiple-answer questions with more than four options', async () => {
  const { context } = createContext();
  const question = legacyQuestion('question_many_options', {
    subjectId: 'subject_math',
    skillId: 'skill_algebra',
    difficultyId: 'difficulty_easy',
    type: 'multiple',
    options: ['A', 'B', 'C', 'D', 'E', 'F', 'G'],
    correctAnswer: [0, 3, 6]
  });
  context.window.AppState.allQuestions = [question];
  context.window.AppState.allQuizzes = [{
    id: 'quiz_many_options',
    title: 'Đề nhiều lựa chọn',
    topic: 'Toán',
    subjectId: 'subject_math',
    difficulty: 'Easy',
    difficultyId: 'difficulty_easy',
    timeLimit: 15,
    questions: [question]
  }];

  context.saveQuizzesAndQuestionsToStorage();
  const databaseQuestion = context.window.LocalStorageDB.read().questions[0];

  assert.equal(databaseQuestion.type, 'multiple');
  assert.equal(databaseQuestion.options.length, 7);
  assert.deepEqual(
    Array.from(databaseQuestion.correctOptionIds),
    ['option_question_many_options_1', 'option_question_many_options_4', 'option_question_many_options_7']
  );

  await context.loadQuestionsData();
  const reloadedQuestion = context.window.AppState.allQuizzes[0].questions[0];
  assert.equal(reloadedQuestion.type, 'multiple');
  assert.deepEqual(Array.from(reloadedQuestion.options), ['A', 'B', 'C', 'D', 'E', 'F', 'G']);
  assert.deepEqual(Array.from(reloadedQuestion.correctAnswer), [0, 3, 6]);
});

test('rejects malformed assignment data instead of silently resetting it', async () => {
  const { context, storage, loggedErrors } = createContext();
  storage.setItem('adaptive_quiz_questions', JSON.stringify([legacyQuestion('question_1')]));
  storage.setItem('adaptive_quiz_quizzes', JSON.stringify([{
    id: 'quiz_invalid_assignment',
    title: 'Đề có giao học sinh sai định dạng',
    topic: 'Toán',
    difficulty: 'Easy',
    timeLimit: 15,
    assignedStudentIds: 'student_demo',
    questions: [legacyQuestion('question_1')]
  }]));

  await context.loadQuestionsData();

  assert.equal(context.window.LocalStorageDB.read().quizzes.length, 0);
  assert.notEqual(storage.getItem('adaptive_quiz_quizzes'), null);
  assert.equal(loggedErrors.length, 1);
});
