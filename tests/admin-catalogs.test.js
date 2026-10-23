const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const moduleSource = fs.readFileSync(
  path.join(__dirname, '..', 'js', 'features', 'admin', 'admin-catalogs.js'),
  'utf8'
);
const utilitySource = fs.readFileSync(
  path.join(__dirname, '..', 'js', 'core', 'utils.js'),
  'utf8'
);

function createCatalogContext(role = 'student') {
  const database = {
    subjects: [
      { subjectId: 'subject_active', name: 'Toán', status: 'active' },
      { subjectId: 'subject_hidden', name: 'Ẩn', status: 'inactive' }
    ],
    skills: [
      { skillId: 'skill_active', subjectId: 'subject_active', name: 'Đại số', status: 'active' },
      { skillId: 'skill_hidden', subjectId: 'subject_active', name: 'Hình học', status: 'inactive' },
      { skillId: 'skill_hidden_parent', subjectId: 'subject_hidden', name: 'Kỹ năng ẩn', status: 'active' }
    ],
    difficulties: [
      { difficultyId: 'difficulty_hard', label: 'Hard', rank: 3, status: 'active' },
      { difficultyId: 'difficulty_inactive', label: 'Inactive', rank: 4, status: 'inactive' },
      { difficultyId: 'difficulty_easy', label: 'Easy', rank: 1, status: 'active' }
    ]
  };
  const context = {
    document: {},
    updateFilterOptionsUI() {},
    sortListByDate(records, sort) {
      const direction = sort === 'DATE_ASC' ? 1 : -1;
      return records
        .map((record, index) => ({ record, index, timestamp: Date.parse(record.createdAt || '') || null }))
        .sort((left, right) => {
          if (left.timestamp === null || right.timestamp === null) {
            if (left.timestamp === right.timestamp) return left.index - right.index;
            return left.timestamp === null ? 1 : -1;
          }
          return (left.timestamp - right.timestamp) * direction || left.index - right.index;
        })
        .map(({ record }) => record);
    },
    window: {
      AppState: {
        currentUser: role ? { role } : null,
        settings: { topics: [], difficulties: [] }
      },
      Auth: { getCurrentUser: () => role ? { role } : null },
      LocalStorageDB: { read: () => JSON.parse(JSON.stringify(database)) }
    }
  };
  vm.createContext(context);
  vm.runInContext(utilitySource, context);
  vm.runInContext(moduleSource, context);
  return context;
}

test('returns active catalogs from the local database and syncs legacy filter settings', async () => {
  const context = createCatalogContext('student');
  const catalogs = await context.window.AdminCatalogs.getActiveCatalogs();

  assert.deepEqual(JSON.parse(JSON.stringify(catalogs.subjects)), [
    { subjectId: 'subject_active', name: 'Toán', status: 'active' }
  ]);
  assert.deepEqual(JSON.parse(JSON.stringify(catalogs.skills)), [
    { skillId: 'skill_active', subjectId: 'subject_active', name: 'Đại số', status: 'active' }
  ]);
  assert.deepEqual(JSON.parse(JSON.stringify(catalogs.difficulties)).map(item => item.label), ['Easy', 'Hard']);
  assert.deepEqual(JSON.parse(JSON.stringify(context.window.AppState.settings)), {
    topics: ['Toán'],
    difficulties: ['Easy', 'Hard']
  });
});

test('does not require a signed-in admin to read catalogs used by student forms', async () => {
  const context = createCatalogContext(null);
  const catalogs = await context.window.AdminCatalogs.getActiveCatalogs();
  assert.equal(catalogs.subjects.length, 1);
  assert.equal(catalogs.skills.length, 1);
});

test('catalog delete confirmations use explicit localized action labels', async () => {
  const context = createCatalogContext('admin');
  let confirmation;
  context.Swal = {
    fire: options => {
      confirmation = options;
      return Promise.resolve({ isConfirmed: false });
    }
  };

  await context.confirmCatalogDeletion('Xóa môn học?', 'Toán');

  assert.equal(confirmation.title, 'Xóa môn học?');
  assert.equal(confirmation.text, 'Toán');
  assert.equal(confirmation.confirmButtonText, 'Xóa');
  assert.equal(confirmation.cancelButtonText, 'Hủy');
  assert.equal(confirmation.showCancelButton, true);
});

