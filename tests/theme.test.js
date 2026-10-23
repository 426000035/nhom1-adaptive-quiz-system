const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const themeSource = fs.readFileSync(
  path.join(__dirname, '..', 'js', 'core', 'theme.js'),
  'utf8'
);

function createThemeManager({ sessionTheme = null, currentUser = null, hour = 12 } = {}) {
  const storedValues = new Map();
  if (sessionTheme !== null) storedValues.set('adaptive_quiz_theme_override', sessionTheme);
  const toggle = {
    attributes: {},
    listeners: {},
    addEventListener(eventName, callback) {
      this.listeners[eventName] = callback;
    },
    setAttribute(name, value) {
      this.attributes[name] = value;
    }
  };
  const toggleLabel = { textContent: 'Dark mode' };
  const context = {
    Date: class {
      getHours() {
        return hour;
      }
    },
    console: { error() {}, warn() {} },
    document: {
      body: { dataset: {} },
      getElementById: id => id === 'theme-toggle'
        ? toggle
        : id === 'theme-toggle-label' ? toggleLabel : null,
      addEventListener() {}
    },
    sessionStorage: {
      getItem: key => storedValues.get(key) ?? null,
      setItem: (key, value) => storedValues.set(key, value),
      removeItem: key => storedValues.delete(key)
    },
    window: { Auth: { getCurrentUser: () => currentUser } },
    setInterval() {
      return 1;
    },
    clearInterval() {}
  };
  vm.createContext(context);
  vm.runInContext(themeSource, context);
  return { manager: context.window.ThemeManager, context, toggle, toggleLabel, storedValues };
}

test('theme selector exposes only morning and evening themes', () => {
  const { manager } = createThemeManager();
  assert.deepEqual(Array.from(manager.availableThemes), ['morning', 'evening']);
  assert.equal(manager.setManualTheme('noon'), false);
});

test('automatic theme uses morning from 06:00 through 17:59 and evening otherwise', () => {
  const { manager } = createThemeManager();
  for (const hour of [6, 11, 12, 17]) {
    assert.equal(manager.getAutomaticTheme({ getHours: () => hour }), 'morning');
  }
  for (const hour of [0, 5, 18, 23]) {
    assert.equal(manager.getAutomaticTheme({ getHours: () => hour }), 'evening');
  }
});

test('legacy noon session override is removed and replaced with the automatic theme', () => {
  const { manager, context, toggle, storedValues } = createThemeManager({
    sessionTheme: 'noon',
    currentUser: { id: 'student-1' },
    hour: 12
  });
  assert.equal(manager.restoreSessionTheme(), true);
  assert.equal(context.document.body.dataset.theme, 'morning');
  assert.equal(manager.manualTheme, null);
  assert.equal(storedValues.has('adaptive_quiz_theme_override'), false);
  assert.equal(toggle.attributes['aria-pressed'], 'false');
  assert.equal(toggle.attributes['aria-label'], 'Bật chế độ tối');
});

test('theme toggle has a clear accessible label and updates its state', () => {
  const root = path.join(__dirname, '..');
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  assert.match(html, /id="theme-toggle"[^>]*aria-label="Bật chế độ tối"[^>]*aria-pressed="false"/);
  assert.match(html, /<span id="theme-toggle-label">Dark mode<\/span>/);
  assert.doesNotMatch(html, /theme-slider|data-theme-choice/);

  const { manager, context, toggle, toggleLabel } = createThemeManager({ hour: 12 });
  manager.applyTheme('evening');
  assert.equal(context.document.body.dataset.theme, 'evening');
  assert.equal(toggleLabel.textContent, 'Light mode');
  assert.equal(toggle.attributes['aria-pressed'], 'true');
  assert.equal(toggle.attributes['aria-label'], 'Tắt chế độ tối');
  manager.applyTheme('morning');
  assert.equal(toggleLabel.textContent, 'Dark mode');
  assert.equal(toggle.attributes['aria-pressed'], 'false');
  assert.equal(toggle.attributes['aria-label'], 'Bật chế độ tối');
});

test('clicking the toggle manually changes theme and keeps the override for the login session', () => {
  const { manager, context, toggle, toggleLabel, storedValues } = createThemeManager({
    currentUser: { id: 'student-1' },
    hour: 12
  });
  manager.init();
  assert.equal(context.document.body.dataset.theme, 'morning');

  toggle.listeners.click();

  assert.equal(context.document.body.dataset.theme, 'evening');
  assert.equal(manager.manualTheme, 'evening');
  assert.equal(toggleLabel.textContent, 'Light mode');
  assert.equal(storedValues.get('adaptive_quiz_theme_override'), 'evening');
  assert.equal(toggle.attributes['aria-pressed'], 'true');
});
