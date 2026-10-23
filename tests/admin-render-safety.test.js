const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const root = path.join(__dirname, '..');

class MockElement {
  constructor(tagName) {
    this.tagName = tagName;
    this.children = [];
    this.attributes = {};
    this.textContent = '';
    this.colSpan = 1;
  }

  appendChild(child) {
    this.children.push(child);
    return child;
  }
}

test('admin table cell and empty-state helpers render text as text, not markup', () => {
  const context = {
    document: { createElement: tagName => new MockElement(tagName) }
  };
  vm.createContext(context);
  vm.runInContext(
    fs.readFileSync(path.join(root, 'js', 'features', 'admin', 'admin-core.js'), 'utf8'),
    context
  );

  const unsafeText = '<img src=x onerror=alert(1)>';
  const cell = context.createAdminTableCell(unsafeText, 'example', 'admin-table-cell--muted');
  assert.equal(cell.tagName, 'td');
  assert.equal(cell.textContent, unsafeText);
  assert.equal(cell.children.length, 0);
  assert.equal(cell.className, 'example admin-table-cell--muted');

  const body = new MockElement('tbody');
  context.renderAdminEmptyRow(body, 4, unsafeText);
  assert.equal(body.children.length, 1);
  assert.equal(body.children[0].children[0].textContent, unsafeText);
  assert.equal(body.children[0].children[0].colSpan, 4);
});

test('admin quiz and question tables do not interpolate data into HTML strings', () => {
  const files = [
    'js/features/admin/admin-quizzes.js',
    'js/features/admin/admin-bank.js'
  ];
  files.forEach(relativePath => {
    const source = fs.readFileSync(path.join(root, relativePath), 'utf8');
    assert.doesNotMatch(source, /\.innerHTML\s*=\s*`/);
  });
});
