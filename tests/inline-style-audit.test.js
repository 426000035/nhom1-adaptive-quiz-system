const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.join(__dirname, '..');
const dynamicStyleExceptions = new Map([
  [
    'js/features/student/mascot.js',
    {
      expression: "holder.querySelector('.water-container')?.style.setProperty('--water-height', `${waterHeight}%`);",
      reason: 'The mascot water level is a runtime value derived from persisted student progress.'
    }
  ],
  [
    'js/features/student/student-view.js',
    {
      expression: "if (progressBar) progressBar.style.setProperty('--progress', `${progressValue}%`);",
      reason: 'The quiz progress width is a continuous runtime percentage.'
    }
  ]
]);

function collectSourceFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) return collectSourceFiles(entryPath);
    return /\.(?:html|js)$/i.test(entry.name) ? [entryPath] : [];
  });
}

function getProductionFiles() {
  return [
    path.join(root, 'index.html'),
    path.join(root, 'generate-questions.js'),
    ...collectSourceFiles(path.join(root, 'views')),
    ...collectSourceFiles(path.join(root, 'js'))
  ].filter(fs.existsSync);
}

function toRelativePath(filePath) {
  return path.relative(root, filePath).split(path.sep).join('/');
}

test('production HTML and JavaScript do not add inline styles', () => {
  const markupTagPattern = /<\s*[A-Za-z][^<>]*>/g;
  const inlineAttributePattern = /\bstyle\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/i;
  const styleAssignmentPattern = /\.style(?:\.[A-Za-z_$][\w$]*|\s*\[\s*(?:["'][^"']+["']|[^\]]+)\s*\])\s*(?:=(?!=)|\+=|-=|\*=|\/=)/g;
  const setAttributePattern = /\.setAttribute\s*\(\s*(["'])style\1/g;
  const setPropertyPattern = /\.style\s*\.\s*setProperty\s*\(/g;
  const helperCallPattern = /\bcreateAdminTableCell\(([^)]*)\)/gs;
  const cssDeclarationPattern = /\b(?:padding|margin|color|font|display|width|border|text-align|white-space)\s*:/;
  const violations = [];
  const allowedExceptionsFound = new Map();

  getProductionFiles().forEach(filePath => {
    const relativePath = toRelativePath(filePath);
    const source = fs.readFileSync(filePath, 'utf8');
    const markupSource = /\.html$/i.test(filePath)
      ? source.replace(/<!--[\s\S]*?-->/g, '')
      : source;
    const lines = source.split(/\r?\n/);

    for (const match of markupSource.matchAll(markupTagPattern)) {
      const attribute = match[0].match(inlineAttributePattern);
      if (attribute) violations.push(`${relativePath}: inline style attribute ${attribute[0]}`);
    }
    for (const match of source.matchAll(styleAssignmentPattern)) {
      violations.push(`${relativePath}: direct style assignment ${match[0]}`);
    }
    for (const match of source.matchAll(setAttributePattern)) {
      violations.push(`${relativePath}: setAttribute style write ${match[0]}`);
    }

    lines.forEach(line => {
    });

    for (const match of source.matchAll(helperCallPattern)) {
      if (cssDeclarationPattern.test(match[1])) {
        violations.push(`${relativePath}: CSS declaration passed to createAdminTableCell`);
      }
    }

    for (const match of source.matchAll(setPropertyPattern)) {
      const lineStart = source.lastIndexOf('\n', match.index) + 1;
      const lineEnd = source.indexOf('\n', match.index);
      const expression = source.slice(lineStart, lineEnd === -1 ? undefined : lineEnd).trim();
      const exception = dynamicStyleExceptions.get(relativePath);
      if (exception?.expression === expression) {
        allowedExceptionsFound.set(relativePath, (allowedExceptionsFound.get(relativePath) || 0) + 1);
      } else {
        violations.push(`${relativePath}: unapproved style.setProperty ${expression}`);
      }
    }
  });

  dynamicStyleExceptions.forEach((exception, relativePath) => {
    assert.ok(exception.reason, `Document why ${relativePath} retains a dynamic style.`);
    assert.equal(
      allowedExceptionsFound.get(relativePath),
      1,
      `Expected exactly one allowlisted expression in ${relativePath}: ${exception.expression}`
    );
  });

  assert.deepEqual(violations, []);
});