const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const root = path.join(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'js', 'core', 'utils.js'), 'utf8');
const context = {};
vm.createContext(context);
vm.runInContext(source, context);

test('sorts dated list records newest-first or oldest-first and keeps undated records stable last', () => {
  const records = [
    { id: 'undated-a' },
    { id: 'older', createdAt: '2026-01-01T00:00:00.000Z' },
    { id: 'newer', createdAt: '2026-03-01T00:00:00.000Z' },
    { id: 'undated-b' }
  ];

  assert.deepEqual(
    Array.from(context.sortListByDate(records, 'DATE_DESC'), record => record.id),
    ['newer', 'older', 'undated-a', 'undated-b']
  );
  assert.deepEqual(
    Array.from(context.sortListByDate(records, 'DATE_ASC'), record => record.id),
    ['older', 'newer', 'undated-a', 'undated-b']
  );
});

test('shared list processing normalizes Vietnamese search, combines filters, and clamps pagination', () => {
  const records = [
    { id: 'one', name: 'Toán rời rạc', status: 'active' },
    { id: 'two', name: 'Toán ứng dụng', status: 'inactive' },
    { id: 'three', name: 'Vật lý', status: 'active' }
  ];
  const result = context.processListRecords(records, {
    searchText: '  TOAN ',
    searchableText: ['name'],
    filters: [record => record.status === 'active'],
    sortRecords: items => items.slice().reverse(),
    currentPage: 9,
    pageSize: 1
  });

  assert.deepEqual(Array.from(result.records, record => record.id), ['one']);
  assert.equal(result.totalRecords, 1);
  assert.equal(result.currentPage, 1);
  assert.equal(result.totalPages, 1);
  assert.equal(result.startIndex, 0);
  assert.equal(result.endIndex, 1);
});

test('shared list processing supports all-results mode and keeps empty results on a valid page', () => {
  const all = context.processListRecords([{ name: 'A' }, { name: 'B' }], {
    currentPage: 7,
    pageSize: 'ALL'
  });
  assert.equal(all.records.length, 2);
  assert.equal(all.currentPage, 1);
  assert.equal(all.totalPages, 1);

  const empty = context.processListRecords([], { currentPage: 7, pageSize: 10 });
  assert.equal(empty.records.length, 0);
  assert.equal(empty.currentPage, 1);
  assert.equal(empty.totalPages, 1);
});

test('shared reset control restores search and selected defaults and resets the active page', () => {
  const search = { tagName: 'INPUT', value: 'keyword' };
  const sort = {
    tagName: 'SELECT',
    value: 'TITLE_ASC',
    options: [
      { value: 'DATE_DESC', defaultSelected: true },
      { value: 'TITLE_ASC', defaultSelected: false }
    ]
  };
  const button = {
    listeners: {},
    setAttribute() {},
    addEventListener(name, callback) {
      this.listeners[name] = callback;
    }
  };
  const group = {
    dataset: {},
    children: [],
    appendChild(element) { this.children.push(element); }
  };
  search.closest = () => group;
  const elements = new Map([
    ['search', search],
    ['sort', sort]
  ]);
  context.document = {
    getElementById: id => elements.get(id),
    createElement: () => button
  };
  context.window = { AppState: { listsState: { testList: { currentPage: 4 } } } };

  let callbackCount = 0;
  context.bindListResetControl(['search', 'sort'], 'testList', () => { callbackCount += 1; });
  assert.equal(group.children[0], button);
  button.listeners.click();

  assert.equal(search.value, '');
  assert.equal(sort.value, 'DATE_DESC');
  assert.equal(context.window.AppState.listsState.testList.currentPage, 1);
  assert.equal(callbackCount, 1);
});

test('date ordering is available and defaults to newest-first on application data lists', () => {
  const templates = [
    'views/student/catalog.html',
    'views/admin/tabs/tab-quizzes.html',
    'views/admin/tabs/tab-bank.html',
    'views/admin/tabs/tab-users.html',
    'views/shared/modals.html',
    'views/admin/tabs/tab-catalogs.html',
    'views/admin/tabs/tab-reports.html'
  ];
  templates.forEach(relativePath => {
    const template = fs.readFileSync(path.join(root, relativePath), 'utf8');
    assert.match(template, /value="DATE_DESC"(?: selected)?/i, `${relativePath} lacks newest-first ordering`);
    assert.match(template, /value="DATE_ASC"/i, `${relativePath} lacks oldest-first ordering`);
  });

  const historyModule = fs.readFileSync(path.join(root, 'js', 'features', 'student', 'student-history.js'), 'utf8');
  assert.match(historyModule, /value="DATE_DESC"(?: selected)?[^>]*>Mới nhất trước/);
  assert.match(historyModule, /value="DATE_ASC">Cũ nhất trước/);
  ['10', '20', '50', 'ALL'].forEach(size => {
    assert.match(historyModule, new RegExp(`<option value="${size}"`), `student history lacks page size ${size}`);
  });
  const userTemplate = fs.readFileSync(path.join(root, 'views', 'admin', 'tabs', 'tab-users.html'), 'utf8');
  assert.match(userTemplate, /id="filter-status-admin-users"/);
  assert.match(userTemplate, /id="filter-status-admin-classes"/);
  const catalogTemplate = fs.readFileSync(path.join(root, 'views', 'admin', 'tabs', 'tab-catalogs.html'), 'utf8');
  assert.match(catalogTemplate, /id="search-admin-difficulties"/);
  assert.match(catalogTemplate, /id="pagination-admin-difficulties"/);
  const state = fs.readFileSync(path.join(root, 'js', 'core', 'state.js'), 'utf8');
  assert.match(state, /catalog: \{[^}]*sort: 'DATE_DESC'/);
  assert.match(state, /studentHistory: \{[^}]*sort: 'DATE_DESC'/);
  assert.match(state, /adminQuizzes: \{[^}]*sort: 'DATE_DESC'/);
  assert.match(state, /globalBank: \{[^}]*sort: 'DATE_DESC'/);
  assert.match(state, /adminUsers: \{[^}]*sort: 'DATE_DESC'/);
  assert.match(state, /quizQuestions: \{[^}]*sort: 'DATE_DESC'/);
  assert.match(state, /modalBank: \{[^}]*sort: 'DATE_DESC'/);
});
