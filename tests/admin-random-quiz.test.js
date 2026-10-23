const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const moduleSource = fs.readFileSync(
  path.join(__dirname, '..', 'js', 'features', 'admin', 'admin-tools.js'),
  'utf8'
);

function createModule() {
  const context = { Math, Map, Set };
  vm.createContext(context);
  vm.runInContext(moduleSource, context);
  return context;
}

test('selects the configured number of active questions per skill and subject', () => {
  const { selectRandomQuizQuestionIds } = createModule();
  const database = {
    questions: [
      { questionId: 'math-a1', subjectId: 'math', skillId: 'algebra', status: 'active' },
      { questionId: 'math-a2', subjectId: 'math', skillId: 'algebra', status: 'active' },
      { questionId: 'math-g1', subjectId: 'math', skillId: 'geometry', status: 'active' },
      { questionId: 'math-g2', subjectId: 'math', skillId: 'geometry', status: 'active' },
      { questionId: 'math-old', subjectId: 'math', skillId: 'algebra', status: 'inactive' },
      { questionId: 'other-a1', subjectId: 'science', skillId: 'algebra', status: 'active' }
    ]
  };

  const ids = selectRandomQuizQuestionIds(database, 'math', { algebra: 2, geometry: 1 }, () => 0.5);
  assert.equal(ids.length, 3);
  assert.equal(new Set(ids).size, 3);
  assert.equal(ids.filter(id => id.startsWith('math-a')).length, 2);
  assert.equal(ids.filter(id => id.startsWith('math-g')).length, 1);
  assert.equal(ids.includes('math-old'), false);
  assert.equal(ids.includes('other-a1'), false);
});

test('rejects skill allocations exceeding active question availability', () => {
  const { selectRandomQuizQuestionIds } = createModule();
  const database = {
    questions: [
      { questionId: 'math-a1', subjectId: 'math', skillId: 'algebra', status: 'active' }
    ]
  };

  assert.throws(
    () => selectRandomQuizQuestionIds(database, 'math', { algebra: 2 }),
    /chỉ có 1 câu đang hoạt động, không đủ 2 câu/
  );
});
