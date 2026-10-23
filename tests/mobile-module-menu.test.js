const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const root = path.join(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'js', 'core', 'mobile-menu.js'), 'utf8');
const indexHtml = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const responsiveStyles = fs.readFileSync(path.join(root, 'css', 'responsive.css'), 'utf8');
const adminHtml = fs.readFileSync(path.join(root, 'views', 'admin', 'dashboard.html'), 'utf8');
const studentHtml = fs.readFileSync(path.join(root, 'views', 'student', 'dashboard.html'), 'utf8');

class MockClassList {
  constructor() {
    this.values = new Set();
  }

  add(value) {
    this.values.add(value);
  }

  remove(value) {
    this.values.delete(value);
  }

  contains(value) {
    return this.values.has(value);
  }
}

class MockElement {
  constructor(id) {
    this.id = id;
    this.hidden = false;
    this.inert = false;
    this.attributes = {};
    this.listeners = {};
    this.classList = new MockClassList();
    this.focused = false;
  }

  setAttribute(name, value) {
    this.attributes[name] = String(value);
  }

  getAttribute(name) {
    return this.attributes[name] ?? null;
  }

  addEventListener(name, callback) {
    this.listeners[name] = callback;
  }

  querySelector() {
    return this.selectedTab;
  }

  focus() {
    this.focused = true;
  }

  click() {
    this.listeners.click?.();
  }
}

function createMenuContext() {
  const toggle = new MockElement('mobile-menu-toggle');
  const backdrop = new MockElement('mobile-menu-backdrop');
  const adminNav = new MockElement('admin-tabs');
  const studentNav = new MockElement('student-tabs-nav');
  const adminTab = new MockElement('admin-tab-quizzes');
  const studentTab = new MockElement('tab-catalog');
  adminNav.selectedTab = adminTab;
  studentNav.selectedTab = studentTab;
  const elements = new Map([
    [toggle.id, toggle],
    [backdrop.id, backdrop],
    [adminNav.id, adminNav],
    [studentNav.id, studentNav]
  ]);
  const documentListeners = {};
  const body = { classList: new MockClassList() };
  const mediaQuery = {
    matches: true,
    addEventListener(name, callback) {
      if (name === 'change') this.onChange = callback;
    }
  };
  let activeViewId = 'view-list';
  const context = {
    document: {
      body,
      getElementById: id => elements.get(id) || null,
      querySelector: selector => selector === '.view-section:not(.hidden)'
        ? { id: activeViewId }
        : null,
      addEventListener(name, callback) {
        documentListeners[name] = callback;
      }
    },
    window: {
      matchMedia: () => mediaQuery
    }
  };
  vm.createContext(context);
  vm.runInContext(source, context);
  return {
    context,
    toggle,
    backdrop,
    adminNav,
    studentNav,
    adminTab,
    studentTab,
    body,
    mediaQuery,
    documentListeners,
    setActiveView(id) {
      activeViewId = id;
    }
  };
}

test('mobile module menu opens the active role drawer and closes after selection or Escape', () => {
  const menu = createMenuContext();
  menu.context.initMobileModuleMenu();

  assert.equal(menu.toggle.hidden, false);
  assert.equal(menu.studentNav.inert, true);
  assert.equal(menu.studentNav.getAttribute('aria-hidden'), 'true');

  menu.toggle.click();
  assert.equal(menu.toggle.getAttribute('aria-expanded'), 'true');
  assert.equal(menu.backdrop.hidden, false);
  assert.equal(menu.studentNav.classList.contains('is-mobile-menu-open'), true);
  assert.equal(menu.studentNav.inert, false);
  assert.equal(menu.studentTab.focused, true);

  menu.documentListeners.keydown({ key: 'Escape' });
  assert.equal(menu.toggle.getAttribute('aria-expanded'), 'false');
  assert.equal(menu.toggle.focused, true);
  assert.equal(menu.backdrop.hidden, true);

  menu.toggle.click();
  menu.documentListeners.click({
    target: {
      closest: () => menu.studentTab
    }
  });
  assert.equal(menu.studentNav.classList.contains('is-mobile-menu-open'), false);
  assert.equal(menu.toggle.getAttribute('aria-expanded'), 'false');
  assert.equal(menu.toggle.focused, true);
});

test('module menu follows the active role and is disabled on desktop', () => {
  const menu = createMenuContext();
  menu.context.initMobileModuleMenu();

  menu.setActiveView('view-admin');
  menu.context.syncMobileModuleMenu();
  assert.equal(menu.toggle.hidden, false);
  assert.equal(menu.studentNav.inert, true);
  assert.equal(menu.adminNav.inert, true);

  menu.toggle.click();
  assert.equal(menu.adminNav.classList.contains('is-mobile-menu-open'), true);

  menu.mediaQuery.matches = false;
  menu.mediaQuery.onChange({ matches: false });
  assert.equal(menu.toggle.hidden, true);
  assert.equal(menu.backdrop.hidden, true);
  assert.equal(menu.adminNav.inert, false);
  assert.equal(menu.adminNav.getAttribute('aria-hidden'), 'false');
  assert.equal(menu.adminNav.classList.contains('is-mobile-menu-open'), false);
});

test('both role dashboards use the slide-out menu in the mobile layout', () => {
  assert.match(indexHtml, /id="mobile-menu-toggle"[^>]*aria-expanded="false"[^>]*hidden/);
  assert.match(indexHtml, /id="mobile-menu-backdrop"/);
  assert.match(adminHtml, /id="admin-tabs"/);
  assert.match(studentHtml, /id="student-tabs-nav"/);
  assert.match(responsiveStyles, /@media screen and \(max-width: 850px\)[\s\S]*?\.student-tabs-nav,[\s\S]*?\.admin-tabs/);
  assert.match(responsiveStyles, /\.student-tabs-nav\.is-mobile-menu-open,[\s\S]*?\.admin-tabs\.is-mobile-menu-open/);
});
