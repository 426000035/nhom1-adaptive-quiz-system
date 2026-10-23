const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const root = path.join(__dirname, '..');
const moduleSource = fs.readFileSync(
  path.join(root, 'js', 'features', 'admin', 'admin-tools.js'),
  'utf8'
);

function createImportContext() {
  const status = { textContent: '' };
  const alerts = [];
  const readers = [];
  const context = {
    document: {
      getElementById: id => id === 'admin-import-status' ? status : null
    },
    FileReader: class {
      constructor() {
        this.error = null;
        readers.push(this);
      }

      readAsText(file) {
        this.file = file;
      }
    },
    Swal: { fire: message => alerts.push(message) },
    window: { AppState: { allQuizzes: [], allQuestions: [] } },
    saveQuizzesAndQuestionsToStorage() {},
    renderAdminQuizzesTable() {}
  };
  vm.createContext(context);
  vm.runInContext(moduleSource, context);
  return { context, status, alerts, readers };
}

function createInput(file) {
  return {
    files: file ? [file] : [],
    value: 'selected.json',
    disabled: false,
    attributes: {},
    setAttribute(name, value) {
      this.attributes[name] = value;
    }
  };
}

test('file import reports read failures and resets the input state', () => {
  const { context, status, alerts, readers } = createImportContext();
  const input = createInput({ name: 'broken.json' });
  context.importQuizzesFromJSON({ target: input });

  assert.equal(input.disabled, true);
  assert.equal(input.attributes['aria-busy'], 'true');
  assert.match(status.textContent, /Đang đọc/);

  readers[0].error = new Error('I/O failure');
  readers[0].onerror();

  assert.match(status.textContent, /I\/O failure/);
  assert.equal(alerts.at(-1).title, 'Không thể đọc file JSON');
  assert.equal(input.value, '');
  assert.equal(input.disabled, false);
  assert.equal(input.attributes['aria-busy'], 'false');
});

test('file import preserves existing behavior for a valid JSON quiz array', () => {
  let saved = false;
  let rendered = false;
  const { context, status, alerts, readers } = createImportContext();
  context.saveQuizzesAndQuestionsToStorage = () => { saved = true; };
  context.renderAdminQuizzesTable = () => { rendered = true; };
  const input = createInput({ name: 'quizzes.json' });
  context.importQuizzesFromJSON({ target: input });
  readers[0].onload({ target: { result: '[{"id":"quiz-1"}]' } });

  assert.deepEqual(JSON.parse(JSON.stringify(context.window.AppState.allQuizzes)), [{ id: 'quiz-1' }]);
  assert.equal(saved, true);
  assert.equal(rendered, true);
  assert.equal(status.textContent, 'Đã nhập 1 đề thi.');
  assert.equal(alerts.at(-1).icon, 'success');
  assert.equal(input.value, '');
});

test('invalid JSON structure is reported without changing the current data', () => {
  const { context, status, alerts, readers } = createImportContext();
  context.window.AppState.allQuizzes = [{ id: 'existing' }];
  const input = createInput({ name: 'invalid.json' });
  context.importQuizzesFromJSON({ target: input });
  readers[0].onload({ target: { result: '{"id":"not-an-array"}' } });

  assert.deepEqual(JSON.parse(JSON.stringify(context.window.AppState.allQuizzes)), [{ id: 'existing' }]);
  assert.match(status.textContent, /Cấu trúc file JSON không hợp lệ/);
  assert.equal(alerts.at(-1).icon, 'error');
  assert.equal(input.value, '');
});

test('failed persistence restores the previous quizzes and questions in memory', () => {
  const { context, status, alerts, readers } = createImportContext();
  const existingQuizzes = [{ id: 'existing' }];
  const existingQuestions = [{ id: 'existing-question' }];
  context.window.AppState.allQuizzes = existingQuizzes;
  context.window.AppState.allQuestions = existingQuestions;
  context.saveQuizzesAndQuestionsToStorage = () => {
    context.window.AppState.allQuestions = [{ id: 'partial-import' }];
    throw new Error('Storage quota exceeded');
  };
  const input = createInput({ name: 'quizzes.json' });
  context.importQuizzesFromJSON({ target: input });
  readers[0].onload({ target: { result: '[{"id":"new-quiz"}]' } });

  assert.equal(context.window.AppState.allQuizzes, existingQuizzes);
  assert.equal(context.window.AppState.allQuestions, existingQuestions);
  assert.match(status.textContent, /Storage quota exceeded/);
  assert.equal(alerts.at(-1).title, 'Không thể lưu dữ liệu đã nhập');
  assert.equal(input.disabled, false);
  assert.equal(input.value, '');
});

test('aborted file reads report cancellation and reset the input', () => {
  const { context, status, readers } = createImportContext();
  const input = createInput({ name: 'quizzes.json' });
  context.importQuizzesFromJSON({ target: input });

  readers[0].onabort();

  assert.match(status.textContent, /Đã hủy/);
  assert.equal(input.disabled, false);
  assert.equal(input.value, '');
  assert.equal(input.attributes['aria-busy'], 'false');
});

test('invalid JSON text is reported and leaves current data unchanged', () => {
  const { context, status, alerts, readers } = createImportContext();
  const existingQuizzes = [{ id: 'existing' }];
  context.window.AppState.allQuizzes = existingQuizzes;
  const input = createInput({ name: 'invalid.json' });
  context.importQuizzesFromJSON({ target: input });
  readers[0].onload({ target: { result: '{bad json' } });

  assert.equal(context.window.AppState.allQuizzes, existingQuizzes);
  assert.match(status.textContent, /Unexpected token|Expected property name/);
  assert.equal(alerts.at(-1).title, 'Không thể nhập file JSON');
  assert.equal(input.disabled, false);
  assert.equal(input.value, '');
});
