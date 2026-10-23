const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.join(__dirname, '..');
const toolsHtml = fs.readFileSync(
  path.join(root, 'views', 'admin', 'tabs', 'tab-tools.html'),
  'utf8'
);
const componentStyles = fs.readFileSync(
  path.join(root, 'css', 'components.css'),
  'utf8'
);

test('JSON import and export card follows the random quiz card and spans its full width', () => {
  const randomQuizIndex = toolsHtml.indexOf('class="question-card admin-random-quiz-card"');
  const importExportIndex = toolsHtml.indexOf('class="question-card admin-import-export-card"');

  assert.notEqual(randomQuizIndex, -1);
  assert.notEqual(importExportIndex, -1);
  assert.ok(randomQuizIndex < importExportIndex);
  assert.match(componentStyles, /\.admin-random-quiz-card\s*\{\s*grid-column:\s*1\s*\/\s*-1;/);
  assert.match(componentStyles, /\.admin-import-export-card\s*\{\s*grid-column:\s*1\s*\/\s*-1;/);
});

test('JSON import and export card explains that another bulk import method is in development', () => {
  assert.match(
    toolsHtml,
    /Cách nhập đề hàng loạt khác đang được phát triển và sẽ được cập nhật ở các phiên bản sau\./
  );
});
