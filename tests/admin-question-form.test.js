const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const source = fs.readFileSync(
  path.join(__dirname, '..', 'js', 'features', 'admin', 'admin-bank.js'),
  'utf8'
);

class MockElement {
  constructor(tagName = 'div') {
    this.tagName = tagName;
    this.children = [];
    this.dataset = {};
    this.attributes = {};
    this.classList = { add() {}, remove() {} };
    this.value = '';
    this.checked = false;
    this.disabled = false;
    this.textContent = '';
  }

  append(...children) {
    this.children.push(...children);
  }

  appendChild(child) {
    this.children.push(child);
  }

  replaceChildren(...children) {
    this.children = children;
  }

  setAttribute(name, value) {
    this.attributes[name] = value;
  }
}

function createQuestionForm() {
  const elements = new Map();
  const getElementById = id => {
    if (!elements.has(id)) elements.set(id, new MockElement());
    return elements.get(id);
  };
  const container = getElementById('q-form-options');
  const document = {
    body: new MockElement('body'),
    getElementById,
    createElement: tagName => new MockElement(tagName),
    querySelectorAll(selector) {
      const rows = container.children;
      if (selector === '#q-form-options [data-question-option]') {
        return rows.map(row => row.children[1]);
      }
      if (selector === '#q-form-options [data-correct-answer]:checked') {
        return rows.map(row => row.children[0].children[0]).filter(input => input.checked);
      }
      return [];
    }
  };
  [
    'q-form-id',
    'q-form-text',
    'q-form-type',
    'q-form-explanation',
    'q-form-topic',
    'q-form-skill',
    'q-form-difficulty',
    'modal-question-form',
    'modal-question-title'
  ].forEach(getElementById);
  const quiz = {
    id: 'quiz_1',
    subjectId: 'subject_1',
    topic: 'Toán',
    questions: []
  };
  const context = {
    console,
    document,
    window: {
      AppState: {
        allQuizzes: [quiz],
        selectedQuizIdForAdmin: 'quiz_1'
      },
      AdminCatalogs: {
        getActiveCatalogs: async () => ({
          subjects: [{ subjectId: 'subject_1', name: 'Toán' }],
          skills: [{ skillId: 'skill_1', subjectId: 'subject_1', name: 'Đại số' }],
          difficulties: [{ difficultyId: 'difficulty_1', label: 'Easy', rank: 1 }]
        })
      }
    },
    Swal: { fire() {} },
    updateQuizGenerationSpec() {},
    saveQuizzesAndQuestionsToStorage() {},
    closeQuestionModal() {},
    renderGlobalQuestionBank() {},
    renderSelectedQuizQuestions() {},
    renderAdminQuizzesTable() {}
  };
  vm.createContext(context);
  vm.runInContext(source, context);
  context.renderGlobalQuestionBank = () => {};
  context.renderAdminQuizzesTable = () => {};
  return { context, elements, container, quiz };
}

test('question editor renders any number of options and preserves multiple correct selections', () => {
  const { context, container, elements } = createQuestionForm();
  const options = Array.from({ length: 8 }, (_, index) => `Phương án ${index + 1}`);

  context.setQuestionFormValues({
    id: 'question_1',
    type: 'multiple',
    question: 'Chọn các đáp án đúng',
    options,
    correctAnswer: [1, 5]
  });

  assert.equal(container.children.length, 8);
  assert.deepEqual(
    Array.from(context.readQuestionOptionForm().options),
    options
  );
  assert.deepEqual(
    Array.from(context.readQuestionOptionForm().correctAnswer),
    [1, 5]
  );
  assert.equal(elements.get('q-form-type').value, 'multiple');
});

test('question editor maps legacy blank options without losing answer indexes', () => {
  const { context, container } = createQuestionForm();

  context.setQuestionFormValues({
    type: 'single',
    options: ['A', 'B', '', ''],
    correctAnswer: [1]
  });

  assert.deepEqual(
    Array.from(context.readQuestionOptionForm().options),
    ['A', 'B']
  );
  assert.deepEqual(
    Array.from(context.readQuestionOptionForm().correctAnswer),
    [1]
  );
  assert.equal(container.children.length, 2);
});

test('saving a multiple-choice question persists all options and correct answers', async () => {
  const { context, elements, quiz } = createQuestionForm();
  context.setQuestionFormValues({
    type: 'multiple',
    options: ['A', 'B', 'C', 'D', 'E', 'F', 'G'],
    correctAnswer: [0, 3, 6]
  });
  elements.get('q-form-text').value = 'Chọn nhiều phương án';
  elements.get('q-form-topic').value = 'subject_1';
  elements.get('q-form-skill').value = 'skill_1';
  elements.get('q-form-difficulty').value = 'difficulty_1';

  await context.saveQuestionFromModal();

  assert.equal(quiz.questions.length, 1);
  assert.equal(quiz.questions[0].type, 'multiple');
  assert.deepEqual(Array.from(quiz.questions[0].options), ['A', 'B', 'C', 'D', 'E', 'F', 'G']);
  assert.deepEqual(Array.from(quiz.questions[0].correctAnswer), [0, 3, 6]);
});
