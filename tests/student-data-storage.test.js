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
const historySource = fs.readFileSync(
  path.join(__dirname, '..', 'js', 'features', 'student', 'student-history.js'),
  'utf8'
);

function createContext() {
  const values = new Map();
  let failDatabaseWrite = false;
  const storage = {
    getItem(key) {
      return values.has(key) ? values.get(key) : null;
    },
    setItem(key, value) {
      if (key === 'adaptive_quiz_demo_db' && failDatabaseWrite) {
        throw new Error('Simulated storage failure');
      }
      values.set(key, String(value));
    },
    removeItem(key) {
      values.delete(key);
    }
  };
  const user = {
    userId: 'user_student',
    username: 'user_student',
    fullName: 'Học viên Demo',
    role: 'student',
    status: 'active'
  };
  const context = {
    console: { ...console, error() {}, warn() {} },
    localStorage: storage,
    window: {
      localStorage: storage,
      AppState: { currentUser: user },
      Auth: { getCurrentUser: () => user }
    },
    document: { getElementById: () => null },
    Date,
    Math,
    Set,
    Map
  };
  vm.createContext(context);
  vm.runInContext(databaseSource, context);
  vm.runInContext(stateSource, context);
  vm.runInContext(historySource, context);

  const database = context.window.LocalStorageDB.createEmptyDatabase();
  database.users.push({
    userId: user.userId,
    username: user.username,
    password: '123',
    fullName: user.fullName,
    nickname: '',
    avatar: 'seedling',
    birthDate: '',
    phone: '',
    role: 'student',
    status: 'active',
    classIds: []
  });
  context.window.LocalStorageDB.write(database);
  return {
    context,
    storage,
    user,
    setFailDatabaseWrite(value) {
      failDatabaseWrite = value;
    }
  };
}

function historyRecord(overrides = {}) {
  const completedAt = '2026-10-22T00:00:00.000Z';
  return {
    attemptId: 'attempt_legacy_1',
    quizId: null,
    timestamp: '22/10/2026 07:00:00',
    completedAt,
    username: 'Học viên Demo',
    ownerUsername: 'user_student',
    quizTitle: 'Đề thử',
    topic: 'Toán',
    score: 10,
    correctCount: 1,
    totalQuestions: 1,
    mode: 'EXAM',
    questions: [{
      id: 'question_1',
      topic: 'Toán',
      question: '1 + 1 bằng bao nhiêu?',
      options: ['2', '3', '', ''],
      correctAnswer: [0],
      explanation: 'Cộng hai số.',
      remediation: { concept: 'Phép cộng' }
    }],
    answers: { question_1: [0] },
    ...overrides
  };
}

test('migrates legacy gamification and mascot values into one studentProgress record', () => {
  const { context, storage } = createContext();
  const gamificationKey = 'adaptive_quiz_student_user_student_gamification';
  const mascotKey = 'adaptive_quiz_student_user_student_mascot';
  storage.setItem(gamificationKey, JSON.stringify({
    treeStage: 2,
    currentExp: 40,
    streakCount: 3,
    lastActiveDate: '22/10/2026'
  }));
  storage.setItem(mascotKey, JSON.stringify({
    waterProgress: 4,
    fullBucketCount: 2,
    bucketsWatered: 1
  }));

  assert.equal(context.window.StudentDataStorage.read('gamification', 'student_gamification_data', {}).currentExp, 40);
  assert.equal(context.window.StudentDataStorage.read('mascot', 'student_mascot_data', {}).waterProgress, 4);
  const database = context.window.LocalStorageDB.read();
  assert.equal(database.studentProgress.length, 1);
  assert.deepEqual(JSON.parse(JSON.stringify(database.studentProgress[0])), {
    userId: 'user_student',
    currentExp: 40,
    treeStage: 2,
    streakCount: 3,
    lastActiveDate: '22/10/2026',
    waterProgress: 4,
    fullBucketCount: 2,
    bucketsWatered: 1
  });
  assert.equal(storage.getItem(gamificationKey), null);
  assert.equal(storage.getItem(mascotKey), null);
});

