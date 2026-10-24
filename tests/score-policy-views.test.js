const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const dashboardSource = fs.readFileSync(
  path.join(__dirname, '..', 'js', 'features', 'student', 'student-dashboard.js'),
  'utf8'
);
const reportsSource = fs.readFileSync(
  path.join(__dirname, '..', 'js', 'features', 'admin', 'admin-reports.js'),
  'utf8'
);
const utilitySource = fs.readFileSync(
  path.join(__dirname, '..', 'js', 'core', 'utils.js'),
  'utf8'
);

function createElement() {
  return {
    children: [],
    dataset: {},
    style: {},
    value: '',
    textContent: '',
    appendChild(child) {
      this.children.push(child);
    },
    replaceChildren(...children) {
      this.children = children;
    },
    set innerHTML(value) {
      this.html = value;
      this.children = [];
    }
  };
}

test('student dashboard averages per-quiz aggregate scores while retaining attempt count', () => {
  const elements = new Map();
  const history = [
    { attemptId: 'attempt_1', score: 5 },
    { attemptId: 'attempt_2', score: 9 }
  ];
  const context = {
    document: {
      getElementById(id) {
        if (!elements.has(id)) elements.set(id, createElement());
        return elements.get(id);
      },
      createElement
    },
    window: {
      getQuizHistoryForCurrentUser: () => history,
      QuizEngine: {
        aggregateQuizScores: items => {
          assert.equal(items.length, 2);
          return [{ aggregateScore: 7 }];
        },
        aggregateSkillStats: () => ({})
      }
    }
  };

  vm.createContext(context);
  vm.runInContext(dashboardSource, context);
  context.updateStudentStatsData();

  assert.equal(elements.get('dash-completed-count').textContent, '2 Bài');
  assert.equal(elements.get('dash-avg-score').textContent, '7.0 / 10');
});

test('garden shows only the seed before first watering, then keeps only the sprout', () => {
  const elements = new Map();
  const progress = {
    userId: 'student_1',
    treeStage: 1,
    currentExp: 0,
    streakCount: 0,
    bucketsWatered: 0,
    fullBucketCount: 1
  };
  const context = {
    document: {
      getElementById(id) {
        if (!elements.has(id)) elements.set(id, createElement());
        return elements.get(id);
      },
      createElement
    },
    getQuizHistoryForUser: () => [],
    window: {
      AppState: { viewingStudentId: 'student_1' },
      Auth: { getCurrentUser: () => ({ role: 'admin' }) },
      LocalStorageDB: {
        read: () => ({
          users: [{ userId: 'student_1', role: 'student' }],
          studentProgress: [progress]
        })
      },
      GamificationEngine: {
        STAGES: {
          1: { name: 'Hạt Mầm', icon: '🌱', maxExp: 100, desc: 'Cây vừa mới nhú mầm!' }
        }
      },
      QuizEngine: {
        aggregateQuizScores: () => [],
        aggregateSkillStats: () => ({})
      }
    }
  };

  vm.createContext(context);
  vm.runInContext(dashboardSource, context);

  context.updateStudentStatsData();
  assert.equal(elements.get('tree-garden-scene').dataset.hasWatered, 'false');
  assert.equal(elements.get('dash-tree-title').textContent, 'Hạt Giống (Cấp 1)');
  assert.equal(elements.get('dash-garden-ground-label').textContent, 'HẠT GIỐNG ĐANG CHỜ TƯỚI');

  progress.bucketsWatered = 1;
  progress.currentExp = 50;
  context.updateStudentStatsData();
  assert.equal(elements.get('tree-garden-scene').dataset.hasWatered, 'true');
  assert.equal(elements.get('dash-tree-title').textContent, 'Hạt Mầm (Cấp 1)');
  assert.equal(elements.get('dash-garden-ground-label').textContent, 'MẦM TRI THỨC ĐANG LỚN LÊN');

  const componentStyles = fs.readFileSync(
    path.join(__dirname, '..', 'css', 'components.css'),
    'utf8'
  );
  assert.match(
    componentStyles,
    /\.tree-garden-scene\[data-has-watered="false"\] \.garden-plant-wrap,[\s\S]*?\.tree-garden-scene\[data-has-watered="false"\] \.garden-root\s*\{[^}]*visibility:\s*hidden;/s
  );
  assert.match(
    componentStyles,
    /\.tree-garden-scene\[data-has-watered="true"\] \.garden-seed\s*\{[^}]*display:\s*none;/s
  );
});

test('admin report shows original attempt scores alongside per-student quiz aggregates', () => {
  const elements = new Map();
  for (const [id, value] of [
    ['search-admin-reports', ''],
    ['sort-admin-reports', 'TITLE_ASC'],
    ['pagesize-admin-reports', 'ALL']
  ]) {
    const element = createElement();
    element.value = value;
    elements.set(id, element);
  }
  const context = {
    document: {
      getElementById(id) {
        if (!elements.has(id)) elements.set(id, createElement());
        return elements.get(id);
      },
      createElement
    },
    window: {
      QuizHistoryStorage: {
        readAll: () => [
          { attemptId: 'attempt_1', timestamp: 'Ngày 1', username: 'An', quizTitle: 'Đề Toán', score: 5, correctCount: 5 },
          { attemptId: 'attempt_2', timestamp: 'Ngày 2', username: 'An', quizTitle: 'Đề Toán', score: 9, correctCount: 9 }
        ]
      },
      QuizEngine: {
        aggregateQuizScores: () => [{
          aggregateScore: 7,
          attemptCount: 2,
          attemptIds: ['attempt_1', 'attempt_2'],
          scorePolicy: 'average'
        }]
      },
      AppState: { listsState: { adminReports: { currentPage: 1 } } }
    },
    renderPaginationUI() {}
  };

  vm.createContext(context);
  vm.runInContext(utilitySource, context);
  context.renderListPagination = () => {};
  vm.runInContext(reportsSource, context);
  context.renderAdminReports();

  const rows = elements.get('admin-history-tbody').children;
  assert.equal(elements.get('stat-total-attempts').textContent, 2);
  assert.equal(elements.get('stat-avg-score').textContent, '7.0');
  assert.equal(rows.length, 2);
  assert.equal(rows[0].children.length, 7);
  assert.equal(rows[0].children[3].textContent, '5 / 10');
  assert.equal(rows[0].children[4].textContent, '7.0 / 10 · Trung bình (2 lượt)');
  assert.equal(rows[1].children[3].textContent, '9 / 10');
});
