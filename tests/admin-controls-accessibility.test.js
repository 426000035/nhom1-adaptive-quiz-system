const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.join(__dirname, '..');
const adminTemplates = [
  path.join(root, 'views', 'admin', 'tabs', 'tab-quizzes.html'),
  path.join(root, 'views', 'admin', 'tabs', 'tab-bank.html'),
  path.join(root, 'views', 'admin', 'tabs', 'tab-catalogs.html'),
  path.join(root, 'views', 'admin', 'tabs', 'tab-users.html'),
  path.join(root, 'views', 'admin', 'tabs', 'tab-reports.html'),
  path.join(root, 'views', 'admin', 'tabs', 'tab-tools.html')
];
const adminModalTemplate = path.join(root, 'views', 'shared', 'modals.html');

function getAttribute(tag, name) {
  const match = tag.match(new RegExp(`\\b${name}=["']([^"']*)["']`));
  return match?.[1] ?? null;
}

function assertNamedControls(source, file) {
  const labelAssociations = new Set();
  Array.from(source.matchAll(/<label\b([^>]*)>([\s\S]*?)<\/label>/gi)).forEach(([, attributes, content]) => {
    const labelFor = getAttribute(`<label ${attributes}>`, 'for');
    if (labelFor) labelAssociations.add(labelFor);
    const nestedControls = content.matchAll(/<(?:input|select|textarea)\b[^>]*>/gi);
    Array.from(nestedControls).forEach(([control]) => {
      const nestedId = getAttribute(control, 'id');
      if (nestedId) labelAssociations.add(nestedId);
    });
  });
  const controls = source.match(/<(?:input|select|textarea)\b[^>]*>/gi) || [];

  controls.forEach(control => {
    const type = getAttribute(control, 'type');
    if (type === 'hidden') return;
    const id = getAttribute(control, 'id');
    const ariaLabel = getAttribute(control, 'aria-label');
    const hasAssociatedLabel = id && labelAssociations.has(id);
    assert.ok(
      ariaLabel || hasAssociatedLabel,
      `${path.relative(root, file)} has an unnamed control: ${control}`
    );
  });
}

test('admin filters and forms have accessible names', () => {
  adminTemplates.forEach(file => {
    assertNamedControls(fs.readFileSync(file, 'utf8'), file);
  });
  assertNamedControls(fs.readFileSync(adminModalTemplate, 'utf8'), adminModalTemplate);
});

