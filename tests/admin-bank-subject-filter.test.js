const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const utilitySource = fs.readFileSync(
  path.join(__dirname, '..', 'js', 'core', 'utils.js'),
  'utf8'
);
const source = fs.readFileSync(
  path.join(__dirname, '..', 'js', 'features', 'admin', 'admin-bank.js'),
  'utf8'
);
const context = vm.createContext({});
vm.runInContext(source, context);

test('matches bank questions by subject ID and falls back to topic for legacy records', () => {
  const matches = context.questionMatchesQuizSubject;
  const quiz = { subjectId: 'subject_math', topic: 'Toán' };

  assert.equal(matches({ subjectId: 'subject_math', topic: 'Algebra' }, quiz), true);
  assert.equal(matches({ subjectId: 'subject_science', topic: 'Toán' }, quiz), false);
  assert.equal(matches({ topic: 'Toán' }, quiz), true);
  assert.equal(matches({ topic: 'Khoa học' }, quiz), false);
  assert.equal(matches({ question: 'Thiếu thông tin môn học' }, quiz), false);
});

test('matches legacy quizzes by topic and excludes questions with unknown topics', () => {
  const matches = context.questionMatchesQuizSubject;
  const quiz = { topic: 'Toán' };

  assert.equal(matches({ topic: 'toán' }, quiz), true);
  assert.equal(matches({ topic: 'Khoa học' }, quiz), false);
  assert.equal(matches({ subjectId: 'subject_math' }, quiz), false);
});

test('select-all question helper returns every filtered match across pages for the assigned subject', () => {
  const input = { value: 'fractions' };
  const helperContext = vm.createContext({
    document: {
      getElementById: id => id === 'search-modal-bank' ? input : null
    },
    window: {
      AppState: {
        listsState: { modalBank: { searchText: '', sort: 'DATE_DESC', currentPage: 1, pageSize: 10 } },
        allQuestions: [
          { id: 'q1', subjectId: 'math', question: 'Fractions introduction' },
          { id: 'q2', subjectId: 'math', question: 'Fractions practice' },
          { id: 'q3', subjectId: 'math', question: 'Geometry' },
          { id: 'q4', subjectId: 'science', question: 'Fractions in science' }
        ]
      }
    },
    sortListByDate: records => records
  });
  vm.runInContext(utilitySource, helperContext);
  vm.runInContext(source, helperContext);

  const matches = Array.from(helperContext.getFilteredBankQuestions({
    subjectId: 'math',
    questions: []
  }), question => question.id);

  assert.deepEqual(matches, ['q1', 'q2']);
});

test('question selection modal offers select-all constrained by the active filters', () => {
  const modal = fs.readFileSync(
    path.join(__dirname, '..', 'views', 'shared', 'modals.html'),
    'utf8'
  );
  assert.match(modal, /id="chk-select-filtered-bank"[^>]*aria-label="Chọn tất cả câu hỏi theo bộ lọc"/);
  assert.match(modal, /<span>Tất cả<\/span>/);
  assert.match(source, /getFilteredBankQuestions\(quiz\)\.forEach\(question =>/);
  assert.match(source, /updateBankFilteredSelectionCheckbox\(filteredQuestions\)/);
});
