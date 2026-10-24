const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const mascotSource = fs.readFileSync(
  path.join(__dirname, '..', 'js', 'features', 'student', 'mascot.js'),
  'utf8'
);

function createMascot({ user = null, storage = {}, reducedMotion = true } = {}) {
  const timerCallbacks = [];
  const classValues = new Set();
  const elements = {
    'mascot-bubble': {
      textContent: '',
      classList: {
        add(...classes) { classes.forEach(value => classValues.add(value)); },
        remove(...classes) { classes.forEach(value => classValues.delete(value)); },
        contains(value) { return classValues.has(value); }
      }
    },
    'mascot-svg-eyes': { innerHTML: '' },
    'mascot-svg-mouth': { setAttribute() {} },
    'student-mascot-container': {
      classList: {
        add(...classes) { classes.forEach(value => classValues.add(value)); },
        remove(...classes) { classes.forEach(value => classValues.delete(value)); },
        contains(value) { return classValues.has(value); }
      },
      offsetWidth: 1
    }
  };
  const localStorage = {
    getItem(key) { return Object.prototype.hasOwnProperty.call(storage, key) ? storage[key] : null; },
    setItem(key, value) { storage[key] = String(value); },
    removeItem(key) { delete storage[key]; }
  };
  const window = {
    Auth: { getCurrentUser: () => user },
    AppState: {},
    matchMedia: () => ({ matches: reducedMotion }),
    setTimeout: (callback, delay) => {
      timerCallbacks.push({ callback, delay });
      return timerCallbacks.length;
    },
    clearTimeout() {}
  };
  const context = {
    window,
    localStorage,
    document: { getElementById: id => elements[id] || null },
    console,
    Date,
    Math,
    setTimeout: (callback, delay) => {
      timerCallbacks.push({ callback, delay });
      return timerCallbacks.length;
    },
    clearTimeout() {},
    confetti: undefined
  };
  vm.createContext(context);
  vm.runInContext(mascotSource, context);
  return { mascot: window.MascotEngine, elements, storage, timerCallbacks, classValues };
}

test('login greetings use a nickname only after authentication and failures stay anonymous', () => {
  const { mascot, elements } = createMascot();
  mascot.emit('loginFailure');
  assert.doesNotMatch(elements['mascot-bubble'].textContent, /undefined|null/);

  mascot.onLogin({ userId: 'student-1', role: 'student', nickname: 'Mít', fullName: 'Nguyễn An' });
  assert.match(elements['mascot-bubble'].textContent, /Mít/);

  const fallback = createMascot();
  fallback.mascot.onLogin({ userId: 'student-2', role: 'student', nickname: ' ', fullName: 'Nguyễn An' });
  assert.match(fallback.elements['mascot-bubble'].textContent, /Nguyễn An/);
});

test('quiz completion reflects score bands, improvement, and a newly earned bucket', () => {
  const { mascot, elements } = createMascot({
    user: { role: 'student', nickname: 'Mít' }
  });

  mascot.emit('quizComplete', { score: 4, previousScore: 3, improved: true });
  assert.match(elements['mascot-bubble'].textContent, /4\/10/);
  assert.match(elements['mascot-bubble'].textContent, /Tốt hơn lần trước 3\/10/);
  assert.match(elements['mascot-bubble'].textContent, /chưa cao/);

  mascot.eventState.activeUntil = 0;
  mascot.emit('quizComplete', {
    score: 10,
    bucketEarned: true,
    fullBucketCount: 5,
    previousFullBucketCount: 4
  });
  assert.match(elements['mascot-bubble'].textContent, /Đầy xô nước thứ 5/);
  assert.match(elements['mascot-bubble'].textContent, /Đủ 5 xô/);

  mascot.eventState.activeUntil = 0;
  mascot.emit('quizComplete', {
    score: 10,
    bucketEarned: true,
    fullBucketCount: 6,
    previousFullBucketCount: 5
  });
  assert.doesNotMatch(elements['mascot-bubble'].textContent, /Đủ 5 xô/);
});

test('important events cannot be overwritten by a lower-priority mascot click', () => {
  const { mascot, elements } = createMascot();
  mascot.emit('quizComplete', { score: 8 });
  const completionMessage = elements['mascot-bubble'].textContent;

  assert.equal(mascot.emit('mascotClick'), false);
  assert.equal(elements['mascot-bubble'].textContent, completionMessage);
});

test('repeated mascot clicks trigger a randomized playful teasing line', () => {
  const { mascot, elements } = createMascot();
  let waterStatusCalls = 0;
  mascot.speakWaterStatus = () => { waterStatusCalls += 1; };

  mascot.handleMascotClick();
  mascot.handleMascotClick();
  mascot.handleMascotClick();
  assert.equal(waterStatusCalls, 3);
  mascot.handleMascotClick();

  assert.equal(waterStatusCalls, 3);
  assert.match(
    elements['mascot-bubble'].textContent,
    /Đừng chọc vào tôiiii|Đồ đáng ghét|Công an sắp còng/
  );
  assert.equal(mascot.eventState.mascotClickCount, 0);
});

