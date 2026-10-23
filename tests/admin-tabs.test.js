const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const root = path.join(__dirname, '..');
const moduleSource = fs.readFileSync(
  path.join(root, 'js', 'features', 'admin', 'admin-core.js'),
  'utf8'
);

const tabDefinitions = [
  ['tab-quizzes', 'admin-tab-quizzes', 'tab-quizzes.html'],
  ['tab-catalogs', 'admin-tab-catalogs', 'tab-catalogs.html'],
  ['tab-question-bank', 'admin-tab-question-bank', 'tab-bank.html'],
  ['tab-users', 'admin-tab-users', 'tab-users.html'],
  ['tab-reports', 'admin-tab-reports', 'tab-reports.html'],
  ['tab-tools', 'admin-tab-tools', 'tab-tools.html']
];

class MockClassList {
  constructor(values = []) {
    this.values = new Set(values);
  }

  add(...values) {
    values.forEach(value => this.values.add(value));
  }

  remove(...values) {
    values.forEach(value => this.values.delete(value));
  }

  contains(value) {
    return this.values.has(value);
  }

  toggle(value, force) {
    const shouldAdd = force === undefined ? !this.contains(value) : force;
    if (shouldAdd) this.add(value);
    else this.remove(value);
    return shouldAdd;
  }
}

class MockElement {
  constructor(id, classes = []) {
    this.id = id;
    this.classList = new MockClassList(classes);
    this.attributes = {};
    this.listeners = {};
    this.hidden = false;
    this.tabIndex = 0;
    this.focused = false;
  }

  getAttribute(name) {
    return this.attributes[name] ?? null;
  }

  setAttribute(name, value) {
    this.attributes[name] = String(value);
  }

  addEventListener(name, callback) {
    this.listeners[name] = callback;
  }

  focus() {
    this.focused = true;
  }

  dispatch(name, event = {}) {
    this.listeners[name]?.({
      preventDefault() {
        event.defaultPrevented = true;
      },
      ...event
    });
  }
}

class MockMediaQuery {
  constructor(matches) {
    this.matches = matches;
    this.listeners = [];
  }

  addEventListener(name, callback) {
    if (name === 'change') this.listeners.push(callback);
  }

  setMatches(matches) {
    this.matches = matches;
    this.listeners.forEach(callback => callback({ matches }));
  }
}

function createAdminTabContext(isDesktop = false) {
  const buttons = tabDefinitions.map(([panelId, tabId], index) => {
    const button = new MockElement(tabId, [
      'admin-tab-btn',
      ...(index === 0 ? ['active', 'btn-primary'] : ['btn-outline'])
    ]);
    button.setAttribute('data-tab', panelId);
    return button;
  });
  const panels = tabDefinitions.map(([panelId], index) =>
    new MockElement(panelId, ['admin-tab-content', ...(index === 0 ? [] : ['hidden'])])
  );
  const elementsById = new Map([...buttons, ...panels].map(element => [element.id, element]));
  const tabList = new MockElement('admin-tab-list');
  tabList.setAttribute('aria-orientation', 'horizontal');
  const orientationQuery = new MockMediaQuery(!isDesktop);
  const calls = [];
  const context = {
    document: {
      getElementById: id => elementsById.get(id) || null,
      querySelector: selector => ({
        '[role="tablist"]': tabList
      }[selector] || null),
      querySelectorAll(selector) {
        if (selector === '.admin-tab-btn') return buttons;
        if (selector === '#admin-tab-container .admin-tab-content') return panels;
        return [];
      }
    },
    window: {
      matchMedia: () => orientationQuery
    },
    lucide: { createIcons() {} },
    renderGlobalQuestionBank: () => calls.push('tab-question-bank'),
    renderAdminCatalogs: () => calls.push('tab-catalogs'),
    renderAdminUsersTable: () => calls.push('tab-users'),
    renderAdminReports: () => calls.push('tab-reports'),
    populateRandomQuizForm: () => calls.push('tab-tools')
  };
  vm.createContext(context);
  vm.runInContext(moduleSource, context);
  return { context, buttons, panels, calls, tabList, orientationQuery };
}

