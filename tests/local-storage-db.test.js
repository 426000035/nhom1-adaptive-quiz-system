const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const moduleSource = fs.readFileSync(
  path.join(__dirname, '..', 'js', 'services', 'local-storage-db.js'),
  'utf8'
);

function createStorage(initialValues = new Map()) {
  return {
    values: initialValues,
    getItem(key) {
      return this.values.has(key) ? this.values.get(key) : null;
    },
    setItem(key, value) {
      this.values.set(key, String(value));
    },
    removeItem(key) {
      this.values.delete(key);
    }
  };
}

function createDatabaseApi(storage = createStorage(), fetchImpl = async () => {
  throw new Error('Unexpected fetch');
}) {
  const context = { window: { localStorage: storage }, fetch: fetchImpl };
  vm.createContext(context);
  vm.runInContext(moduleSource, context);
  return { api: context.window.LocalStorageDB, storage };
}

function createValidDatabase(api) {
  const database = api.createEmptyDatabase();
  database.users.push({
    userId: 'user_student',
    username: 'user_student',
    password: '123',
    fullName: 'Học viên Demo',
    nickname: '',
    avatar: 'seedling',
    birthDate: '',
    phone: '',
    role: 'student',
    status: 'active',
    classIds: []
  });
  database.subjects.push({
    subjectId: 'subject_math',
    name: 'Toán học',
    status: 'active'
  });
  database.skills.push({
    skillId: 'skill_algebra',
    subjectId: 'subject_math',
    name: 'Đại số',
    status: 'active'
  });
  database.difficulties.push({
    difficultyId: 'difficulty_easy',
    label: 'Easy',
    rank: 1,
    status: 'active'
  });
  database.questions.push({
    questionId: 'question_1',
    subjectId: 'subject_math',
    skillId: 'skill_algebra',
    difficultyId: 'difficulty_easy',
    type: 'single',
    content: '1 + 1 bằng bao nhiêu?',
    options: [
      { optionId: 'option_a', content: '2' },
      { optionId: 'option_b', content: '3' }
    ],
    correctOptionIds: ['option_a'],
    status: 'active'
  });
  database.quizzes.push({
    quizId: 'quiz_math',
    subjectId: 'subject_math',
    title: 'Đề Toán',
    timeLimitMinutes: 15,
    status: 'active',
    questionIds: ['question_1'],
    generationSpec: { skill_algebra: 1 }
  });
  database.attempts.push({
    attemptId: 'attempt_1',
    userId: 'user_student',
    quizId: 'quiz_math',
    mode: 'EXAM',
    startedAt: '2026-10-22T00:00:00.000Z',
    completedAt: '2026-10-22T00:01:00.000Z',
    score: 10,
    correctCount: 1,
    totalQuestions: 1,
    items: [{
      questionId: 'question_1',
      questionSnapshot: { content: '1 + 1 bằng bao nhiêu?' },
      optionsSnapshot: [
        { optionId: 'option_a', content: '2' },
        { optionId: 'option_b', content: '3' }
      ],
      correctOptionIdsSnapshot: ['option_a'],
      selectedOptionIds: ['option_a'],
      isCorrect: true,
      skillIdSnapshot: 'skill_algebra',
      difficultyRankSnapshot: 1
    }]
  });
  database.studentProgress.push({
    userId: 'user_student',
    currentExp: 0,
    treeStage: 1,
    streakCount: 1,
    lastActiveDate: '2026-10-22',
    waterProgress: 0,
    fullBucketCount: 0,
    bucketsWatered: 0
  });
  return database;
}

test('returns an empty database without writing or importing sample data', () => {
  const { api, storage } = createDatabaseApi();
  assert.deepEqual(api.read(), api.createEmptyDatabase());
  assert.equal(storage.values.size, 0);
});

test('writes and reads a valid database, and update commits an isolated draft', () => {
  const { api } = createDatabaseApi();
  const database = createValidDatabase(api);
  api.write(database);
  database.users[0].fullName = 'Mutation after write';
  assert.equal(api.read().users[0].fullName, 'Học viên Demo');

  const updated = api.update(draft => {
    draft.users[0].fullName = 'Tên đã cập nhật';
  });
  assert.equal(updated.users[0].fullName, 'Tên đã cập nhật');
  assert.equal(api.read().users[0].fullName, 'Tên đã cập nhật');
});