test('mascot switches among expressive faces and styles continuous blinking and motion', () => {
  const { mascot, elements } = createMascot();
  mascot.speak('Hả?', 'surprised');
  const surprisedEyes = elements['mascot-svg-eyes'].innerHTML;
  mascot.speak('Đang nghĩ...', 'thinking');
  const thinkingEyes = elements['mascot-svg-eyes'].innerHTML;
  mascot.speak('Tuyệt!', 'excited');
  const excitedEyes = elements['mascot-svg-eyes'].innerHTML;

  assert.notEqual(surprisedEyes, thinkingEyes);
  assert.notEqual(thinkingEyes, excitedEyes);
  assert.match(surprisedEyes, /ellipse/);

  const styles = fs.readFileSync(
    path.join(__dirname, '..', 'css', 'components.css'),
    'utf8'
  );
  assert.match(styles, /#mascot-svg-eyes[\s\S]*animation:\s*mascotBlink/);
  assert.match(styles, /@keyframes mascotBlink/);
  assert.match(styles, /@keyframes mascotCelebrationDance/);
  assert.match(styles, /@media \(prefers-reduced-motion: reduce\)[\s\S]*\.mascot-bucket-art/);
});

test('mascot returns to a subtle idle sway and neutral face after an event ends', () => {
  const { mascot, elements, timerCallbacks, classValues } = createMascot({ reducedMotion: false });
  mascot.speak('Tuyệt!', 'excited');
  assert.ok(classValues.has('mascot-emotion-excited'));
  assert.ok(classValues.has('anim-gentle'));

  timerCallbacks.find(timer => timer.delay === 4500).callback();
  assert.ok(classValues.has('mascot-idle'));
  assert.ok(!classValues.has('mascot-emotion-excited'));
  assert.match(elements['mascot-svg-eyes'].innerHTML, /<circle/);

  const styles = fs.readFileSync(
    path.join(__dirname, '..', 'css', 'components.css'),
    'utf8'
  );
  assert.match(styles, /\.mascot-bucket-art\s*\{\s*animation:\s*mascotIdleSway/);
  assert.match(styles, /@keyframes mascotIdleSway[\s\S]*rotate\(-1\.5deg\)[\s\S]*rotate\(1\.5deg\)/);
});

test('mascot speech bubble is compact, wraps long text, and has a speech tail', () => {
  const styles = fs.readFileSync(
    path.join(__dirname, '..', 'css', 'components.css'),
    'utf8'
  );
  assert.match(styles, /\.mascot-bubble\s*\{[^}]*max-width:\s*min\(14rem, calc\(100vw - 2rem\)\)/s);
  assert.match(styles, /\.mascot-bubble\s*\{[^}]*white-space:\s*normal/);
  assert.match(styles, /\.mascot-bubble\s*\{[^}]*overflow-wrap:\s*anywhere/);
  assert.match(styles, /\.mascot-bubble::after\s*\{[^}]*transform:\s*rotate\(45deg\)/s);
  assert.match(styles, /@media \(max-width: 480px\)[\s\S]*\.mascot-bubble\s*\{[^}]*max-width:\s*min\(12rem/);
});

test('practice answer streaks react at the selected thresholds and reset on an opposite answer', () => {
  const { mascot, elements } = createMascot();
  mascot.recordAnswer(false);
  assert.match(elements['mascot-bubble'].textContent, /Chưa đúng|Ối, câu này chưa qua cửa/);
  mascot.recordAnswer(false);
  assert.match(elements['mascot-bubble'].textContent, /Hai câu sai|Sai liên tiếp hai câu/);
  mascot.recordAnswer(false);
  assert.match(elements['mascot-bubble'].textContent, /Ba câu sai|Chuỗi sai lên ba/);
  mascot.recordAnswer(true);
  assert.equal(mascot.eventState.wrongStreak, 0);
  mascot.recordAnswer(true);
  mascot.recordAnswer(true);
  assert.match(elements['mascot-bubble'].textContent, /Ba câu đúng|Chuỗi ba câu chuẩn/);
});

test('water reminders are limited by the 30-minute cooldown', () => {
  const { mascot, elements } = createMascot({
    user: { role: 'student', nickname: 'Mít' }
  });
  assert.equal(mascot.emit('waterReminder', { bucketCount: 2 }), true);
  assert.match(elements['mascot-bubble'].textContent, /2 xô/);
  assert.equal(mascot.emit('waterReminder', { bucketCount: 2 }), false);
});

test('water reminder cooldown survives a page reload for the same account', () => {
  const storage = {};
  const user = { userId: 'student-3', role: 'student', nickname: 'Mít' };
  const firstSession = createMascot({ user, storage });
  assert.equal(firstSession.mascot.emit('waterReminder', { bucketCount: 1 }), true);

  const reloadedSession = createMascot({ user, storage });
  assert.equal(reloadedSession.mascot.emit('waterReminder', { bucketCount: 1 }), false);
});

test('return greeting is selected after seven days away', () => {
  const key = 'adaptive_quiz_mascot_last_login_student-1';
  const { mascot, elements, storage } = createMascot({
    storage: { [key]: String(Date.now() - 8 * 24 * 60 * 60 * 1000) }
  });
  mascot.onLogin({ userId: 'student-1', role: 'student', nickname: 'Mít' });
  assert.match(elements['mascot-bubble'].textContent, /Chào mừng trở lại|quay lại rồi/);
  assert.ok(Number(storage[key]) > 0);
});

test('a persisted session also announces a return after seven days away', () => {
  const key = 'adaptive_quiz_mascot_last_login_student-2';
  const { mascot, elements, storage } = createMascot({
    storage: { [key]: String(Date.now() - 8 * 24 * 60 * 60 * 1000) }
  });
  mascot.onSessionResume({ userId: 'student-2', role: 'student', nickname: 'Na' });
  assert.match(elements['mascot-bubble'].textContent, /Chào mừng trở lại|quay lại rồi/);
  assert.ok(Number(storage[key]) > 0);
});