test('catalog list search, sorting, and pagination operate independently on matching records', () => {
  const context = createCatalogContext();
  const records = [
    { name: 'Beta', createdAt: '2026-02-01T00:00:00.000Z' },
    { name: 'Alpha', createdAt: '2026-03-01T00:00:00.000Z' },
    { name: 'Legacy' }
  ];
  const getView = options => context.getCatalogListView(records, {
    searchText: '',
    sort: 'TITLE_ASC',
    pageSize: '10',
    currentPage: 1,
    searchableText: record => record.name,
    ...options
  });

  assert.deepEqual(
    Array.from(getView({ sort: 'TITLE_ASC' }).records, record => record.name),
    ['Alpha', 'Beta', 'Legacy']
  );
  assert.deepEqual(
    Array.from(getView({ sort: 'DATE_DESC' }).records, record => record.name),
    ['Alpha', 'Beta', 'Legacy']
  );
  assert.deepEqual(
    Array.from(getView({ sort: 'DATE_ASC' }).records, record => record.name),
    ['Beta', 'Alpha', 'Legacy']
  );

  const paged = context.getCatalogListView(records, {
    searchText: 'beta',
    sort: 'TITLE_ASC',
    pageSize: '1',
    currentPage: 5,
    searchableText: record => record.name
  });
  assert.deepEqual(Array.from(paged.records, record => record.name), ['Beta']);
  assert.equal(paged.totalRecords, 1);
  assert.equal(paged.currentPage, 1);
  assert.equal(paged.totalPages, 1);

  const accentInsensitive = context.getCatalogListView(
    [{ name: 'Toán học' }, { name: 'Khoa học' }],
    {
      searchText: 'toan',
      sort: 'TITLE_ASC',
      pageSize: '10',
      currentPage: 1,
      searchableText: record => record.name
    }
  );
  assert.deepEqual(Array.from(accentInsensitive.records, record => record.name), ['Toán học']);
});

test('catalog sub-tabs support clicks and arrow-key navigation with synchronized ARIA state', () => {
  const tabIds = ['subjects', 'skills', 'difficulties'];
  const panels = new Map(tabIds.map(id => [`admin-catalog-panel-${id}`, { hidden: id !== 'subjects' }]));
  const tabs = tabIds.map((id, index) => {
    const attributes = new Map([
      ['aria-controls', `admin-catalog-panel-${id}`],
      ['aria-selected', String(index === 0)],
      ['tabindex', index === 0 ? '0' : '-1']
    ]);
    const classes = new Set(index === 0 ? ['active'] : []);
    return {
      attributes,
      classList: {
        toggle(name, force) {
          if (force) classes.add(name);
          else classes.delete(name);
        },
        contains: name => classes.has(name)
      },
      focused: false,
      focus() {
        this.focused = true;
      },
      closest() {
        return this;
      },
      getAttribute(name) {
        return attributes.get(name) || null;
      },
      setAttribute(name, value) {
        attributes.set(name, value);
      }
    };
  });
  const listeners = {};
  const tabList = {
    addEventListener(type, callback) {
      listeners[type] = callback;
    },
    querySelectorAll() {
      return tabs;
    }
  };
  const context = {
    document: {
      getElementById(id) {
        return id === 'admin-catalog-tabs' ? tabList : panels.get(id) || null;
      }
    },
    window: {}
  };
  vm.createContext(context);
  vm.runInContext(moduleSource, context);
  context.setupAdminCatalogTabs();

  let prevented = false;
  listeners.keydown({
    target: tabs[0],
    key: 'ArrowRight',
    preventDefault() {
      prevented = true;
    }
  });
  assert.equal(prevented, true);
  assert.equal(tabs[1].getAttribute('aria-selected'), 'true');
  assert.equal(tabs[1].getAttribute('tabindex'), '0');
  assert.equal(tabs[1].focused, true);
  assert.equal(panels.get('admin-catalog-panel-subjects').hidden, true);
  assert.equal(panels.get('admin-catalog-panel-skills').hidden, false);

  listeners.click({ target: tabs[2] });
  assert.equal(tabs[2].getAttribute('aria-selected'), 'true');
  assert.equal(tabs[2].getAttribute('tabindex'), '0');
  assert.equal(panels.get('admin-catalog-panel-difficulties').hidden, false);
  assert.equal(panels.get('admin-catalog-panel-skills').hidden, true);
});