test('does not commit an update when validation fails', () => {
  const { api } = createDatabaseApi();
  api.write(createValidDatabase(api));

  assert.throws(() => api.update(draft => {
    draft.quizzes[0].questionIds.push('question_missing');
  }), /tham chiếu câu hỏi không tồn tại/);
  assert.equal(JSON.stringify(api.read().quizzes[0].questionIds), '["question_1"]');
});

test('initializes the demo database from sample JSON and normalizes related records', async () => {
  const users = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'users.json'), 'utf8'));
  const questions = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'questions.json'), 'utf8'));
  const fetchImpl = async url => ({
    ok: true,
    status: 200,
    async json() {
      if (url === './data/users.json') return users;
      if (url === './data/questions.json') return questions;
      throw new Error(`Unexpected seed URL: ${url}`);
    }
  });
  const { api, storage } = createDatabaseApi(createStorage(), fetchImpl);
  const result = await api.initializeFromJson();

  assert.equal(result.initialized, true);
  assert.equal(result.database.users.length, 2);
  assert.equal(result.database.users.every(user => user.password === '123'), true);
  assert.equal(result.database.users.every(user => user.username === user.userId), true);
  assert.equal(result.database.subjects.length, 0);
  assert.equal(result.database.skills.length, 0);
  assert.equal(result.database.difficulties.length, 3);
  assert.equal(result.database.questions.length, 0);
  assert.equal(result.database.quizzes.length, 0);
  assert.ok(storage.getItem(api.storageKey));
});