test('initializes active tab and panel ARIA, hidden, and roving focus state', () => {
  const { context, buttons, panels, tabList } = createAdminTabContext();
  context.setupAdminTabs();

  assert.equal(tabList.getAttribute('aria-orientation'), 'horizontal');
  buttons.forEach((button, index) => {
    assert.equal(button.getAttribute('aria-selected'), String(index === 0));
    assert.equal(button.tabIndex, index === 0 ? 0 : -1);
    assert.equal(button.classList.contains('active'), index === 0);
  });
  panels.forEach((panel, index) => {
    assert.equal(panel.hidden, index !== 0);
    assert.equal(panel.getAttribute('aria-hidden'), String(index !== 0));
    assert.equal(panel.classList.contains('hidden'), index !== 0);
  });
});

test('activates tabs with arrow keys and Home/End while moving focus', () => {
  const { context, buttons, panels, calls } = createAdminTabContext();
  context.setupAdminTabs();

  buttons[0].dispatch('keydown', { key: 'ArrowRight' });
  assert.equal(buttons[1].focused, true);
  assert.equal(buttons[1].getAttribute('aria-selected'), 'true');
  assert.equal(panels[1].hidden, false);
  assert.equal(calls.at(-1), 'tab-catalogs');

  buttons[1].dispatch('keydown', { key: 'ArrowLeft' });
  assert.equal(buttons[0].getAttribute('aria-selected'), 'true');
  assert.equal(panels[0].hidden, false);

  buttons[0].dispatch('keydown', { key: 'End' });
  assert.equal(buttons.at(-1).focused, true);
  assert.equal(buttons.at(-1).getAttribute('aria-selected'), 'true');

  buttons.at(-1).dispatch('keydown', { key: 'Home' });
  assert.equal(buttons[0].getAttribute('aria-selected'), 'true');

  buttons[0].dispatch('keydown', { key: 'ArrowLeft' });
  assert.equal(buttons.at(-1).getAttribute('aria-selected'), 'true');
  buttons.at(-1).dispatch('keydown', { key: 'ArrowRight' });
  assert.equal(buttons[0].getAttribute('aria-selected'), 'true');
});

test('uses vertical arrow keys for the desktop sidebar and updates orientation on resize', () => {
  const { context, buttons, tabList, orientationQuery } = createAdminTabContext(true);
  context.setupAdminTabs();

  assert.equal(tabList.getAttribute('aria-orientation'), 'vertical');
  buttons[0].dispatch('keydown', { key: 'ArrowDown' });
  assert.equal(buttons[1].getAttribute('aria-selected'), 'true');
  buttons[1].dispatch('keydown', { key: 'ArrowRight' });
  assert.equal(buttons[1].getAttribute('aria-selected'), 'true');

  orientationQuery.setMatches(true);
  assert.equal(tabList.getAttribute('aria-orientation'), 'horizontal');
  buttons[1].dispatch('keydown', { key: 'ArrowRight' });
  assert.equal(buttons[2].getAttribute('aria-selected'), 'true');
});

test('activates a tab when it is clicked', () => {
  const { context, buttons, panels } = createAdminTabContext();
  context.setupAdminTabs();

  buttons[2].dispatch('click');

  assert.equal(buttons[2].getAttribute('aria-selected'), 'true');
  assert.equal(buttons[2].tabIndex, 0);
  assert.equal(panels[2].hidden, false);
  assert.equal(panels[0].hidden, true);
});

