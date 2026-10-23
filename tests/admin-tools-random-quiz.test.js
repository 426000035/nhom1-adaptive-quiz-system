const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const toolsSource = fs.readFileSync(
  path.join(__dirname, '..', 'js', 'features', 'admin', 'admin-tools.js'),
  'utf8'
);

test('opens the quiz edit form after a random quiz is saved successfully', async () => {
  const question = { id: 'question_1', questionId: 'question_1', subjectId: 'subject_math', skillId: 'skill_math' };
  const allocation = { value: '1', max: '1', dataset: { skillId: 'skill_math' } };
  const elements = new Map([
    ['random-subject-select', { value: 'subject_math' }],
    ['random-time-input', { value: '15' }],
    ['random-title-input', { value: 'Đề Toán ngẫu nhiên' }]
  ]);
  let saved = false;
  let rendered = false;
  let editedQuiz = null;
  const alerts = [];
  const context = {
    document: {
      getElementById: id => elements.get(id) || null,
      querySelectorAll: selector => selector === '.random-skill-count' ? [allocation] : []
    },
    window: {
      AdminCatalogCache: { subjects: [{ subjectId: 'subject_math', name: 'Toán' }] },
      AppState: { allQuizzes: [], allQuestions: [question] },
      LocalStorageDB: {
        read: () => ({
          questions: [{
            questionId: 'question_1',
            subjectId: 'subject_math',
            skillId: 'skill_math',
            status: 'active'
          }]
        })
      }
    },
    saveQuizzesAndQuestionsToStorage() {
      saved = true;
    },
    renderAdminQuizzesTable() {
      rendered = true;
    },
    async openQuizEditModal(quiz, title) {
      editedQuiz = { quiz, title };
      return true;
    },
    Swal: { fire: message => alerts.push(message) }
  };
  vm.createContext(context);
  vm.runInContext(toolsSource, context);

  await context.generateRandomQuiz({ preventDefault() {} });

  assert.equal(saved, true);
  assert.equal(rendered, true);
  assert.equal(context.window.AppState.allQuizzes.length, 1);
  assert.equal(editedQuiz.quiz, context.window.AppState.allQuizzes[0]);
  assert.equal(editedQuiz.quiz.title, 'Đề Toán ngẫu nhiên');
  assert.equal(editedQuiz.title, 'Hoàn Thiện Thông Tin Đề Ngẫu Nhiên');
  assert.deepEqual(alerts, []);
});