test('imports the detailed demo pack additively and only once', async () => {
  const users = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'users.json'), 'utf8'));
  const questions = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'questions.json'), 'utf8'));
  const samplePack = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'demo-sample-pack.json'), 'utf8'));
  const fetchImpl = async url => ({
    ok: true,
    status: 200,
    async json() {
      if (url === './data/users.json') return users;
      if (url === './data/questions.json') return questions;
      if (url === './data/demo-sample-pack.json') return samplePack;
      throw new Error(`Unexpected seed URL: ${url}`);
    }
  });
  const { api, storage } = createDatabaseApi(createStorage(), fetchImpl);
  await api.initializeFromJson();
  storage.setItem(`${api.storageKey}_sample_pack_version`, '4');

  api.update(database => {
    database.classes.push({
      classId: 'class_math_3_a',
      name: 'Toán 3 - A (Demo)',
      status: 'active'
    });
    database.subjects.push({
      subjectId: 'subject_math_grade_3',
      name: 'Toán lớp 3 (Demo)',
      status: 'active'
    });
    database.classes.push({
      classId: 'class_custom',
      name: 'Lớp tùy chỉnh',
      status: 'active'
    });
    database.users.find(user => user.userId === 'usr_01').classIds = ['class_custom'];
    database.subjects.push({
      subjectId: 'subject_custom',
      name: 'Môn học do giáo viên tạo',
      status: 'active'
    });
    database.skills.push({
      skillId: 'skill_custom',
      subjectId: 'subject_custom',
      name: 'Kỹ năng cũ',
      status: 'active'
    });
    database.questions.push({
      questionId: 'question_custom',
      subjectId: 'subject_custom',
      skillId: 'skill_custom',
      difficultyId: 'difficulty_easy',
      type: 'single',
      content: 'Câu hỏi thuộc môn cũ?',
      options: [
        { optionId: 'option_custom_a', content: 'Đáp án A' },
        { optionId: 'option_custom_b', content: 'Đáp án B' }
      ],
      correctOptionIds: ['option_custom_a'],
      status: 'active'
    });
    database.quizzes.push({
      quizId: 'quiz_custom',
      subjectId: 'subject_custom',
      title: 'Đề môn cũ',
      timeLimitMinutes: 10,
      status: 'active',
      questionIds: ['question_custom']
    });
    database.studentProgress.push({
      userId: 'usr_01',
      currentExp: 99,
      treeStage: 3,
      streakCount: 4,
      lastActiveDate: '2026-01-01',
      waterProgress: 1,
      fullBucketCount: 2,
      bucketsWatered: 3
    });
  });

  const firstImport = await api.importDemoSamplePack();
  assert.equal(firstImport.imported, true);
  assert.equal(firstImport.database.subjects.length, 3);
  assert.equal(firstImport.database.skills.length, 15);
  assert.equal(firstImport.database.questions.length, 150);
  assert.equal(firstImport.database.quizzes.length, 20);
  assert.equal(firstImport.database.quizzes.find(quiz =>
    quiz.quizId === samplePack.quizzes[0].quizId
  ).title, samplePack.quizzes[0].title);
  assert.equal(firstImport.database.classes.length, 10);
  assert.equal(firstImport.database.classes.some(classRecord => classRecord.classId === 'class_custom'), true);
  assert.equal(firstImport.database.classes.find(classRecord =>
    classRecord.classId === 'class_math_3_a'
  ).name, 'Toán 3 - A (Demo)');
  assert.deepEqual(Array.from(firstImport.database.users.find(user => user.userId === 'usr_01').classIds), ['class_custom']);
  assert.equal(firstImport.database.users.filter(user => user.userId.startsWith('usr_math_demo_')).length, 50);
  assert.equal(firstImport.database.attempts.length, 500);
  assert.equal(firstImport.database.studentProgress.length, 2);
  assert.equal(firstImport.database.subjects.some(subject => subject.subjectId === 'subject_custom'), false);
  assert.equal(firstImport.database.subjects.find(subject =>
    subject.subjectId === 'subject_math_grade_3'
  ).name, 'Toán lớp 3 (Demo)');
  assert.equal(firstImport.database.skills.some(skill => skill.skillId === 'skill_custom'), false);
  assert.equal(firstImport.database.questions.some(question => question.questionId === 'question_custom'), false);
  assert.equal(firstImport.database.quizzes.some(quiz => quiz.quizId === 'quiz_custom'), false);
  assert.equal(firstImport.database.studentProgress[0].currentExp, 99);
  [3, 4, 5].forEach(grade => {
    const subject = firstImport.database.subjects.find(item => item.subjectId === `subject_math_grade_${grade}`);
    const questionsForGrade = firstImport.database.questions.filter(item => item.subjectId === subject.subjectId);
    const skillsForGrade = firstImport.database.skills.filter(item => item.subjectId === subject.subjectId);
    assert.equal(skillsForGrade.length, 5);
    assert.equal(questionsForGrade.length, 50);
    const quizzesForGrade = firstImport.database.quizzes.filter(item => item.subjectId === subject.subjectId);
    assert.ok([6, 7].includes(quizzesForGrade.length));
    quizzesForGrade.forEach(quiz => {
      assert.equal(quiz.questionIds.length, 10);
      assert.equal(
        quiz.assignedStudentIds.length,
        new Set(firstImport.database.attempts
          .filter(attempt => attempt.quizId === quiz.quizId)
          .map(attempt => attempt.userId)).size
      );
    });
    assert.deepEqual(
      [...new Set(questionsForGrade.map(question => question.options.length))].sort(),
      [2, 3, 4, 5]
    );
    assert.deepEqual(
      [...new Set(questionsForGrade.map(question => question.correctOptionIds.length))].sort(),
      [1, 2, 3]
    );
    questionsForGrade.forEach(question => {
      assert.equal(question.type === 'multiple', question.correctOptionIds.length > 1);
    });
  });
  const demoStudents = firstImport.database.users.filter(user => user.userId.startsWith('usr_math_demo_'));
  assert.equal(demoStudents.every(user => user.classIds.length === 1), true);
  assert.equal(new Set(demoStudents.map(user => user.username)).size, 50);
  assert.equal(firstImport.database.attempts.every(attempt => {
    const quiz = firstImport.database.quizzes.find(item => item.quizId === attempt.quizId);
    return quiz && quiz.assignedStudentIds.includes(attempt.userId);
  }), true);
  demoStudents.forEach(student => {
    const studentAttempts = firstImport.database.attempts.filter(attempt => attempt.userId === student.userId);
    assert.equal(studentAttempts.length, student.userId === 'usr_math_demo_001' ? 255 : 5);
  });
  const perfectStudentAttempts = firstImport.database.attempts.filter(attempt =>
    attempt.attemptId.startsWith('attempt_demo_perfect_usr_math_demo_001_')
  );
  assert.equal(perfectStudentAttempts.length, 250);
  assert.equal(perfectStudentAttempts.every(attempt =>
    attempt.score === 10 && attempt.correctCount === attempt.totalQuestions
  ), true);
  const perfectStudentProgress = firstImport.database.studentProgress.find(item =>
    item.userId === 'usr_math_demo_001'
  );
  assert.equal(perfectStudentProgress.fullBucketCount, 50);
  assert.equal(perfectStudentProgress.waterProgress, 0);
  assert.equal(firstImport.database.attempts.some(attempt =>
    attempt.correctCount > 0 && attempt.correctCount < attempt.totalQuestions
  ), true);
  assert.equal(firstImport.database.quizzes.filter(quiz => quiz.dueAt).length, 10);
  assert.equal(firstImport.database.quizzes.filter(quiz => !quiz.dueAt).length, 10);
  assert.deepEqual(
    [...new Set(firstImport.database.quizzes.map(quiz => quiz.timeLimitMinutes))].sort((a, b) => a - b),
    [15, 20, 30, 45, 60]
  );
  assert.deepEqual(
    [...new Set(firstImport.database.quizzes.map(quiz => quiz.maxAttempts))].sort((a, b) =>
      (a ?? Number.MAX_SAFE_INTEGER) - (b ?? Number.MAX_SAFE_INTEGER)
    ),
    [1, 3, null]
  );
  firstImport.database.classes.filter(classRecord => classRecord.classId.startsWith('class_math_')).forEach(classRecord => {
    const members = demoStudents.filter(student => student.classIds.includes(classRecord.classId));
    assert.ok(members.length >= 5 && members.length <= 6);
  });
  assert.ok(storage.getItem(`${api.storageKey}_sample_pack_version`));
  assert.equal(storage.getItem(`${api.storageKey}_sample_pack_version`), '7');

  storage.setItem(`${api.storageKey}_sample_pack_version`, '6');
  api.update(database => {
    database.quizzes.find(quiz => quiz.quizId === samplePack.quizzes[0].quizId).title =
      'To\u00c3\u00a1n l?p 3 - ?? luy?n t?p 01';
    database.attempts.find(attempt => attempt.quizId === samplePack.quizzes[0].quizId).quizTitle =
      'To\u00c3\u00a1n l?p 3 - ?? luy?n t?p 01';
  });
  const secondImport = await api.importDemoSamplePack();
  assert.equal(secondImport.imported, true);
  assert.equal(secondImport.database.quizzes.find(quiz =>
    quiz.quizId === samplePack.quizzes[0].quizId
  ).title, samplePack.quizzes[0].title);
  assert.equal(secondImport.database.attempts.find(attempt =>
    attempt.quizId === samplePack.quizzes[0].quizId
  ).quizTitle, samplePack.quizzes[0].title);
  assert.equal(secondImport.database.attempts.length, 500);
  assert.equal(secondImport.database.questions.length, 150);
  assert.equal(secondImport.database.users.filter(user => user.userId.startsWith('usr_math_demo_')).length, 50);
  const thirdImport = await api.importDemoSamplePack();
  assert.equal(thirdImport.imported, false);
});

