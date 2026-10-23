const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const source = fs.readFileSync(
  path.join(__dirname, '..', 'js', 'features', 'student', 'student-view.js'),
  'utf8'
);
const dashboardSource = fs.readFileSync(
  path.join(__dirname, '..', 'js', 'features', 'student', 'student-dashboard.js'),
  'utf8'
);
const componentStyles = fs.readFileSync(
  path.join(__dirname, '..', 'css', 'components.css'),
  'utf8'
);
const responsiveStyles = fs.readFileSync(
  path.join(__dirname, '..', 'css', 'responsive.css'),
  'utf8'
);
const dashboardHtml = fs.readFileSync(
  path.join(__dirname, '..', 'views', 'student', 'dashboard.html'),
  'utf8'
);
const resultHtml = fs.readFileSync(
  path.join(__dirname, '..', 'views', 'student', 'result.html'),
  'utf8'
);

class MockElement {
  constructor() {
    this.children = [];
    this.attributes = {};
    this.classes = new Set();
    this.classList = {
      add: value => this.classes.add(value),
      toggle: (value, force) => {
        if (force) this.classes.add(value);
        else this.classes.delete(value);
      }
    };
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

  set innerHTML(value) {
    this.html = value;
    this.children = [];
  }
}

function createResultContext() {
  const ids = [
    'result-page-title',
    'result-score-number',
    'result-quiz-name',
    'result-skill-analysis',
    'skills-chart-legend',
    'review-section-label',
    'wrong-questions-container',
    'result-return-label'
  ];
  const elements = new Map(ids.map(id => [id, new MockElement()]));
  const aiBanner = new MockElement();
  const context = {
    document: {
      getElementById: id => elements.get(id) || null,
      querySelector: selector => selector === '.ai-banner' ? aiBanner : null,
      createElement: () => new MockElement()
    },
    window: {
      QuizEngine: {
        WEAK_SKILL_THRESHOLD: 60,
        renderChart() {}
      }
    }
  };
  vm.createContext(context);
  vm.runInContext(source, context);
  return { context, elements, aiBanner };
}

test('shared teacher result view shows every question and labels strong and weak skills', () => {
  const { context, elements, aiBanner } = createResultContext();
  context.window.renderQuizResultPage({
    score: 5,
    subjectStats: {
      math: {
        subjectName: 'Toán',
        total: 2,
        correct: 1,
        skills: {
          strong: { skillName: 'Đại số', total: 1, correct: 1 },
          weak: { skillName: 'Hình học', total: 1, correct: 0 }
        }
      }
    },
    reviewQuestions: [
      {
        question: 'Câu đúng',
        options: ['Đáp án A', 'Đáp án B'],
        userSelection: [0],
        correctAnswer: [0],
        isCorrect: true
      },
      {
        question: 'Câu sai',
        options: ['Đáp án C', 'Đáp án D'],
        userSelection: [0],
        correctAnswer: [1],
        isCorrect: false
      }
    ],
    wrongQuestions: []
  }, 'An · Đề Toán', { teacherReview: true });

  assert.equal(elements.get('result-page-title').textContent, 'Chi tiết kết quả bài làm');
  assert.equal(elements.get('result-quiz-name').textContent, 'Đề thi: An · Đề Toán');
  assert.equal(elements.get('review-section-label').textContent, 'Chi tiết tất cả câu hỏi');
  assert.equal(elements.get('wrong-questions-container').children.length, 2);
  assert.equal(elements.get('wrong-questions-container').children[0].classes.has('is-correct'), true);
  assert.equal(elements.get('wrong-questions-container').children[1].classes.has('is-incorrect'), true);
  assert.equal(elements.get('result-return-label').textContent, 'Quay lại lịch sử nộp bài');
  assert.equal(aiBanner.classes.has('hidden'), true);
  assert.equal(elements.get('skills-chart-legend').children[0].textContent, 'Đạt 50%');
  assert.equal(
    elements.get('skills-chart-legend').children[0].attributes['aria-label'],
    'Toán: Đạt 50%'
  );

  const skillRows = elements.get('result-skill-analysis').children[0].children.slice(2);
  assert.match(skillRows[0].children[2].textContent, /Mạnh/);
  assert.match(skillRows[1].children[2].textContent, /Cần củng cố/);
  assert.match(skillRows[0].children[1].className, /skill-analysis-progress/);
});

test('result and student statistics skill bars share a responsive grid layout', () => {
  assert.match(source, /progress\.className = `skill-analysis-progress/);
  assert.match(dashboardSource, /progress\.className = `skill-analysis-progress/);
  assert.match(resultHtml, /id="result-skill-analysis" class="skill-analysis-list"/);
  assert.match(dashboardHtml, /id="student-learning-progress" class="learning-progress-list"/);
  assert.match(componentStyles, /\.skill-analysis-row\s*\{\s*display:\s*grid[^}]*grid-template-areas:[^}]*"progress progress"/s);
  assert.match(componentStyles, /\.skill-analysis-progress\s*\{[^}]*grid-area:\s*progress[^}]*width:\s*100%/s);
  assert.match(responsiveStyles, /@media screen and \(max-width: 992px\)[\s\S]*\.result-summary-card/);
});

test('shared student result view shows correct and incorrect questions', () => {
  const { context, elements, aiBanner } = createResultContext();
  context.window.renderQuizResultPage({
    score: 5,
    subjectStats: {},
    reviewQuestions: [
      { question: 'Câu đúng', options: ['A', 'B'], userSelection: [0], correctAnswer: [0], isCorrect: true },
      { question: 'Câu sai', options: ['A', 'B'], userSelection: [0], correctAnswer: [1], isCorrect: false }
    ],
    wrongQuestions: [{ question: 'Câu sai', options: ['A', 'B'], userSelection: [0], correctAnswer: [1] }]
  }, 'Đề Toán');

  assert.equal(elements.get('result-page-title').textContent, 'Chi tiết kết quả bài làm');
  assert.equal(elements.get('review-section-label').textContent, 'Chi tiết tất cả câu hỏi');
  assert.equal(elements.get('wrong-questions-container').children.length, 2);
  assert.equal(aiBanner.classes.has('hidden'), false);
});
