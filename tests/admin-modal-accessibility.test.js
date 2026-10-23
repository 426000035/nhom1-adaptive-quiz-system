const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const root = path.join(__dirname, '..');
const adminCoreSource = fs.readFileSync(
  path.join(root, 'js', 'features', 'admin', 'admin-core.js'),
  'utf8'
);
const modalsSource = fs.readFileSync(
  path.join(root, 'views', 'shared', 'modals.html'),
  'utf8'
);
const modalCloseButtons = {
  'modal-manage-questions': 'btn-close-questions-modal',
  'modal-select-from-bank': 'btn-cancel-bank-select',
  'modal-quiz-form': 'btn-cancel-quiz-form',
  'modal-quiz-assignment': 'btn-cancel-quiz-assignment',
  'modal-user-classes': 'btn-cancel-user-classes',
  'modal-question-form': 'btn-cancel-q-form'
};

class MockClassList {
  constructor(values = [], onChange = () => {}) {
    this.values = new Set(values);
    this.onChange = onChange;
  }

  contains(value) {
    return this.values.has(value);
  }

  add(value) {
    this.values.add(value);
    this.onChange();
  }

  remove(value) {
    this.values.delete(value);
    this.onChange();
  }
}

class MockElement {
  constructor(id, document, classes = []) {
    this.id = id;
    this.document = document;
    this.attributes = {};
    this.listeners = {};
    this.hidden = false;
    this.isConnected = true;
    this.focusables = [];
    this.dialog = null;
    this.classList = new MockClassList(classes);
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

  querySelectorAll() {
    return this.focusables;
  }

  querySelector(selector) {
    return selector === '[role="dialog"]' ? this.dialog : null;
  }

  contains(element) {
    return element === this || this.focusables.includes(element) || element === this.dialog;
  }

  closest() {
    return null;
  }

  focus() {
    this.document.activeElement = this;
  }

  click() {
    this.onClick?.();
  }
}

function createModalContext() {
  const document = {
    activeElement: null,
    listeners: {},
    addEventListener(name, callback) {
      this.listeners[name] = callback;
    },
    querySelectorAll(selector) {
      return selector === '.admin-modal' ? [modal] : [];
    },
    getElementById(id) {
      return elementsById.get(id) || null;
    }
  };
  const opener = new MockElement('opener', document);
  const modal = new MockElement('modal-quiz-form', document, ['admin-modal', 'hidden']);
  const dialog = new MockElement('dialog', document);
  const firstControl = new MockElement('first-control', document);
  const lastControl = new MockElement('last-control', document);
  const closeButton = new MockElement('btn-cancel-quiz-form', document);
  modal.dialog = dialog;
  modal.focusables = [firstControl, lastControl];
  dialog.focus = () => {
    document.activeElement = dialog;
  };
  let observerCallback;
  modal.classList.onChange = () => observerCallback?.([{ target: modal }]);
  closeButton.onClick = () => modal.classList.add('hidden');
  const elementsById = new Map([[closeButton.id, closeButton]]);
  const context = {
    document,
    window: { getComputedStyle: () => ({ zIndex: '1000' }) },
    MutationObserver: class {
      constructor(callback) {
        observerCallback = callback;
      }

      observe() {}
    }
  };

  vm.createContext(context);
  vm.runInContext(adminCoreSource, context);
  document.activeElement = opener;
  context.setupAdminModalAccessibility();

  return { context, document, opener, modal, dialog, firstControl, lastControl, closeButton };
}

test('admin modal dialogs have labels, modal semantics, and synchronized initial state', () => {
  Object.keys(modalCloseButtons).forEach(modalId => {
    const rootTag = modalsSource.match(new RegExp(`<div\\b[^>]*\\bid="${modalId}"[^>]*>`))?.[0];
    assert.ok(rootTag, `Missing admin modal ${modalId}`);
    assert.match(rootTag, /class="[^"]*admin-modal[^"]*"/);
    assert.match(rootTag, /aria-hidden="true"/);

    const modalStart = modalsSource.indexOf(rootTag);
    const dialogTag = modalsSource.slice(modalStart).match(/<div\b[^>]*role="dialog"[^>]*>/)?.[0];
    assert.ok(dialogTag, `${modalId} has no dialog element`);
    assert.match(dialogTag, /aria-modal="true"/);
    const labelledBy = dialogTag.match(/\baria-labelledby="([^"]+)"/)?.[1];
    assert.ok(labelledBy, `${modalId} dialog has no accessible name`);
    assert.match(modalsSource, new RegExp(`\\bid="${labelledBy}"`));
  });
});