test('seeds sample progress when the student has no saved progress', async () => {
  const users = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'users.json'), 'utf8'));
  const questions = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'questions.json'), 'utf8'));
  const samplePack = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'demo-sample-pack.json'), 'utf8'));
  const fetchImpl = async url => ({
    ok: true,
    status: 200,
    async json() {
      if (url === './data/users.json') return users;
      if (url === './data/questions.json') return questions;
      if (url === './data/demo-sample-pack.json') return samplePack;
      throw new Error(`Unexpected seed URL: ${url}`);
    }
  });
  const { api } = createDatabaseApi(createStorage(), fetchImpl);
  await api.initializeFromJson();

  const result = await api.importDemoSamplePack();
  assert.deepEqual(JSON.parse(JSON.stringify(result.database.studentProgress)), [
    {
      userId: 'usr_01',
      currentExp: 45,
      treeStage: 2,
      streakCount: 3,
      lastActiveDate: new Date().toISOString().slice(0, 10),
      waterProgress: 2,
      fullBucketCount: 1,
      bucketsWatered: 2
    },
    {
      userId: 'usr_math_demo_001',
      currentExp: 0,
      treeStage: 1,
      streakCount: 0,
      lastActiveDate: new Date().toISOString().slice(0, 10),
      waterProgress: 0,
      fullBucketCount: 50,
      bucketsWatered: 0
    }
  ]);
});

