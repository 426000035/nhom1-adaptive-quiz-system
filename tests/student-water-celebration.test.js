const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const mascotSource = fs.readFileSync(
  path.join(__dirname, '..', 'js', 'features', 'student', 'mascot.js'),
  'utf8'
);
const studentViewSource = fs.readFileSync(
  path.join(__dirname, '..', 'js', 'features', 'student', 'student-view.js'),
  'utf8'
);

function createClassList(initial = []) {
  const values = new Set(initial);
  return {
    values,
    add(value) { values.add(value); },
    remove(value) { values.delete(value); },
    contains(value) { return values.has(value); }
  };
}

test('full water bucket opens a large accessible celebration and closes with Escape', () => {
  const listeners = {};
  const idElement = { removeAttribute(name) { this.removedAttribute = name; } };
  const handlePath = { setAttribute(name, value) { this[name] = value; } };
  const gradientDefinition = { remove() { this.removed = true; } };
  const bucketClone = {
    classList: createClassList(),
    attributes: {},
    setAttribute(name, value) { this.attributes[name] = value; },
    querySelectorAll(selector) {
      if (selector === '[id]') return [idElement];
      if (selector === 'defs') return [gradientDefinition];
      return [];
    },
    querySelector(selector) {
      if (selector === '.bucket-handle-svg path') return handlePath;
      return null;
    }
  };
  const mascotBucket = { cloneNode() { return bucketClone; } };
  const bucketHolder = {
    children: [],
    replaceChildren() { this.children = []; },
    appendChild(child) { this.children.push(child); }
  };
  const modal = {
    hidden: true,
    dataset: {},
    attributes: { 'aria-hidden': 'true' },
    classList: createClassList(['hidden']),
    offsetWidth: 1,
    addEventListener(type, callback) { listeners[`modal:${type}`] = callback; },
    setAttribute(name, value) { this.attributes[name] = value; }
  };
  const countLabel = { textContent: '' };
  const floatingMascot = { classList: createClassList() };
  let focused = false;
  const closeButton = { focus() { focused = true; } };
  let escapeHandler;
  let confettiCalls = 0;
  const context = {
    console,
    window: { matchMedia: () => ({ matches: false }) },
    document: {
      activeElement: { isConnected: true, focus() {} },
      getElementById(id) {
        if (id === 'water-bucket-celebration') return modal;
        if (id === 'water-celebration-count') return countLabel;
        if (id === 'water-celebration-bucket-holder') return bucketHolder;
        if (id === 'btn-close-water-celebration') return closeButton;
        if (id === 'student-mascot-floating') return floatingMascot;
        return null;
      },
      querySelector(selector) {
        return selector === '#student-mascot-container .mascot-bucket-art' ? mascotBucket : null;
      },
      addEventListener(type, callback) {
        if (type === 'keydown') escapeHandler = callback;
      }
    },
    confetti() { confettiCalls++; }
  };
  vm.createContext(context);
  vm.runInContext(mascotSource, context);

  context.window.MascotEngine.celebrateFullBucket(3);

  assert.equal(modal.hidden, false);
  assert.equal(modal.attributes['aria-hidden'], 'false');
  assert.equal(modal.classList.contains('is-celebrating'), true);
  assert.equal(floatingMascot.classList.contains('water-celebration-mascot-hidden'), true);
  assert.equal(countLabel.textContent, 'Bạn đang có 3 xô nước để tưới cây!');
  assert.equal(bucketHolder.children[0], bucketClone);
  assert.equal(bucketClone.classList.contains('water-celebration-mascot-bucket'), true);
  assert.equal(bucketClone.attributes['aria-hidden'], 'true');
  assert.equal(idElement.removedAttribute, 'id');
  assert.equal(handlePath.stroke, '#cbd5e1');
  assert.equal(gradientDefinition.removed, true);
  assert.equal(focused, true);
  assert.equal(confettiCalls, 1);

  escapeHandler({ key: 'Escape' });
  assert.equal(modal.hidden, true);
  assert.equal(modal.attributes['aria-hidden'], 'true');
  assert.equal(modal.classList.contains('is-celebrating'), false);
  assert.equal(floatingMascot.classList.contains('water-celebration-mascot-hidden'), false);
});

test('filling the fifth water mark triggers the celebration after navigating to results', () => {
  const order = [];
  const data = { waterProgress: 4, fullBucketCount: 2 };
  const context = {
    console: { error() {} },
    Date,
    Math,
    JSON,
    window: {
      AppState: {
        currentQuestions: [{ id: 'q1' }],
        answers: { q1: [0] },
        currentQuiz: { id: 'quiz_1', title: 'Đề thử', topic: 'Toán' },
        quizMode: 'EXAM'
      },
      QuizEngine: {
        stopTimer() {},
        evaluateQuiz() {
          return { score: 10, correctCount: 1, totalQuestions: 1, wrongQuestions: [] };
        }
      },
      Auth: { getCurrentUser: () => ({ username: 'student_1', fullName: 'An' }) },
      QuizHistoryStorage: { save() {} },
      MascotEngine: {
        getData: () => data,
        speak() {},
        saveData() {},
        celebrateFullBucket(count) {
          order.push(`celebrate:${count}`);
        }
      }
    },
    navigateTo(viewId) { order.push(`navigate:${viewId}`); },
    document: {
      getElementById: () => null,
      querySelector: () => null
    }
  };
  vm.createContext(context);
  vm.runInContext(studentViewSource, context);

  context.finishAndEvaluateQuiz();

  assert.equal(data.waterProgress, 0);
  assert.equal(data.fullBucketCount, 3);
  assert.deepEqual(order, ['navigate:view-result', 'celebrate:3']);
});

test('celebration uses the mascot bucket with a 3D horizontal turn and reduced-motion support', () => {
  const template = fs.readFileSync(
    path.join(__dirname, '..', 'views', 'shared', 'modals.html'),
    'utf8'
  );
  const styles = fs.readFileSync(
    path.join(__dirname, '..', 'css', 'components.css'),
    'utf8'
  );

  assert.match(template, /id="water-bucket-celebration"[^>]*role="dialog"/);
  assert.match(template, /id="water-celebration-bucket-holder"/);
  assert.doesNotMatch(template, /water-celebration-bucket">🪣/);
  assert.match(template, /class="water-celebration-overflow">🌊/);
  assert.match(mascotSource, /cloneNode\(true\)[\s\S]*water-celebration-mascot-bucket/);
  assert.match(styles, /\.water-celebration-mascot-bucket \.water-container\s*\{\s*height:\s*100%/);
  assert.match(styles, /\.water-celebration-mascot-bucket \.bucket-handle-svg\s*\{[^}]*left:\s*5px;[^}]*width:\s*115px/s);
  assert.match(styles, /@keyframes waterBucketHorizontalTurn[\s\S]*rotateY\(360deg\)/);
  assert.match(styles, /\.water-celebration-overlay\.is-celebrating \.water-celebration-bucket-holder\s*\{[^}]*waterBucketPostTurnSway[^}]*infinite/s);
  assert.match(styles, /@keyframes waterBucketPostTurnSway[\s\S]*rotate\(-2deg\)[\s\S]*rotate\(2deg\)/);
  assert.match(styles, /@keyframes waterOverflowBurst/);
  assert.match(styles, /@media \(prefers-reduced-motion: reduce\)[\s\S]*\.water-celebration-overlay \*/);
});