test('links every dashboard tab to its panel', () => {
  const dashboard = fs.readFileSync(path.join(root, 'views', 'admin', 'dashboard.html'), 'utf8');
  assert.match(dashboard, /<nav\b[^>]*aria-label="Điều hướng quản trị"/);
  assert.doesNotMatch(dashboard, /admin-sidebar-toggle/);
  assert.doesNotMatch(dashboard, /admin-sidebar-heading|KHU VỰC QUẢN TRỊ|admin-sidebar-header/);
  assert.match(dashboard, /role="tablist"[^>]*aria-label="Các mục quản trị"/);
  assert.match(dashboard, /<div class="admin-workspace">[\s\S]*<nav\b[^>]*class="admin-tabs"[\s\S]*<div id="admin-tab-container">/);

  for (const [panelId, tabId, templateName] of tabDefinitions) {
    const buttonTag = dashboard.match(new RegExp(`<button\\b[^>]*\\bid="${tabId}"[^>]*>`))?.[0];
    assert.ok(buttonTag, `Missing button ${tabId}`);
    assert.match(buttonTag, /role="tab"/);
    assert.match(buttonTag, new RegExp(`aria-controls="${panelId}"`));

    const template = fs.readFileSync(
      path.join(root, 'views', 'admin', 'tabs', templateName),
      'utf8'
    );
    const panelTag = template.match(new RegExp(`<div\\b[^>]*\\bid="${panelId}"[^>]*>`))?.[0];
    assert.ok(panelTag, `Missing panel ${panelId}`);
    assert.match(panelTag, /role="tabpanel"/);
    assert.match(panelTag, new RegExp(`aria-labelledby="${tabId}"`));
  }
});

test('places the tab navigation beside content on desktop and wraps it on smaller screens', () => {
  const responsiveStyles = fs.readFileSync(path.join(root, 'css', 'responsive.css'), 'utf8');
  assert.match(responsiveStyles, /\.admin-workspace\s*\{[^}]*grid-template-columns:\s*minmax\(7\.5rem,\s*8\.5rem\)\s+minmax\(0,\s*1fr\)/s);
  assert.match(responsiveStyles, /\.admin-tabs\s*\{[^}]*position:\s*sticky/s);
  assert.match(responsiveStyles, /\.admin-tab-btn\s*\{[^}]*min-height:\s*3\.125rem/s);
  assert.match(responsiveStyles, /\.admin-tab-btn svg\s*\{[^}]*width:\s*2rem/s);
  assert.match(responsiveStyles, /\.admin-tab-list\s*\{[^}]*gap:\s*var\(--space-2\)/s);
  assert.match(responsiveStyles, /@media screen and \(min-width: 851px\)\s*\{[\s\S]*--admin-menu-tile-size:\s*min\(7\.5rem,\s*max\(2\.5rem,\s*calc\(\(100dvh\s*-\s*10\.5rem\)\s*\/\s*6\)\)\)[\s\S]*\.admin-tab-list\s*\{[^}]*grid-template-columns:\s*minmax\(0,\s*1fr\)[\s\S]*\.admin-tab-btn\s*\{[^}]*aspect-ratio:\s*1/s);
  assert.match(responsiveStyles, /@media screen and \(min-width: 851px\)\s*\{[\s\S]*\.admin-tabs\s*\{[^}]*overflow:\s*visible/);
  assert.match(responsiveStyles, /@media screen and \(max-width: 850px\)\s*\{[\s\S]*\.admin-workspace\s*\{[^}]*grid-template-columns:\s*minmax\(0,\s*1fr\)/);
  assert.match(responsiveStyles, /@media screen and \(max-width: 850px\)\s*\{[\s\S]*\.admin-tabs\s*\{[^}]*position:\s*static/);
  assert.match(responsiveStyles, /@media screen and \(max-width: 850px\)\s*\{[\s\S]*\.admin-tab-list\s*\{[^}]*grid-template-columns:\s*repeat\(3,\s*minmax\(0,\s*1fr\)\)/);
  assert.match(responsiveStyles, /@media screen and \(max-width: 768px\)\s*\{[\s\S]*\.admin-tab-list\s*\{[^}]*grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\)/);
});