test('does not commit a detailed sample pack that fails database validation', async () => {
  const users = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'users.json'), 'utf8'));
  const questions = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'questions.json'), 'utf8'));
  const samplePack = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'demo-sample-pack.json'), 'utf8'));
  samplePack.questions[0].difficultyId = 'difficulty_missing';
  const fetchImpl = async url => ({
    ok: true,
    status: 200,
    async json() {
      if (url === './data/users.json') return users;
      if (url === './data/questions.json') return questions;
      if (url === './data/demo-sample-pack.json') return samplePack;
      throw new Error(`Unexpected seed URL: ${url}`);
    }
  });
  const { api, storage } = createDatabaseApi(createStorage(), fetchImpl);
  await api.initializeFromJson();
  const before = api.read();

  await assert.rejects(api.importDemoSamplePack(), /difficultyId không tham chiếu/);
  assert.equal(api.read().subjects.length, before.subjects.length);
  assert.equal(api.read().questions.length, before.questions.length);
  assert.equal(storage.getItem(`${api.storageKey}_sample_pack_version`), null);
});

test('does not fetch or replace sample data when a database already exists', async () => {
  const { api } = createDatabaseApi();
  const existing = createValidDatabase(api);
  api.write(existing);
  const result = await api.initializeFromJson();
  assert.equal(result.initialized, false);
  assert.equal(result.database.users[0].userId, 'user_student');
});

test('does not persist seed data when source JSON contains invalid answer references', async () => {
  const fetchImpl = async url => ({
    ok: true,
    status: 200,
    async json() {
      if (url === './data/users.json') {
        return [{ userId: 'user_admin', fullName: 'Admin', role: 'admin', status: 'active' }];
      }
      return [{
        id: 'q_invalid',
        topic: 'Math',
        difficulty: 'Easy',
        question: 'Question?',
        options: ['A', 'B'],
        correctAnswer: [2]
      }];
    }
  });
  const { api, storage } = createDatabaseApi(createStorage(), fetchImpl);
  await assert.rejects(api.initializeFromJson(), /correctAnswer chứa chỉ số phương án không hợp lệ/);
  assert.equal(storage.getItem(api.storageKey), null);
});

test('rejects unsupported versions, missing collections, and duplicate IDs', () => {
  const { api } = createDatabaseApi();
  const wrongVersion = api.createEmptyDatabase();
  wrongVersion.schemaVersion = 99;
  assert.throws(() => api.validate(wrongVersion), /không được hỗ trợ/);

  const missingCollection = api.createEmptyDatabase();
  delete missingCollection.attempts;
  assert.throws(() => api.validate(missingCollection), /attempts phải là một mảng/);

  const duplicateIds = api.createEmptyDatabase();
  duplicateIds.users.push(
    { userId: 'same', username: 'same', password: '123', fullName: 'A', nickname: '', avatar: 'seedling', birthDate: '', phone: '', role: 'student', status: 'active', classIds: [] },
    { userId: 'same', username: 'same2', password: '123', fullName: 'B', nickname: '', avatar: 'seedling', birthDate: '', phone: '', role: 'student', status: 'active', classIds: [] }
  );
  assert.throws(() => api.validate(duplicateIds), /ID bị trùng/);

  const invalidRecord = api.createEmptyDatabase();
  invalidRecord.users.push(null);
  assert.throws(() => api.validate(invalidRecord), /users\[0\] phải là một object/);
});

test('validates attempts, progress values, and demo account credentials', () => {
  const { api } = createDatabaseApi();
  const invalidAttempt = createValidDatabase(api);
  invalidAttempt.attempts[0].items[0].isCorrect = false;
  assert.throws(() => api.validate(invalidAttempt), /correctCount không khớp số item đúng/);

  const invalidProgress = createValidDatabase(api);
  invalidProgress.studentProgress[0].waterProgress = 5;
  assert.throws(() => api.validate(invalidProgress), /waterProgress phải là số nguyên từ 0 đến 4/);

  const duplicateUsername = createValidDatabase(api);
  duplicateUsername.users.push({
    ...duplicateUsername.users[0],
    userId: 'another_student',
    username: 'USER_STUDENT'
  });
  assert.throws(() => api.validate(duplicateUsername), /username phải có|Username bị trùng/);

  const missingPassword = createValidDatabase(api);
  missingPassword.users[0].password = '';
  assert.throws(() => api.validate(missingPassword), /password không được để trống/);
});

