const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const engineSource = fs.readFileSync(
  path.join(__dirname, '..', 'js', 'core', 'quiz-engine.js'),
  'utf8'
);

function createEngine(quizzes = []) {
  const database = {
    quizzes,
    subjects: [
      { subjectId: 'subject_math', name: 'Toán' },
      { subjectId: 'subject_science', name: 'Khoa học' }
    ],
    skills: [
      { skillId: 'skill_algebra', subjectId: 'subject_math', name: 'Đại số' },
      { skillId: 'skill_geometry', subjectId: 'subject_math', name: 'Hình học' },
      { skillId: 'skill_biology', subjectId: 'subject_science', name: 'Sinh học' }
    ],
    questions: [
      { questionId: 'legacy_q', subjectId: 'subject_math', skillId: 'skill_algebra', topic: 'Toán' }
    ]
  };
  const context = {
    window: {
      LocalStorageDB: { read: () => database },
      AppState: {}
    },
    document: { getElementById: () => null }
  };
  vm.createContext(context);
  vm.runInContext(engineSource, context);
  return context.window.QuizEngine;
}

test('scores a quiz per subject and skill using catalog IDs and labels', () => {
  const engine = createEngine();
  const questions = [
    { id: 'q1', subjectId: 'subject_math', skillId: 'skill_algebra', correctAnswer: [0] },
    { id: 'q2', subjectId: 'subject_math', skillId: 'skill_algebra', correctAnswer: [1] },
    { id: 'q3', subjectId: 'subject_math', skillId: 'skill_geometry', correctAnswer: [0] },
    { id: 'q4', subjectId: 'subject_science', skillId: 'skill_biology', correctAnswer: [0] }
  ];

  const result = engine.evaluateQuiz(questions, {
    q1: [0],
    q2: [0],
    q3: [0],
    q4: [1]
  });
  const math = result.subjectStats.subject_math;
  assert.equal(result.reviewQuestions.length, 4);
  assert.equal(result.reviewQuestions[0].isCorrect, true);
  assert.equal(result.reviewQuestions[1].isCorrect, false);
  assert.equal(result.reviewQuestions[3].questionNumber, 4);

  assert.equal(math.subjectName, 'Toán');
  assert.equal(math.total, 3);
  assert.equal(math.correct, 2);
  assert.equal(math.skills.skill_algebra.skillName, 'Đại số');
  assert.equal(math.skills.skill_algebra.correct, 1);
  assert.equal(math.skills.skill_geometry.correct, 1);
  assert.equal(result.subjectStats.subject_science.skills.skill_biology.correct, 0);
});

test('renders each subject as a doughnut ring divided into correct and incorrect answers', () => {
  let chartConfig;
  const context = {
    window: {},
    document: { getElementById: () => ({ id: 'skills-chart' }), body: {} },
    getComputedStyle: () => ({
      getPropertyValue: token => token === '--primary' ? '#123456' : '#aabbcc'
    }),
    Chart: class {
      constructor(_element, config) {
        chartConfig = config;
      }
    }
  };
  vm.createContext(context);
  vm.runInContext(engineSource, context);

  context.window.QuizEngine.renderChart('skills-chart', {
    Toán: { total: 3, correct: 2 },
    'Khoa học': { total: 4, correct: 1 }
  });

  assert.equal(chartConfig.type, 'doughnut');
  assert.deepEqual(Array.from(chartConfig.data.labels), ['Đúng', 'Sai']);
  assert.deepEqual(Array.from(chartConfig.data.datasets, dataset => dataset.label), ['Toán', 'Khoa học']);
  assert.deepEqual(Array.from(chartConfig.data.datasets[0].data), [2, 1]);
  assert.deepEqual(Array.from(chartConfig.data.datasets[1].data), [1, 3]);
  assert.equal(chartConfig.options.plugins.tooltip.callbacks.label({
    dataset: { data: [2, 1] },
    label: 'Đúng',
    raw: 2
  }), 'Đúng: 2/3 câu (67%)');
});