test('admin section headings use shared CSS classes instead of inline styles', () => {
  const sources = adminTemplates.map(file => ({
    file,
    source: fs.readFileSync(file, 'utf8')
  }));
  const componentsStyles = fs.readFileSync(path.join(root, 'css', 'components.css'), 'utf8');

  sources.forEach(({ file, source }) => {
    assert.doesNotMatch(
      source,
      /<h[1-6]\b[^>]*\bstyle=/i,
      `${path.relative(root, file)} should not style headings inline`
    );
  });

  ['tab-quizzes.html', 'tab-bank.html', 'tab-catalogs.html', 'tab-users.html', 'tab-reports.html'].forEach(name => {
    const template = sources.find(({ file }) => path.basename(file) === name)?.source;
    assert.match(template, /class="[^"]*\badmin-card-heading\b/);
  });
  assert.match(componentsStyles, /\.admin-card-heading\s*\{/);
  assert.match(componentsStyles, /\.admin-subsection-heading\s*\{[^}]*line-height:\s*1\.4/s);
  assert.match(componentsStyles, /\.admin-stat-label\s*\{/);
});

test('admin table headers declare column scope', () => {
  [...adminTemplates, adminModalTemplate].forEach(file => {
    const source = fs.readFileSync(file, 'utf8');
    const headers = source.match(/<th\b[^>]*>/gi) || [];
    headers.forEach(header => {
      assert.equal(
        getAttribute(header, 'scope'),
        'col',
        `${path.relative(root, file)} has a table header without scope="col": ${header}`
      );
    });
  });
});

test('admin catalog sub-tabs connect each tab to one labeled panel', () => {
  const template = fs.readFileSync(path.join(root, 'views', 'admin', 'tabs', 'tab-catalogs.html'), 'utf8');
  const componentsStyles = fs.readFileSync(path.join(root, 'css', 'components.css'), 'utf8');
  const tabList = template.match(/<div\b[^>]*\bid="admin-catalog-tabs"[^>]*>/i)?.[0];
  assert.ok(tabList);
  assert.equal(getAttribute(tabList, 'role'), 'tablist');

  const tabs = Array.from(template.matchAll(/<button\b[^>]*\brole="tab"[^>]*>/gi), ([tag]) => tag);
  const panels = Array.from(template.matchAll(/<section\b[^>]*\brole="tabpanel"[^>]*>/gi), ([tag]) => tag);
  assert.equal(tabs.length, 3);
  assert.equal(panels.length, 3);
  tabs.forEach(tab => {
    const panelId = getAttribute(tab, 'aria-controls');
    assert.ok(panelId);
    assert.ok(panels.some(panel =>
      getAttribute(panel, 'id') === panelId &&
      getAttribute(panel, 'aria-labelledby') === getAttribute(tab, 'id')
    ));
  });
  assert.equal((template.match(/<table\b[^>]*\bclass="admin-catalog-table"/gi) || []).length, 3);
  assert.equal((template.match(/<tr class="admin-table-header-row">/gi) || []).length, 3);
  assert.doesNotMatch(template, /<table\b[^>]*\bstyle=/i);
  assert.doesNotMatch(componentsStyles, /\.admin-catalog-table\s*\{/);
  assert.match(componentsStyles, /\.admin-table-wrap \.admin-catalog-table th,\s*\.admin-table-wrap \.admin-catalog-table td\s*\{[^}]*padding:\s*var\(--space-2\)/s);
  assert.match(fs.readFileSync(path.join(root, 'js', 'features', 'admin', 'admin-catalogs.js'), 'utf8'), /admin-action-button admin-action-button--compact/);
  assert.match(componentsStyles, /\.admin-action-button--compact\s*\{/);
});

test('admin quiz list hides quiz IDs and keeps only quiz titles wrappable', () => {
  const template = fs.readFileSync(path.join(root, 'views', 'admin', 'tabs', 'tab-quizzes.html'), 'utf8');
  const quizzesModule = fs.readFileSync(path.join(root, 'js', 'features', 'admin', 'admin-quizzes.js'), 'utf8');
  const componentStyles = fs.readFileSync(path.join(root, 'css', 'components.css'), 'utf8');

  assert.doesNotMatch(template, /<th\b[^>]*>\s*Mã Đề\s*<\/th>/i);
  assert.equal((template.match(/<th\b[^>]*scope="col"/gi) || []).length, 6);
  assert.match(template, /<tr class="admin-table-header-row">/);
  assert.match(template, /class="quiz-title-column">Tên Bài Thi/);
  assert.doesNotMatch(quizzesModule, /createAdminTableCell\(quiz\.id/);
  assert.match(quizzesModule, /renderAdminEmptyRow\(tbody, 6,/);
  assert.match(componentStyles, /\.admin-table-wrap table\s*\{[^}]*font-size:\s*var\(--font-size-sm\)/s);
  assert.match(componentStyles, /\.admin-quizzes-table td\s*\{[^}]*white-space:\s*nowrap/s);
  assert.match(componentStyles, /\.admin-quizzes-table \.quiz-title-column,\s*\.admin-quizzes-table \.quiz-title-cell\s*\{[^}]*white-space:\s*normal/s);
});

test('subject and skill catalog lists provide search, sorting, page size, and pagination controls', () => {
  const template = fs.readFileSync(path.join(root, 'views', 'admin', 'tabs', 'tab-catalogs.html'), 'utf8');
  ['subjects', 'skills'].forEach(listName => {
    assert.match(template, new RegExp(`id="search-admin-${listName}"`));
    assert.match(template, new RegExp(`id="sort-admin-${listName}"`));
    assert.match(template, new RegExp(`id="pagesize-admin-${listName}"`));
    assert.match(template, new RegExp(`id="pagination-admin-${listName}"[^>]*aria-label="Phân trang danh sách`));
  });
  assert.match(template, /value="TITLE_ASC">Tên môn \(A - Z\)/);
  assert.match(template, /value="TITLE_DESC">Tên kỹ năng \(Z - A\)/);
  assert.equal((template.match(/value="DATE_DESC"(?: selected)?/g) || []).length, 2);
  assert.equal((template.match(/value="DATE_DESC" selected>Mới nhất trước/g) || []).length, 2);
  assert.equal((template.match(/value="DATE_ASC">Cũ nhất trước/g) || []).length, 2);
  const appState = fs.readFileSync(path.join(root, 'js', 'core', 'state.js'), 'utf8');
  assert.match(appState, /adminSubjects: \{ searchText: '', sort: 'DATE_DESC'/);
  assert.match(appState, /adminSkills: \{ searchText: '', sort: 'DATE_DESC'/);
});

test('admin pagination landmarks have accessible labels', () => {
  [...adminTemplates, adminModalTemplate].forEach(file => {
    const source = fs.readFileSync(file, 'utf8');
    const paginationRegions = source.match(/<(?:div|nav)\b[^>]*\bid="pagination-[^"]+"[^>]*>/gi) || [];
    paginationRegions.forEach(region => {
      assert.equal(
        region.match(/^<nav\b/i)?.[0] ?? null,
        '<nav',
        `${path.relative(root, file)} pagination should use nav: ${region}`
      );
      assert.ok(
        getAttribute(region, 'aria-label'),
        `${path.relative(root, file)} pagination is missing aria-label: ${region}`
      );
    });
  });
});

test('admin table pagination uses the shared spacing modifier', () => {
  [...adminTemplates, adminModalTemplate].forEach(file => {
    const source = fs.readFileSync(file, 'utf8');
    const paginationNavs = source.match(/<nav\b[^>]*\bid="pagination-[^"]+"[^>]*>/gi) || [];
    paginationNavs.forEach(nav => {
      assert.match(nav, /\bclass="[^"]*\badmin-table-pagination\b/);
    });
  });
});

test('quiz deletion confirmation has explicit cancel and delete actions', () => {
  const quizzesModule = fs.readFileSync(path.join(root, 'js', 'features', 'admin', 'admin-quizzes.js'), 'utf8');
  const confirmation = quizzesModule.match(/title: 'Xác nhận xóa bài thi\?'([\s\S]*?)\.then\(\(res\)/)?.[1] || '';

  assert.match(confirmation, /showCancelButton:\s*true/);
  assert.match(confirmation, /confirmButtonText:\s*'Xóa'/);
  assert.match(confirmation, /cancelButtonText:\s*'Hủy'/);
});

test('admin data tables are keyboard-scrollable within labeled regions', () => {
  [...adminTemplates, adminModalTemplate].forEach(file => {
    const source = fs.readFileSync(file, 'utf8');
    const tableCount = (source.match(/<table\b/gi) || []).length;
    const regionCount = (source.match(/class="[^"]*\badmin-table-wrap\b[^"]*"[^>]*role="region"[^>]*tabindex="0"/gi) || []).length;
    assert.equal(
      regionCount,
      tableCount,
      `${path.relative(root, file)} must wrap each admin table in a labeled, keyboard-scrollable region`
    );
  });
});

test('global question bank omits question IDs and keeps long question text wrappable', () => {
  const template = fs.readFileSync(path.join(root, 'views', 'admin', 'tabs', 'tab-bank.html'), 'utf8');
  const bankModule = fs.readFileSync(path.join(root, 'js', 'features', 'admin', 'admin-bank.js'), 'utf8');
  const table = template.match(/<table>([\s\S]*?)<\/table>/)?.[1] || '';
  const headers = Array.from(table.matchAll(/<th\b[^>]*>([\s\S]*?)<\/th>/gi))
    .map(([, content]) => content.replace(/<[^>]*>/g, '').trim());

  assert.deepEqual(headers, ['Chủ Đề', 'Độ Khó', 'Nội Dung Câu Hỏi', 'Đáp Án Đúng', 'Thao Tác']);
  assert.match(bankModule, /renderAdminEmptyRow\(tbody, 5,/);
  assert.match(bankModule, /admin-bank-topic-cell/);
  assert.match(bankModule, /admin-bank-difficulty-cell/);
  assert.match(bankModule, /admin-bank-question-cell/);
});

test('admin responsive styles define small-screen filter, table, and modal layouts', () => {
  const responsiveStyles = fs.readFileSync(path.join(root, 'css', 'responsive.css'), 'utf8');
  assert.match(responsiveStyles, /\.admin-filter-bar\s*\{[^}]*display:\s*grid/s);
  assert.match(responsiveStyles, /\.admin-table-wrap\s*\{[^}]*overflow:\s*auto/s);
  const tableRegionStyles = responsiveStyles.match(/\.admin-table-wrap\s*\{([^}]+)\}/s)?.[1] || '';
  assert.match(tableRegionStyles, /overscroll-behavior-x:\s*contain/);
  assert.doesNotMatch(tableRegionStyles, /overscroll-behavior:\s*contain/);
  assert.match(responsiveStyles, /@media screen and \(max-width: 480px\)[\s\S]*\.admin-modal/);
  assert.match(responsiveStyles, /@media screen and \(max-width: 768px\)[\s\S]*\.admin-table-wrap td \.btn\s*\{[^}]*min-height:\s*2\.75rem/s);
  assert.match(responsiveStyles, /\.admin-table-actions\s*\{[^}]*white-space:\s*normal !important/s);
});

test('search inputs and select controls share field styling while keeping contextual padding', () => {
  const componentStyles = fs.readFileSync(path.join(root, 'css', 'components.css'), 'utf8');
  const sharedControlRule = componentStyles.match(/\.search-box input,\s*\.select-control\s*\{([^}]+)\}/s)?.[1] || '';
  const searchRule = componentStyles.match(/\.search-box input\s*\{([^}]+)\}/s)?.[1] || '';
  const selectRule = Array.from(componentStyles.matchAll(/^\.select-control\s*\{([^}]+)\}/gm))
    .map(([, declarations]) => declarations)
    .find(declarations => /padding:\s*0\.55rem 0\.8rem/.test(declarations)) || '';

  assert.match(sharedControlRule, /min-height:\s*2\.625rem/);
  assert.match(sharedControlRule, /font-size:\s*var\(--font-size-sm\)/);
  assert.match(sharedControlRule, /border-radius:\s*var\(--radius-sm\)/);
  assert.match(searchRule, /padding:\s*0\.55rem 0\.85rem 0\.55rem 2\.4rem/);
  assert.match(selectRule, /padding:\s*0\.55rem 0\.8rem/);
  assert.match(selectRule, /cursor:\s*pointer/);
});

test('admin tool controls reuse the shared full-width form modifier', () => {
  const template = fs.readFileSync(path.join(root, 'views', 'admin', 'tabs', 'tab-tools.html'), 'utf8');
  const componentStyles = fs.readFileSync(path.join(root, 'css', 'components.css'), 'utf8');

  assert.equal((template.match(/class="select-control admin-tool-control admin-form-control--full"/g) || []).length, 3);
  assert.match(componentStyles, /\.admin-form-control--full\s*\{[^}]*width:\s*100%/s);
  assert.match(componentStyles, /\.admin-tool-control\s*\{[^}]*font-size:\s*0\.85rem/);
});

test('all list filter and pagination controls remain single-row and never use horizontal scrolling', () => {
  const responsiveStyles = fs.readFileSync(path.join(root, 'css', 'responsive.css'), 'utf8');
  assert.match(responsiveStyles, /\.admin-filter-bar:not\(\.admin-form-grid\),[\s\S]*?\.history-filters\s*\{[^}]*display:\s*flex[^}]*flex-wrap:\s*nowrap[^}]*overflow:\s*hidden/s);
  assert.match(responsiveStyles, /\.pagination-wrapper\s*\{[^}]*flex-wrap:\s*nowrap[^}]*overflow:\s*hidden/s);
  assert.match(responsiveStyles, /@media screen and \(max-width: 480px\)[\s\S]*\.pagination-wrapper \.pagination-button:not\(\[aria-current="page"\]\):not\(:first-child\):not\(:last-child\),[\s\S]*\.pagination-ellipsis\s*\{[^}]*display:\s*none/s);
});

test('admin user search, filters, and pagination auto-fit one row without horizontal scrolling', () => {
  const template = fs.readFileSync(path.join(root, 'views', 'admin', 'tabs', 'tab-users.html'), 'utf8');
  const responsiveStyles = fs.readFileSync(path.join(root, 'css', 'responsive.css'), 'utf8');
  const usersModule = fs.readFileSync(path.join(root, 'js', 'features', 'admin', 'admin-users.js'), 'utf8');
  const catalogsTemplate = fs.readFileSync(path.join(root, 'views', 'admin', 'tabs', 'tab-catalogs.html'), 'utf8');

  assert.match(template, /class="admin-filter-bar admin-filter-bar--users"[^>]*role="group"/);
  assert.match(template, /id="pagination-admin-users" class="pagination-wrapper admin-table-pagination admin-users-pagination"/);
  assert.match(responsiveStyles, /\.admin-filter-bar--users\s*\{[^}]*display:\s*grid[^}]*grid-template-columns:[^;]*minmax\(0, 1\.8fr\)/s);
  assert.match(responsiveStyles, /\.admin-filter-bar--users\s*\{[^}]*min-width:\s*0/s);
  assert.match(responsiveStyles, /\.admin-filter-bar--users > \.select-control\s*\{[^}]*width:\s*100%[^}]*min-width:\s*0[^}]*white-space:\s*nowrap/s);
  assert.match(template, /id="search-admin-classes"/);
  assert.match(template, /id="pagesize-admin-classes"/);
  assert.match(template, /id="pagination-admin-classes"/);
  assert.match(template, /id="filter-status-admin-users"/);
  assert.match(usersModule, /bindListEvents\(\['search-admin-classes', 'filter-status-admin-classes', 'sort-admin-classes', 'pagesize-admin-classes'\]/);
  assert.match(usersModule, /processListRecords\(database\.classes/);
  assert.match(usersModule, /processListRecords\(users/);
  assert.match(catalogsTemplate, /id="search-admin-difficulties"/);
  assert.match(catalogsTemplate, /id="pagination-admin-difficulties"/);
  assert.match(responsiveStyles, /\.admin-users-pagination\s*\{[^}]*flex-wrap:\s*nowrap/);
  assert.match(responsiveStyles, /\.admin-users-pagination \.pagination-button\s*\{[^}]*min-width:\s*0/);
  assert.doesNotMatch(responsiveStyles, /\.admin-filter-bar--users\s*\{[^}]*overflow-x:\s*auto/s);
  assert.doesNotMatch(responsiveStyles, /\.admin-users-pagination\s*\{[^}]*overflow-x:\s*auto/s);
});

test('admin user management separates students and classes into accessible subtabs', () => {
  const template = fs.readFileSync(path.join(root, 'views', 'admin', 'tabs', 'tab-users.html'), 'utf8');
  const usersModule = fs.readFileSync(path.join(root, 'js', 'features', 'admin', 'admin-users.js'), 'utf8');
  const componentStyles = fs.readFileSync(path.join(root, 'css', 'components.css'), 'utf8');
  const sharedModals = fs.readFileSync(path.join(root, 'views', 'shared', 'modals.html'), 'utf8');

  assert.match(template, /id="admin-user-tabs"[^>]*role="tablist"/);
  assert.match(template, /admin-user-tab-students[\s\S]*aria-controls="admin-user-panel-students"/);
  assert.match(template, /admin-user-tab-classes[\s\S]*aria-controls="admin-user-panel-classes"/);
  assert.match(template, /id="admin-user-panel-classes"[^>]*hidden/);
  assert.match(usersModule, /ArrowRight/);
  assert.match(usersModule, /ArrowLeft/);
  assert.match(componentStyles, /\.admin-user-tabs\s*\{[^}]*grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\)/s);
  assert.match(sharedModals, /class="admin-create-student-form admin-create-student-form--vertical"/);
  assert.match(componentStyles, /\.admin-create-student-form--vertical\s*\{[^}]*grid-template-columns:\s*minmax\(0,\s*1fr\)/s);
});