test('checks quiz generation specifications against actual questions by skill', () => {
  const { api } = createDatabaseApi();
  const countMismatch = createValidDatabase(api);
  countMismatch.quizzes[0].generationSpec.skill_algebra = 2;
  assert.throws(() => api.validate(countMismatch), /generationSpec không khớp tổng số câu hỏi/);
  assert.throws(() => api.validate(countMismatch), /generationSpec.skill_algebra không khớp số câu hỏi theo kỹ năng/);

  const skillMismatch = createValidDatabase(api);
  skillMismatch.skills.push({
    skillId: 'skill_geometry',
    subjectId: 'subject_math',
    name: 'Hình học',
    status: 'active'
  });
  skillMismatch.quizzes[0].generationSpec = { skill_geometry: 1 };
  assert.throws(() => api.validate(skillMismatch), /questionIds có câu hỏi ngoài generationSpec/);
});

test('validates quiz access and attempt policies while accepting legacy defaults', () => {
  const { api } = createDatabaseApi();
  const database = createValidDatabase(api);
  assert.equal(api.validate(database), true);

  const invalidAssignee = createValidDatabase(api);
  invalidAssignee.users.push({
    userId: 'user_admin',
    username: 'user_admin',
    password: '123',
    fullName: 'Giáo viên',
    nickname: '',
    avatar: 'seedling',
    role: 'admin',
    status: 'active'
  });
  invalidAssignee.quizzes[0].assignedStudentIds = ['user_admin'];
  assert.throws(() => api.validate(invalidAssignee), /assignedStudentIds tham chiếu học viên không hợp lệ/);

  const duplicateAssignees = createValidDatabase(api);
  duplicateAssignees.quizzes[0].assignedStudentIds = ['user_student', 'user_student'];
  assert.throws(() => api.validate(duplicateAssignees), /assignedStudentIds có userId bị trùng/);

  const invalidAttemptsLimit = createValidDatabase(api);
  invalidAttemptsLimit.quizzes[0].maxAttempts = 0;
  assert.throws(() => api.validate(invalidAttemptsLimit), /maxAttempts phải là null hoặc số nguyên dương/);

  const invalidScorePolicy = createValidDatabase(api);
  invalidScorePolicy.quizzes[0].scorePolicy = 'best';
  assert.throws(() => api.validate(invalidScorePolicy), /scorePolicy phải là highest, average hoặc latest/);

  const invalidDeadline = createValidDatabase(api);
  invalidDeadline.quizzes[0].dueAt = '2026-10-22';
  assert.throws(() => api.validate(invalidDeadline), /dueAt phải là null hoặc thời điểm ISO 8601 hợp lệ/);

  const validPolicies = createValidDatabase(api);
  validPolicies.quizzes[0].assignedStudentIds = ['user_student'];
  validPolicies.quizzes[0].maxAttempts = 3;
  validPolicies.quizzes[0].scorePolicy = 'average';
  validPolicies.quizzes[0].dueAt = '2026-10-22T12:00:00+07:00';
  assert.equal(api.validate(validPolicies), true);
});

test('checks attempt correctness against selected and correct answer snapshots', () => {
  const { api } = createDatabaseApi();
  const incorrectCorrectnessFlag = createValidDatabase(api);
  incorrectCorrectnessFlag.attempts[0].items[0].isCorrect = false;
  assert.throws(() => api.validate(incorrectCorrectnessFlag), /isCorrect không khớp các đáp án đã chọn/);

  const duplicateSelection = createValidDatabase(api);
  duplicateSelection.attempts[0].items[0].selectedOptionIds = ['option_a', 'option_a'];
  assert.throws(() => api.validate(duplicateSelection), /selectedOptionIds không được trùng ID/);

  const multiSelect = createValidDatabase(api);
  multiSelect.attempts[0].items[0].correctOptionIdsSnapshot = ['option_a', 'option_b'];
  assert.throws(() => api.validate(multiSelect), /isCorrect không khớp các đáp án đã chọn/);
});

test('preserves data with unsupported schema versions', () => {
  const { api, storage } = createDatabaseApi();
  const database = api.createEmptyDatabase();
  database.schemaVersion = 99;
  storage.setItem(api.storageKey, JSON.stringify(database));

  assert.throws(() => api.read(), /dữ liệu gốc được giữ nguyên/);
  assert.equal(JSON.parse(storage.getItem(api.storageKey)).schemaVersion, 99);
});

