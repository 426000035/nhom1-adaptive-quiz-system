const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const moduleSource = fs.readFileSync(
  path.join(__dirname, '..', 'js', 'features', 'admin', 'admin-quizzes.js'),
  'utf8'
);
const utilitySource = fs.readFileSync(
  path.join(__dirname, '..', 'js', 'core', 'utils.js'),
  'utf8'
);

function createModule() {
  const context = {
    Set,
    Array,
    String,
    Math,
    sortListByDate(records, sort) {
      const direction = sort === 'DATE_ASC' ? 1 : -1;
      return records.slice().sort((left, right) =>
        ((Date.parse(left.createdAt || '') || 0) - (Date.parse(right.createdAt || '') || 0)) * direction
      );
    }
  };
  vm.createContext(context);
  vm.runInContext(utilitySource, context);
  vm.runInContext(moduleSource, context);
  return context;
}

test('filters quiz assignees by name, user ID, and account status', () => {
  const { filterQuizAssignmentStudents } = createModule();
  const students = [
    { userId: 'student_01', fullName: 'Nguyễn An', status: 'active', classIds: ['class_10a'] },
    { userId: 'student_02', fullName: 'Trần Bình', status: 'inactive', classIds: ['class_10b'] },
    { userId: 'student_03', fullName: 'Lê Chi', status: 'locked' }
  ];

  assert.equal(filterQuizAssignmentStudents(students, 'nguyễn').length, 1);
  assert.equal(filterQuizAssignmentStudents(students, 'student_02')[0].fullName, 'Trần Bình');
  assert.equal(filterQuizAssignmentStudents(students, '', 'locked')[0].userId, 'student_03');
  assert.equal(filterQuizAssignmentStudents(students, 'student', 'active').length, 1);
  assert.equal(filterQuizAssignmentStudents(students, '', 'ALL', 'class_10a')[0].userId, 'student_01');
  assert.equal(filterQuizAssignmentStudents(students, '', 'ALL', 'class_missing').length, 0);
  assert.equal(filterQuizAssignmentStudents(students, '', 'ALL', 'NONE')[0].userId, 'student_03');
});

test('sorts quiz assignees newest-first and oldest-first when selected', () => {
  const { filterQuizAssignmentStudents } = createModule();
  const students = [
    { userId: 'older', fullName: 'A', createdAt: '2026-01-01T00:00:00.000Z' },
    { userId: 'newer', fullName: 'Z', createdAt: '2026-03-01T00:00:00.000Z' }
  ];

  assert.deepEqual(
    Array.from(filterQuizAssignmentStudents(students, '', 'ALL', 'ALL', 'DATE_DESC'), student => student.userId),
    ['newer', 'older']
  );
  assert.deepEqual(
    Array.from(filterQuizAssignmentStudents(students, '', 'ALL', 'ALL', 'DATE_ASC'), student => student.userId),
    ['older', 'newer']
  );
});

test('paginates quiz assignees and clamps the requested page', () => {
  const { getQuizAssignmentPage } = createModule();
  const students = Array.from({ length: 23 }, (_, index) => ({ userId: `student_${index}` }));

  const secondPage = getQuizAssignmentPage(students, 2, 10);
  assert.equal(secondPage.currentPage, 2);
  assert.equal(secondPage.totalPages, 3);
  assert.equal(secondPage.students.length, 10);
  assert.equal(secondPage.students[0].userId, 'student_10');

  const lastPage = getQuizAssignmentPage(students, 99, 10);
  assert.equal(lastPage.currentPage, 3);
  assert.equal(lastPage.students.length, 3);
});

test('student lists omit account ID columns while retaining assignment controls', () => {
  const usersTemplate = fs.readFileSync(
    path.join(__dirname, '..', 'views', 'admin', 'tabs', 'tab-users.html'),
    'utf8'
  );
  const modalsTemplate = fs.readFileSync(
    path.join(__dirname, '..', 'views', 'shared', 'modals.html'),
    'utf8'
  );
  const source = moduleSource;

  assert.doesNotMatch(usersTemplate, /<th[^>]*>Mã tài khoản<\/th>/);
  assert.doesNotMatch(modalsTemplate, /<th[^>]*>Mã tài khoản<\/th>/);
  assert.doesNotMatch(source, /const idCell = document\.createElement\('td'\)/);
  assert.match(source, /checkbox\.value = student\.userId/);
  assert.match(source, /row\.append\(checkboxCell, nameCell, classesCell, statusCell\)/);
  assert.match(modalsTemplate, /id="chk-select-filtered-assignment-students"[^>]*aria-label="Chọn tất cả học sinh theo bộ lọc"/);
  assert.match(modalsTemplate, /<span>Tất cả<\/span>/);
});

test('bulk assignment selection includes all active students matching current filters', () => {
  const { getSelectableFilteredQuizAssignmentStudents } = createModule();
  const students = [
    { userId: 'student_01', fullName: 'Nguyễn An', status: 'active', classIds: ['class_10a'] },
    { userId: 'student_02', fullName: 'Nguyễn Bình', status: 'inactive', classIds: ['class_10a'] },
    { userId: 'student_03', fullName: 'Trần Chi', status: 'active', classIds: ['class_10b'] }
  ];

  assert.deepEqual(
    Array.from(getSelectableFilteredQuizAssignmentStudents(
      students, 'Nguyễn', 'ALL', 'class_10a', 'TITLE_ASC'
    ), student => student.userId),
    ['student_01']
  );
});