test('random quiz form uses a full-width responsive grid for skills and aligned allocation rows', () => {
  const template = fs.readFileSync(path.join(root, 'views', 'admin', 'tabs', 'tab-tools.html'), 'utf8');
  const componentStyles = fs.readFileSync(path.join(root, 'css', 'components.css'), 'utf8');
  const responsiveStyles = fs.readFileSync(path.join(root, 'css', 'responsive.css'), 'utf8');

  assert.match(template, /class="question-card admin-random-quiz-card"/);
  assert.match(template, /<!-- Khung Trộn Đề Tự Động Từ Ngân Hàng -->\s*<div class="question-card admin-random-quiz-card">/);
  assert.match(template, /<!-- Khung Nhập \/ Xuất File Đề Thi \(JSON\) -->\s*<div class="question-card admin-import-export-card">/);
  assert.ok(
    template.indexOf('class="question-card admin-random-quiz-card"') <
      template.indexOf('class="question-card admin-import-export-card"'),
    'JSON import and export should appear below the random quiz form'
  );
  assert.match(template, /Cách nhập đề hàng loạt khác đang được phát triển và sẽ được cập nhật ở các phiên bản sau\./);
  assert.match(template, /id="form-random-quiz" class="admin-random-quiz-form"/);
  assert.match(componentStyles, /\.admin-random-quiz-card\s*\{\s*grid-column:\s*1\s*\/\s*-1/s);
  assert.match(componentStyles, /\.admin-import-export-card\s*\{\s*grid-column:\s*1\s*\/\s*-1/s);
  assert.match(componentStyles, /\.admin-random-quiz-form\s*\{\s*display:\s*grid[^}]*grid-template-columns:\s*minmax\(0,\s*1fr\)\s+minmax\(0,\s*1\.4fr\)\s+minmax\(9rem,\s*0\.7fr\)/s);
  assert.match(componentStyles, /\.admin-skill-allocation-list\s*\{\s*display:\s*grid[^}]*grid-template-columns:\s*repeat\(auto-fit/);
  assert.match(componentStyles, /\.admin-skill-allocation-row\s*\{\s*display:\s*grid[^}]*grid-template-columns:\s*minmax\(0,\s*1fr\)\s+minmax\(4\.5rem,\s*5rem\)\s+auto/s);
  assert.match(responsiveStyles, /@media screen and \(max-width: 480px\)[\s\S]*\.admin-random-quiz-form\s*\{\s*grid-template-columns:\s*minmax\(0,\s*1fr\)/);
});

test('admin tables provide a mobile horizontal-scroll hint', () => {
  adminTemplates.forEach(file => {
    const source = fs.readFileSync(file, 'utf8');
    const tableCount = (source.match(/<table\b/gi) || []).length;
    const hintCount = (source.match(/class="admin-table-scroll-hint"/gi) || []).length;
    assert.equal(
      hintCount,
      tableCount,
      `${path.relative(root, file)} should explain horizontal table scrolling on small screens`
    );
  });
});
