const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const source = fs.readFileSync(
  path.join(__dirname, '..', 'js', 'features', 'student', 'student-history.js'),
  'utf8'
);
const utilitySource = fs.readFileSync(
  path.join(__dirname, '..', 'js', 'core', 'utils.js'),
  'utf8'
);

class MockElement {
  constructor() {
    this.children = [];
    this.dataset = {};
    this.textContent = '';
    this.className = '';
  }

  append(...children) {
    this.children.push(...children);
  }

  appendChild(child) {
    this.children.push(child);
  }

  replaceChildren(...children) {
    this.children = children;
  }
}

function createHistoryContext(readHistory) {
  const elements = new Map([
    ['history-items-container', new MockElement()],
    ['history-count-badge', new MockElement()],
    ['history-status', new MockElement()]
  ]);
  const context = {
    console: { error() {} },
    document: {
      getElementById: id => elements.get(id) || null,
      createElement: () => new MockElement()
    },
    window: {
      Auth: {
        getCurrentUser: () => ({
          userId: 'student_1',
          username: 'student_1',
          fullName: 'Học viên'
        })
      },
      AppState: {
        listsState: {
          studentHistory: {
            searchText: '',
            mode: 'ALL',
            score: 'ALL',
            pageSize: '10',
            currentPage: 1
          }
        }
      }
    },
    renderPaginationUI() {},
    sortListByDate(records, sort) {
      const direction = sort === 'DATE_ASC' ? 1 : -1;
      return records.slice().sort((left, right) =>
        ((Date.parse(left.completedAt || '') || 0) - (Date.parse(right.completedAt || '') || 0)) * direction
      );
    }
  };
  vm.createContext(context);
  vm.runInContext(utilitySource, context);
  vm.runInContext(source, context);
  context.window.QuizHistoryStorage = { readAll: readHistory };
  return { context, elements };
}

test('student catalog and history titles share typography while keeping layout classes', () => {
  const studentViewSource = fs.readFileSync(
    path.join(__dirname, '..', 'js', 'features', 'student', 'student-view.js'),
    'utf8'
  );
  const componentStyles = fs.readFileSync(
    path.join(__dirname, '..', 'css', 'components.css'),
    'utf8'
  );

  assert.match(studentViewSource, /title\.className = 'student-list-item-title quiz-card-title'/);
  assert.match(source, /title\.className = 'student-list-item-title history-item-title'/);
  assert.match(componentStyles, /\.student-list-item-title\s*\{[^}]*font-size:\s*var\(--font-size-lg\)[^}]*font-weight:\s*600[^}]*line-height:\s*1\.4/s);
});

test('history read failure is shown as an error with an explicit retry action', () => {
  const { context, elements } = createHistoryContext(() => {
    throw new Error('Database unavailable');
  });

  context.renderQuizHistoryItems();

  assert.equal(elements.get('history-count-badge').textContent, 'Chưa tải được');
  assert.match(elements.get('history-status').textContent, /Database unavailable/);
  const errorState = elements.get('history-items-container').children[0];
  assert.equal(errorState.className, 'history-empty-state history-error-state');
  assert.match(errorState.children[0].textContent, /Kết quả cũ không bị xóa/);
  assert.equal(errorState.children[1].textContent, 'Thử tải lại');
  assert.equal(errorState.children[1].dataset.retryHistory, '');
});

test('empty history remains distinct from a failed read', () => {
  const { context, elements } = createHistoryContext(() => []);

  context.renderQuizHistoryItems();

  assert.equal(elements.get('history-count-badge').textContent, '0 lượt');
  assert.equal(elements.get('history-status').textContent, '');
  assert.equal(
    elements.get('history-items-container').children[0].textContent,
    'Bạn chưa hoàn thành bài thi nào.'
  );
});

test('filters with no matches remain distinct from empty history', () => {
  const { context, elements } = createHistoryContext(() => [{
    attemptId: 'attempt_1',
    ownerUsername: 'student_1',
    quizTitle: 'Đề Toán',
    topic: 'Toán',
    score: 8,
    mode: 'EXAM'
  }]);
  context.window.AppState.listsState.studentHistory.searchText = 'không có';

  context.renderQuizHistoryItems();

  assert.equal(elements.get('history-count-badge').textContent, '0 lượt');
  assert.equal(
    elements.get('history-items-container').children[0].textContent,
    'Không tìm thấy lượt làm bài phù hợp.'
  );
});