test('student assignment and class assignment dialogs share stacked sizing rules', () => {
  ['modal-quiz-assignment', 'modal-user-classes'].forEach(modalId => {
    const rootTag = modalsSource.match(new RegExp(`<div\\b[^>]*\\bid="${modalId}"[^>]*>`))?.[0];
    const modalStart = modalsSource.indexOf(rootTag);
    const dialogTag = modalsSource.slice(modalStart).match(/<div\b[^>]*role="dialog"[^>]*>/)?.[0];
    assert.match(dialogTag, /admin-modal-dialog--stacked/);
  });

  const componentStyles = fs.readFileSync(path.join(root, 'css', 'components.css'), 'utf8');
  assert.match(componentStyles, /\.admin-modal-dialog--stacked\s*\{[^}]*max-height:\s*88vh[^}]*gap:\s*var\(--space-4\)[^}]*padding:\s*1\.25rem/s);
});

test('admin modal variants override base card sizing and alignment', () => {
  const componentStyles = fs.readFileSync(path.join(root, 'css', 'components.css'), 'utf8');
  assert.ok(componentStyles.indexOf('.admin-modal .modal-card.admin-modal-dialog {') > componentStyles.indexOf('.modal-card {'));
  assert.match(componentStyles, /\.admin-modal \.modal-card\.admin-modal-dialog\s*\{[^}]*text-align:\s*left/s);
  assert.match(componentStyles, /\.admin-modal \.modal-card\.admin-modal-dialog--manage-questions\s*\{[^}]*max-width:\s*950px/s);
  assert.match(componentStyles, /\.admin-modal \.modal-card\.admin-modal-dialog--select-bank\s*\{[^}]*max-width:\s*850px/s);
  assert.match(componentStyles, /\.admin-modal \.modal-card\.admin-modal-dialog--quiz-form\s*\{[^}]*max-width:\s*920px/s);
  assert.match(componentStyles, /\.admin-modal \.modal-card\.admin-modal-dialog--quiz-assignment\s*\{[^}]*max-width:\s*900px/s);
  assert.match(componentStyles, /\.admin-modal \.modal-card\.admin-modal-dialog--user-classes\s*\{[^}]*max-width:\s*620px/s);
});

test('quiz and question forms share the responsive editor layout', () => {
  assert.match(modalsSource, /id="modal-quiz-form"[^]*?class="[^"]*admin-editor-card/);
  assert.match(modalsSource, /id="form-manage-quiz" class="admin-editor-form"/);
  assert.match(modalsSource, /id="modal-question-form"[^]*?class="[^"]*admin-editor-card/);
  assert.match(modalsSource, /class="question-form-body admin-editor-body"/);
  assert.match(modalsSource, /class="question-form-footer admin-editor-footer"/);

  const componentStyles = fs.readFileSync(path.join(root, 'css', 'components.css'), 'utf8');
  assert.match(componentStyles, /\.question-form-card,\s*\.admin-editor-card\s*\{[^}]*max-width:\s*920px[^}]*overflow:\s*hidden/s);
  assert.match(componentStyles, /\.question-form-body,\s*\.admin-editor-body\s*\{[^}]*overflow-y:\s*auto/s);
});

test('button base variants keep their original semantic colors and states', () => {
  const componentStyles = fs.readFileSync(path.join(root, 'css', 'components.css'), 'utf8');
  assert.match(componentStyles, /\.btn-primary\s*\{[^}]*background:\s*var\(--primary\)[^}]*color:\s*var\(--primary-contrast\)/s);
  assert.match(componentStyles, /\.btn-outline\s*\{[^}]*background:\s*transparent[^}]*color:\s*var\(--text-main\)[^}]*border-color:\s*var\(--border-color\)/s);
  assert.match(componentStyles, /\.btn-outline:hover\s*\{[^}]*background:\s*var\(--control-hover\)/s);
});

test('opening an admin modal moves focus inside and traps Tab navigation', () => {
  const { document, opener, modal, firstControl, lastControl } = createModalContext();

  modal.classList.remove('hidden');
  assert.equal(modal.hidden, false);
  assert.equal(modal.getAttribute('aria-hidden'), 'false');
  assert.equal(document.activeElement, firstControl);

  document.activeElement = lastControl;
  let prevented = false;
  document.listeners.keydown({
    key: 'Tab',
    shiftKey: false,
    target: lastControl,
    preventDefault() {
      prevented = true;
    }
  });
  assert.equal(prevented, true);
  assert.equal(document.activeElement, firstControl);

  document.activeElement = firstControl;
  document.listeners.keydown({
    key: 'Tab',
    shiftKey: true,
    target: firstControl,
    preventDefault() {
      prevented = true;
    }
  });
  assert.equal(document.activeElement, lastControl);
  assert.notEqual(document.activeElement, opener);
});

test('Escape closes the top modal and restores focus to its opener', () => {
  const { document, opener, modal, closeButton } = createModalContext();
  modal.classList.remove('hidden');
  document.activeElement = closeButton;
  let prevented = false;

  document.listeners.keydown({
    key: 'Escape',
    target: closeButton,
    preventDefault() {
      prevented = true;
    }
  });

  assert.equal(prevented, true);
  assert.equal(modal.classList.contains('hidden'), true);
  assert.equal(modal.hidden, true);
  assert.equal(modal.getAttribute('aria-hidden'), 'true');
  assert.equal(document.activeElement, opener);
});