test('aggregates student skill accuracy across attempts and groups unclassified items by subject', () => {
  const engine = createEngine();
  const aggregate = engine.aggregateSkillStats([
    {
      questions: [
        { id: 'q1', subjectId: 'subject_math', skillId: 'skill_algebra', correctAnswer: [0] },
        { id: 'q2', subjectId: 'subject_math', skillId: 'skill_algebra', correctAnswer: [0] }
      ],
      answers: { q1: [0], q2: [1] }
    },
    {
      questions: [
        { id: 'q3', subjectId: 'subject_math', skillId: 'skill_algebra', correctAnswer: [0] },
        { id: 'q4', subjectId: 'subject_science', topic: 'Khoa học', correctAnswer: [0] }
      ],
      answers: { q3: [0], q4: [0] }
    }
  ]);

  assert.equal(aggregate.subject_math.total, 3);
  assert.equal(aggregate.subject_math.skills.skill_algebra.correct, 2);
  assert.equal(aggregate.subject_science.skills.unclassified_subject_science.skillName, 'Chưa phân loại kỹ năng');
  assert.equal(aggregate.subject_science.skills.unclassified_subject_science.correct, 1);
});

test('recovers skill categorization for legacy snapshots from the current question bank', () => {
  const result = createEngine().evaluateQuiz([
    { id: 'legacy_q', topic: 'Legacy subject name', correctAnswer: [0] }
  ], { legacy_q: [0] });

  assert.equal(result.subjectStats.subject_math.subjectName, 'Toán');
  assert.equal(result.subjectStats.subject_math.skills.skill_algebra.skillName, 'Đại số');
});

test('aggregates quiz scores according to each quiz policy without merging students', () => {
  const engine = createEngine([
    { quizId: 'quiz_highest', scorePolicy: 'highest' },
    { quizId: 'quiz_average', scorePolicy: 'average' },
    { quizId: 'quiz_latest', scorePolicy: 'latest' },
    { quizId: 'quiz_legacy' }
  ]);
  const history = [
    { attemptId: 'h1', ownerUsername: 'student_1', username: 'An', quizId: 'quiz_highest', score: 5, completedAt: '2026-10-20T10:00:00Z' },
    { attemptId: 'h2', ownerUsername: 'student_1', username: 'An', quizId: 'quiz_highest', score: 9, completedAt: '2026-10-21T10:00:00Z' },
    { attemptId: 'a1', ownerUsername: 'student_1', username: 'An', quizId: 'quiz_average', score: 6, completedAt: '2026-10-20T10:00:00Z' },
    { attemptId: 'a2', ownerUsername: 'student_1', username: 'An', quizId: 'quiz_average', score: 9, completedAt: '2026-10-21T10:00:00Z' },
    { attemptId: 'l1', ownerUsername: 'student_1', username: 'An', quizId: 'quiz_latest', score: 9, completedAt: '2026-10-20T10:00:00Z' },
    { attemptId: 'l2', ownerUsername: 'student_1', username: 'An', quizId: 'quiz_latest', score: 4, completedAt: '2026-10-21T10:00:00Z' },
    { attemptId: 'h3', ownerUsername: 'student_2', username: 'Bình', quizId: 'quiz_highest', score: 7, completedAt: '2026-10-21T10:00:00Z' },
    { attemptId: 'legacy1', ownerUsername: 'student_1', username: 'An', quizId: 'quiz_legacy', score: 7, completedAt: '2026-10-21T10:00:00Z' }
  ];

  const aggregate = engine.aggregateQuizScores(history);
  const byKey = new Map(aggregate.map(item => [`${item.userId}:${item.quizId}`, item]));

  assert.equal(byKey.get('student_1:quiz_highest').aggregateScore, 9);
  assert.equal(byKey.get('student_1:quiz_highest').attemptCount, 2);
  assert.deepEqual(Array.from(byKey.get('student_1:quiz_highest').attemptIds), ['h1', 'h2']);
  assert.equal(byKey.get('student_1:quiz_average').aggregateScore, 7.5);
  assert.equal(byKey.get('student_1:quiz_latest').aggregateScore, 4);
  assert.equal(byKey.get('student_1:quiz_legacy').scorePolicy, 'highest');
  assert.equal(byKey.get('student_2:quiz_highest').aggregateScore, 7);
});

test('latest quiz score uses completion time, not the input history order', () => {
  const engine = createEngine([{ quizId: 'quiz_latest', scorePolicy: 'latest' }]);

  const [aggregate] = engine.aggregateQuizScores([
    { attemptId: 'newer', ownerUsername: 'student_1', quizId: 'quiz_latest', score: 3, completedAt: '2026-10-22T10:00:00Z' },
    { attemptId: 'older', ownerUsername: 'student_1', quizId: 'quiz_latest', score: 8, completedAt: '2026-10-21T10:00:00Z' }
  ]);

  assert.equal(aggregate.aggregateScore, 3);
});
