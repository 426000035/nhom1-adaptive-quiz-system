const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const root = path.join(__dirname, '..');

class MockElement {
  constructor(tagName) {
    this.tagName = tagName;
    this.children = [];
    this.attributes = {};
    this.dataset = {};
    this.textContent = '';
    this.value = '';
    this.colSpan = 1;
    this.classList = { remove() {} };
  }

  append(...children) {
    children.forEach(child => this.appendChild(child));
  }

  appendChild(child) {
    this.children.push(child);
    return child;
  }

  replaceChildren(...children) {
    this.children = children;
  }

  setAttribute(name, value) {
    this.attributes[name] = value;
  }
}

test('admin table cell and empty-state helpers render text as text, not markup', () => {
  const context = {
    document: { createElement: tagName => new MockElement(tagName) }
  };
  vm.createContext(context);
  vm.runInContext(
    fs.readFileSync(path.join(root, 'js', 'features', 'admin', 'admin-core.js'), 'utf8'),
    context
  );

  const unsafeText = '<img src=x onerror=alert(1)>';
  const cell = context.createAdminTableCell(unsafeText, 'example', 'admin-table-cell--muted');
  assert.equal(cell.tagName, 'td');
  assert.equal(cell.textContent, unsafeText);
  assert.equal(cell.children.length, 0);
  assert.equal(cell.className, 'example admin-table-cell--muted');

  const body = new MockElement('tbody');
  context.renderAdminEmptyRow(body, 4, unsafeText);
  assert.equal(body.children.length, 1);
  assert.equal(body.children[0].children[0].textContent, unsafeText);
  assert.equal(body.children[0].children[0].colSpan, 4);
});

test('admin quiz and question tables do not interpolate data into HTML strings', () => {
  const files = [
    'js/features/admin/admin-quizzes.js',
    'js/features/admin/admin-bank.js'
  ];
  files.forEach(relativePath => {
    const source = fs.readFileSync(path.join(root, relativePath), 'utf8');
    assert.doesNotMatch(source, /\.innerHTML\s*=\s*`/);
  });
});

test('quiz question table renders every correct option as an answer badge', () => {
  const elements = new Map();
  const getElementById = id => {
    if (!elements.has(id)) elements.set(id, new MockElement('div'));
    return elements.get(id);
  };
  const question = {
    id: 'question-1',
    question: 'Choose the correct answers',
    options: ['3', '312', 'other'],
    correctAnswer: [0, 1]
  };
  const context = {
    Array,
    Number,
    String,
    Math,
    document: {
      createElement: tagName => new MockElement(tagName),
      createTextNode: textContent => ({ nodeType: 3, textContent }),
      getElementById
    },
    window: {
      AppState: {
        allQuizzes: [{ id: 'quiz-1', title: 'Test quiz', questions: [question] }],
        listsState: { quizQuestions: { searchText: '', sort: 'DATE_DESC', currentPage: 1, pageSize: 'ALL' } }
      }
    },
    processListRecords: records => ({
      records,
      totalRecords: records.length,
      totalPages: 1,
      currentPage: 1,
      startIndex: 0,
      endIndex: records.length
    }),
    sortListByDate: records => records,
    createAdminTableCell(value, className = '', cellClassName = '') {
      const cell = new MockElement('td');
      cell.textContent = String(value ?? '');
      cell.className = [className, cellClassName].filter(Boolean).join(' ');
      return cell;
    },
    renderAdminEmptyRow() {},
    renderListPagination() {}
  };
  vm.createContext(context);
  vm.runInContext(
    fs.readFileSync(path.join(root, 'js', 'features', 'admin', 'admin-bank.js'), 'utf8'),
    context
  );
  vm.runInContext(
    fs.readFileSync(path.join(root, 'js', 'features', 'admin', 'admin-quizzes.js'), 'utf8'),
    context
  );

  context.renderSelectedQuizQuestions('quiz-1');

  const rows = getElementById('admin-quiz-questions-tbody').children;
  assert.equal(rows.length, 1);
  assert.equal(rows[0].children.length, 4);
  const answerBadges = rows[0].children[2].children;
  assert.deepEqual(
    answerBadges.map(badge => [
      badge.children[0].textContent,
      badge.children[1].textContent
    ]),
    [['A: ', '3'], ['B: ', '312']]
  );
});