test('runs registered migrations and preserves the original database backup', () => {
  const { api, storage } = createDatabaseApi();
  const oldDatabase = createValidDatabase(api);
  oldDatabase.schemaVersion = 0;
  storage.setItem(api.storageKey, JSON.stringify(oldDatabase));
  api.registerMigration(0, database => ({ ...database, schemaVersion: 1 }));

  const migrated = api.read();
  assert.equal(migrated.schemaVersion, 5);
  assert.equal(migrated.users[0].userId, 'user_student');
  assert.deepEqual(Array.from(migrated.users[0].classIds), []);
  assert.deepEqual(Array.from(migrated.classes), []);
  assert.equal(migrated.users[0].username, 'user_student');
  assert.equal(migrated.users[0].password, '123');
  assert.equal(migrated.users[0].nickname, '');
  assert.equal(migrated.users[0].avatar, 'seedling');
  const backup = JSON.parse(storage.getItem(`${api.storageKey}_backup_v0`));
  assert.equal(backup.schemaVersion, 0);
  assert.equal(migrated.users[0].birthDate, '');
  assert.equal(JSON.parse(storage.getItem(api.storageKey)).schemaVersion, 5);
});

test('migrates version 1 databases to normalized student classes without losing users', () => {
  const { api, storage } = createDatabaseApi();
  const oldDatabase = createValidDatabase(api);
  oldDatabase.schemaVersion = 1;
  delete oldDatabase.classes;
  delete oldDatabase.users[0].classIds;
  storage.setItem(api.storageKey, JSON.stringify(oldDatabase));

  const migrated = api.read();
  assert.equal(migrated.schemaVersion, 5);
  assert.deepEqual(Array.from(migrated.classes), []);
  assert.deepEqual(Array.from(migrated.users[0].classIds), []);
  assert.equal(migrated.users[0].fullName, 'Học viên Demo');
  assert.equal(migrated.users[0].birthDate, '');
  assert.equal(migrated.users[0].password, '123');
  assert.equal(JSON.parse(storage.getItem(`${api.storageKey}_backup_v1`)).schemaVersion, 1);
});

test('migrates version 2 accounts to demo credentials and backs up the original database', () => {
  const { api, storage } = createDatabaseApi();
  const oldDatabase = createValidDatabase(api);
  oldDatabase.schemaVersion = 2;
  delete oldDatabase.users[0].username;
  delete oldDatabase.users[0].password;
  delete oldDatabase.users[0].nickname;
  delete oldDatabase.users[0].avatar;
  delete oldDatabase.users[0].birthDate;
  storage.setItem(api.storageKey, JSON.stringify(oldDatabase));

  const migrated = api.read();
  assert.equal(migrated.schemaVersion, 5);
  assert.equal(migrated.users[0].username, 'user_student');
  assert.equal(migrated.users[0].password, '123');
  assert.equal(migrated.users[0].nickname, '');
  assert.equal(migrated.users[0].avatar, 'seedling');
  assert.equal(migrated.users[0].birthDate, '');
  assert.equal(JSON.parse(storage.getItem(`${api.storageKey}_backup_v2`)).schemaVersion, 2);
});

test('migrates version 3 birth dates to the current account schema with a backup', () => {
  const { api, storage } = createDatabaseApi();
  const oldDatabase = createValidDatabase(api);
  oldDatabase.schemaVersion = 3;
  oldDatabase.users[0].birthDate = '2005-04-15';
  delete oldDatabase.users[0].phone;
  storage.setItem(api.storageKey, JSON.stringify(oldDatabase));

  const migrated = api.read();
  assert.equal(migrated.schemaVersion, 5);
  assert.equal(migrated.users[0].birthDate, '2005-04-15');
  assert.equal(migrated.users[0].phone, '');
  assert.equal(JSON.parse(storage.getItem(`${api.storageKey}_backup_v3`)).schemaVersion, 3);
});

test('migrates version 4 profiles to include an empty phone field with a backup', () => {
  const { api, storage } = createDatabaseApi();
  const oldDatabase = createValidDatabase(api);
  oldDatabase.schemaVersion = 4;
  delete oldDatabase.users[0].phone;
  storage.setItem(api.storageKey, JSON.stringify(oldDatabase));

  const migrated = api.read();
  assert.equal(migrated.schemaVersion, 5);
  assert.equal(migrated.users[0].phone, '');
  assert.equal(JSON.parse(storage.getItem(`${api.storageKey}_backup_v4`)).schemaVersion, 4);
});