test('keeps legacy progress intact when the database write fails', () => {
  const { context, storage, setFailDatabaseWrite } = createContext();
  const key = 'adaptive_quiz_student_user_student_gamification';
  const legacyProgress = JSON.stringify({
    treeStage: 3,
    currentExp: 20,
    streakCount: 5,
    lastActiveDate: '22/10/2026'
  });
  storage.setItem(key, legacyProgress);
  setFailDatabaseWrite(true);

  context.window.StudentDataStorage.read('gamification', 'student_gamification_data', {});

  assert.equal(storage.getItem(key), legacyProgress);
  assert.equal(context.window.LocalStorageDB.read().studentProgress.length, 0);
});

test('merges untouched legacy values when progress is written before it is read', () => {
  const { context, storage } = createContext();
  const key = 'adaptive_quiz_student_user_student_gamification';
  storage.setItem(key, JSON.stringify({
    treeStage: 3,
    currentExp: 20,
    streakCount: 5,
    lastActiveDate: '22/10/2026'
  }));

  context.window.StudentDataStorage.write('gamification', { currentExp: 35 });

  const progress = context.window.LocalStorageDB.read().studentProgress[0];
  assert.equal(progress.treeStage, 3);
  assert.equal(progress.currentExp, 35);
  assert.equal(progress.streakCount, 5);
  assert.equal(storage.getItem(key), null);
});

test('imports complete attempt history, preserves unconvertible records, and avoids duplicates', () => {
  const { context, storage } = createContext();
  const migratable = historyRecord({ ownerUsername: 'legacy-user-name' });
  const unresolved = historyRecord({
    attemptId: 'attempt_without_snapshot',
    questions: undefined,
    answers: undefined
  });
  storage.setItem('quiz_history_all', JSON.stringify([migratable, unresolved]));

  const firstRead = context.window.QuizHistoryStorage.readAll();
  const database = context.window.LocalStorageDB.read();
  assert.equal(database.attempts.length, 1);
  assert.equal(database.attempts[0].attemptId, 'attempt_legacy_1');
  assert.equal(database.attempts[0].ownerUsername, 'user_student');
  assert.equal(database.attempts[0].startedAt, database.attempts[0].completedAt);
  assert.equal(database.attempts[0].items[0].isCorrect, true);
  assert.equal(firstRead.length, 2);
  assert.equal(JSON.parse(storage.getItem('quiz_history_all')).length, 1);
  assert.equal(firstRead[0].attemptId, 'attempt_legacy_1');
  assert.deepEqual(JSON.parse(JSON.stringify(firstRead[0].answers)), { question_1: [0] });
  assert.deepEqual(JSON.parse(JSON.stringify(firstRead[0].questions[0].options)), ['2', '3', '', '']);
  assert.deepEqual(JSON.parse(JSON.stringify(firstRead[0].questions[0].remediation)), { concept: 'Phép cộng' });

  context.window.QuizHistoryStorage.readAll();
  assert.equal(context.window.LocalStorageDB.read().attempts.length, 1);
});

test('preserves the full legacy history when importing attempts fails', () => {
  const { context, storage, setFailDatabaseWrite } = createContext();
  const legacyHistory = JSON.stringify([historyRecord()]);
  storage.setItem('quiz_history_all', legacyHistory);
  setFailDatabaseWrite(true);

  const history = context.window.QuizHistoryStorage.readAll();

  assert.equal(storage.getItem('quiz_history_all'), legacyHistory);
  assert.equal(context.window.LocalStorageDB.read().attempts.length, 0);
  assert.equal(history[0].attemptId, 'attempt_legacy_1');
});

test('saves new attempts in the database and returns their review snapshots', () => {
  const { context } = createContext();

  context.window.QuizHistoryStorage.save(historyRecord({ attemptId: 'attempt_new' }));

  const database = context.window.LocalStorageDB.read();
  assert.equal(database.attempts.length, 1);
  assert.equal(database.attempts[0].userId, 'user_student');
  const history = context.window.QuizHistoryStorage.readAll();
  assert.equal(history[0].attemptId, 'attempt_new');
  assert.equal(history[0].questions[0].question, '1 + 1 bằng bao nhiêu?');
  assert.deepEqual(JSON.parse(JSON.stringify(history[0].answers)), { question_1: [0] });
});