test('validates optional phone numbers', () => {
  const { api } = createDatabaseApi();
  const database = createValidDatabase(api);
  database.users[0].phone = '0912 345 678';
  assert.equal(api.validate(database), true);

  database.users[0].phone = 'invalid';
  assert.throws(() => api.validate(database), /phone phải là số điện thoại hợp lệ/);
});

test('validates birth dates as real dates that are not in the future', () => {
  const { api } = createDatabaseApi();
  const database = createValidDatabase(api);
  database.users[0].birthDate = '2004-02-29';
  assert.equal(api.validate(database), true);

  database.users[0].birthDate = '2005-02-29';
  assert.throws(() => api.validate(database), /birthDate phải là ngày hợp lệ/);
  database.users[0].birthDate = '2999-01-01';
  assert.throws(() => api.validate(database), /birthDate phải là ngày hợp lệ/);
});

test('does not replace a database when its migration is absent or invalid', () => {
  const { api, storage } = createDatabaseApi();
  const oldDatabase = api.createEmptyDatabase();
  oldDatabase.schemaVersion = 0;
  storage.setItem(api.storageKey, JSON.stringify(oldDatabase));

  assert.throws(() => api.read(), /Chưa có migration từ database v0/);
  assert.equal(JSON.parse(storage.getItem(api.storageKey)).schemaVersion, 0);

  api.registerMigration(0, database => ({ ...database, schemaVersion: 2 }));
  assert.throws(() => api.read(), /phải trả về database v1/);
  assert.equal(JSON.parse(storage.getItem(api.storageKey)).schemaVersion, 0);
});

test('validates class IDs, membership references, and unique normalized class names', () => {
  const { api } = createDatabaseApi();
  const database = createValidDatabase(api);
  database.classes.push({ classId: 'class_10a', name: '10A', status: 'active' });
  database.users[0].classIds = ['class_10a'];
  assert.equal(api.validate(database), true);

  const missingMemberships = JSON.parse(JSON.stringify(database));
  delete missingMemberships.users[0].classIds;
  assert.throws(() => api.validate(missingMemberships), /classIds phải là một mảng/);

  const unknownClass = JSON.parse(JSON.stringify(database));
  unknownClass.users[0].classIds = ['class_missing'];
  assert.throws(() => api.validate(unknownClass), /classIds tham chiếu lớp không hợp lệ/);

  const duplicateMembership = JSON.parse(JSON.stringify(database));
  duplicateMembership.users[0].classIds = ['class_10a', 'class_10a'];
  assert.throws(() => api.validate(duplicateMembership), /classIds có classId bị trùng/);

  const duplicateName = JSON.parse(JSON.stringify(database));
  duplicateName.classes.push({ classId: 'class_10b', name: ' 10a ', status: 'active' });
  assert.throws(() => api.validate(duplicateName), /Tên lớp bị trùng/);
});

test('rejects broken references and questions from another subject', () => {
  const { api } = createDatabaseApi();
  const database = createValidDatabase(api);
  database.quizzes[0].subjectId = 'subject_missing';
  assert.throws(() => api.validate(database), /subjectId không tham chiếu môn học hợp lệ/);

  const otherSubject = {
    subjectId: 'subject_other',
    name: 'Lý',
    status: 'active'
  };
  database.subjects.push(otherSubject);
  database.quizzes[0].subjectId = otherSubject.subjectId;
  assert.throws(() => api.validate(database), /không thuộc môn học của đề/);
});

test('does not overwrite malformed persisted JSON or report a failed write as successful', () => {
  const storageKey = 'adaptive_quiz_demo_db';
  const invalidStorage = createStorage(new Map([[storageKey, '{invalid json']]));
  const invalidApi = createDatabaseApi(invalidStorage).api;
  assert.throws(() => invalidApi.read(), /không phải JSON hợp lệ/);
  assert.equal(invalidStorage.getItem(storageKey), '{invalid json');

  const failingStorage = createStorage();
  failingStorage.setItem = () => {
    throw new Error('quota exceeded');
  };
  const failingApi = createDatabaseApi(failingStorage).api;
  assert.throws(() => failingApi.write(failingApi.createEmptyDatabase()), /Không thể ghi database demo/);
});
