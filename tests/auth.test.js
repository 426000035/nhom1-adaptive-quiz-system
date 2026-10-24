const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const moduleSource = fs.readFileSync(
  path.join(__dirname, '..', 'js', 'core', 'auth.js'),
  'utf8'
);
const routerSource = fs.readFileSync(
  path.join(__dirname, '..', 'js', 'core', 'router.js'),
  'utf8'
);
const mainHtml = fs.readFileSync(
  path.join(__dirname, '..', 'index.html'),
  'utf8'
);

function createAuthContext() {
  const values = new Map();
  let database = {
    users: [
      { userId: 'student_1', username: 'student_1', password: '123', fullName: 'Học viên Demo', nickname: '', avatar: 'seedling', birthDate: '', phone: '', classIds: [], role: 'student', status: 'active' },
      { userId: 'teacher_1', username: 'teacher_1', password: '123', fullName: 'Giáo viên Demo', nickname: '', avatar: 'seedling', birthDate: '', phone: '', classIds: [], role: 'admin', status: 'active' },
      { userId: 'inactive_1', username: 'inactive_1', password: '123', fullName: 'Tài khoản khóa', nickname: '', avatar: 'seedling', birthDate: '', phone: '', classIds: [], role: 'student', status: 'locked' }
    ]
  };
  const storage = {
    getItem: key => values.has(key) ? values.get(key) : null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: key => values.delete(key)
  };
  const context = {
    console,
    localStorage: storage,
    window: {
      AppState: { currentUser: null },
      LocalStorageDB: {
        read: () => JSON.parse(JSON.stringify(database)),
        update(mutator) {
          const draft = JSON.parse(JSON.stringify(database));
          mutator(draft);
          database = draft;
          return JSON.parse(JSON.stringify(database));
        }
      },
      ThemeManager: {
        startNewLoginSession() {},
        endLoginSession() {}
      }
    }
  };
  vm.createContext(context);
  vm.runInContext(moduleSource, context);
  return { auth: context.window.Auth, storage, context, getDatabase: () => database };
}

test('logs in by username and password and persists only the user ID in the session', () => {
  const { auth, storage, context } = createAuthContext();
  const user = auth.login(' STUDENT_1 ', '123');

  assert.equal(user.userId, 'student_1');
  assert.equal(user.role, 'student');
  assert.equal(user.username, 'student_1');
  assert.equal(Object.hasOwn(user, 'password'), false);
  assert.equal(Object.hasOwn(auth.getUsers()[0], 'password'), false);
  assert.deepEqual(JSON.parse(storage.getItem('app_current_user')), { userId: 'student_1' });
  assert.equal(context.window.AppState.currentUser.userId, 'student_1');
});

test('rejects missing, incorrect, and locked demo credentials', () => {
  const { auth } = createAuthContext();
  assert.throws(() => auth.login('', ''), /nhập username và mật khẩu/);
  assert.throws(() => auth.login('missing', '123'), /không chính xác/);
  assert.throws(() => auth.login('student_1', 'wrong'), /không chính xác/);
  assert.throws(() => auth.login('inactive_1', '123'), /không hoạt động/);
});

test('allows only teachers to create valid student accounts without exposing passwords', () => {
  const { auth, storage, getDatabase } = createAuthContext();
  storage.setItem('app_current_user', JSON.stringify({ userId: 'student_1' }));
  assert.throws(
    () => auth.createStudentAccount('Học viên mới', 'new_student', 'demo-pass'),
    /Chỉ giáo viên/
  );
  assert.equal(getDatabase().users.length, 3);

  storage.setItem('app_current_user', JSON.stringify({ userId: 'teacher_1' }));
  const createdUser = auth.createStudentAccount('  Học viên mới  ', ' New.Student ', 'demo-pass');
  const savedUser = getDatabase().users.find(user => user.userId === createdUser.userId);

  assert.equal(createdUser.fullName, 'Học viên mới');
  assert.equal(createdUser.username, 'new.student');
  assert.equal(createdUser.role, 'student');
  assert.equal(createdUser.status, 'active');
  assert.equal(Object.hasOwn(createdUser, 'password'), false);
  assert.equal(savedUser.password, 'demo-pass');
  assert.equal(savedUser.nickname, '');
  assert.equal(savedUser.avatar, 'seedling');
  assert.equal(savedUser.birthDate, '');
  assert.equal(savedUser.phone, '');
  assert.deepEqual(Array.from(savedUser.classIds), []);
  assert.equal(Number.isNaN(Date.parse(savedUser.createdAt)), false);
  assert.equal(auth.getUsers().some(user => Object.hasOwn(user, 'password')), false);
});

test('rejects duplicate usernames and invalid account details without saving', () => {
  const { auth, storage, getDatabase } = createAuthContext();
  storage.setItem('app_current_user', JSON.stringify({ userId: 'teacher_1' }));
  assert.throws(
    () => auth.createStudentAccount('Học viên mới', ' STUDENT_1 ', 'new-pass'),
    /đã được sử dụng/
  );
  assert.throws(
    () => auth.createStudentAccount('Học viên mới', 'ab', 'new-pass'),
    /Username phải có/
  );
  assert.throws(
    () => auth.createStudentAccount('   ', 'new_student', 'new-pass'),
    /Họ tên học viên/
  );
  assert.throws(
    () => auth.createStudentAccount('a'.repeat(121), 'new_student', 'new-pass'),
    /Họ tên học viên/
  );
  assert.throws(
    () => auth.createStudentAccount('Học viên mới', 'new_student', ''),
    /mật khẩu ban đầu/
  );
  assert.equal(getDatabase().users.length, 3);
});

test('students can update only their own profile details and preset avatar', () => {
  const { auth, storage, context, getDatabase } = createAuthContext();
  storage.setItem('app_current_user', JSON.stringify({ userId: 'student_1' }));

  const updated = auth.updateOwnProfile({
    nickname: '  Mầm xanh  ',
    avatar: 'sunflower',
    birthDate: '2005-04-15',
    phone: '0912 345 678'
  });
  const savedUser = getDatabase().users.find(user => user.userId === 'student_1');
  assert.equal(savedUser.nickname, 'Mầm xanh');
  assert.equal(savedUser.avatar, 'sunflower');
  assert.equal(savedUser.birthDate, '2005-04-15');
  assert.equal(savedUser.phone, '0912 345 678');
  assert.equal(updated.userId, 'student_1');
  assert.equal(Object.hasOwn(updated, 'password'), false);
  assert.equal(context.window.AppState.currentUser.nickname, 'Mầm xanh');
  assert.equal(auth.getCurrentUser().avatar, 'sunflower');
  assert.equal(auth.getCurrentUser().birthDate, '2005-04-15');
  assert.equal(auth.getCurrentUser().phone, '0912 345 678');
  assert.equal(auth.isValidPhone('+84 (912) 345-678'), true);
});

test('profile updates reject non-students, unsupported fields, and invalid values', () => {
  const { auth, storage, getDatabase } = createAuthContext();
  storage.setItem('app_current_user', JSON.stringify({ userId: 'teacher_1' }));
  assert.throws(() => auth.updateOwnProfile({ nickname: 'Teacher' }), /Chỉ học viên/);

  storage.setItem('app_current_user', JSON.stringify({ userId: 'student_1' }));
  assert.throws(() => auth.updateOwnProfile({ fullName: 'Changed' }), /Chỉ được cập nhật/);
  assert.throws(() => auth.updateOwnProfile({ nickname: 'x'.repeat(41) }), /40 ký tự/);
  assert.throws(() => auth.updateOwnProfile({ avatar: 'https://example.com/avatar.png' }), /Avatar đã chọn/);
  assert.throws(() => auth.updateOwnProfile({ birthDate: '2026-02-30' }), /Ngày sinh không hợp lệ/);
  assert.throws(() => auth.updateOwnProfile({ birthDate: '2999-01-01' }), /Ngày sinh không hợp lệ/);
  assert.throws(() => auth.updateOwnProfile({ phone: 'phone-number' }), /Số điện thoại/);
  assert.equal(getDatabase().users.find(user => user.userId === 'student_1').fullName, 'Học viên Demo');
  assert.equal(getDatabase().users.find(user => user.userId === 'student_1').avatar, 'seedling');
});

test('students can change only their own password after verifying the current password', () => {
  const { auth, storage, getDatabase } = createAuthContext();
  storage.setItem('app_current_user', JSON.stringify({ userId: 'student_1' }));

  assert.equal(auth.updateOwnPassword('123', 'new-pass-123'), true);
  assert.equal(getDatabase().users.find(user => user.userId === 'student_1').password, 'new-pass-123');
  assert.equal(auth.login('student_1', 'new-pass-123').userId, 'student_1');
  assert.throws(() => auth.login('student_1', '123'), /không chính xác/);
});

test('password changes reject wrong current passwords, weak values, and non-student callers', () => {
  const { auth, storage, getDatabase } = createAuthContext();
  storage.setItem('app_current_user', JSON.stringify({ userId: 'student_1' }));

  assert.throws(() => auth.updateOwnPassword('wrong', 'new-pass-123'), /Mật khẩu hiện tại không chính xác/);
  assert.throws(() => auth.updateOwnPassword('123', 'short'), /từ 8 đến 128 ký tự/);
  assert.throws(() => auth.updateOwnPassword('123', 'x'.repeat(129)), /từ 8 đến 128 ký tự/);
  assert.throws(() => auth.updateOwnPassword('', 'new-pass-123'), /Vui lòng nhập/);

  getDatabase().users.find(user => user.userId === 'student_1').password = 'old-pass-123';
  assert.throws(
    () => auth.updateOwnPassword('old-pass-123', 'old-pass-123'),
    /phải khác mật khẩu hiện tại/
  );
  storage.setItem('app_current_user', JSON.stringify({ userId: 'teacher_1' }));
  assert.throws(() => auth.updateOwnPassword('123', 'new-pass-123'), /Chỉ học viên/);
  assert.equal(getDatabase().users.find(user => user.userId === 'student_1').password, 'old-pass-123');
  assert.equal(getDatabase().users.find(user => user.userId === 'teacher_1').password, '123');
});

test('student profile and progress share one tab with separate profile and password dialogs', () => {
  const dashboardHtml = fs.readFileSync(
    path.join(__dirname, '..', 'views', 'student', 'dashboard.html'),
    'utf8'
  );
  const dashboardSource = fs.readFileSync(
    path.join(__dirname, '..', 'js', 'features', 'student', 'student-dashboard.js'),
    'utf8'
  );
  assert.match(dashboardHtml, /id="subtab-profile"/);
  assert.match(dashboardHtml, /<nav id="student-tabs-nav" class="student-tabs-nav" aria-label="Điều hướng học viên">[\s\S]*<div id="student-tab-list" class="student-tab-list" role="tablist"/);
  assert.match(dashboardHtml, /data-lucide="book-open"/);
  assert.match(dashboardHtml, /data-lucide="history"/);
  assert.match(dashboardHtml, /data-lucide="user-round"/);
  assert.ok(
    dashboardHtml.indexOf('id="tab-profile"') < dashboardHtml.indexOf('id="tab-catalog"') &&
    dashboardHtml.indexOf('id="tab-catalog"') < dashboardHtml.indexOf('id="tab-history"'),
    'student tabs should be ordered profile, catalog, and history'
  );
  assert.doesNotMatch(dashboardHtml, /id="subtab-stats"|id="tab-stats"/);
  assert.match(dashboardHtml, /Hồ Sơ &amp; Tiến Độ|Hồ Sơ & Tiến Độ/);
  assert.match(dashboardHtml, /id="student-profile-name"/);
  assert.match(dashboardHtml, /id="student-profile-username"/);
  assert.match(dashboardHtml, /id="student-profile-phone"/);
  assert.match(dashboardHtml, /id="student-profile-phone-input"/);
  assert.match(dashboardHtml, /id="student-profile-nickname-display"/);
  assert.match(dashboardHtml, /id="student-profile-nickname"/);
  assert.match(dashboardHtml, /id="student-profile-birth-date"/);
  assert.match(dashboardHtml, /id="student-profile-classes"/);
  assert.match(dashboardHtml, /id="student-profile-avatar"/);
  assert.match(dashboardHtml, /id="btn-edit-student-profile"/);
  assert.match(dashboardHtml, /id="btn-profile-logout"/);
  assert.match(dashboardHtml, /data-avatar="sunflower"/);
  assert.match(dashboardHtml, /id="form-student-password"/);
  assert.match(dashboardHtml, /id="student-password-dialog"[^>]*aria-labelledby="student-password-heading"/);
  assert.match(dashboardHtml, /id="student-profile-edit-dialog"/);
  assert.match(dashboardHtml, /id="student-current-password"/);
  assert.match(dashboardHtml, /id="student-new-password"/);
  assert.match(dashboardHtml, /id="student-confirm-password"/);
  assert.match(dashboardHtml, /id="student-avatar-picker"[^>]*hidden/);
  assert.match(dashboardHtml, /id="student-profile-status"[^>]*role="status"/);
  assert.doesNotMatch(dashboardHtml, /id="student-profile-name"[^>]*<input|id="student-profile-username"[^>]*<input/);
  assert.match(dashboardHtml, /id="dash-streak-count"/);
  assert.match(dashboardHtml, /id="dash-completed-count"/);
  assert.match(dashboardHtml, /id="dash-avg-score"/);
  assert.match(dashboardHtml, /id="student-learning-progress"/);
  assert.match(dashboardHtml, /id="tree-garden-scene"/);
  assert.match(dashboardHtml, /class="garden-sun">☀️<\/span>/);
  assert.match(dashboardHtml, /class="garden-moon">🌙<\/span>/);
  const profileStart = dashboardHtml.indexOf('id="subtab-profile"');
  assert.ok(profileStart < dashboardHtml.indexOf('id="dash-streak-count"'));
  assert.ok(dashboardHtml.indexOf('id="dash-streak-count"') < dashboardHtml.indexOf('id="student-learning-progress"'));
  assert.ok(dashboardHtml.indexOf('id="student-learning-progress"') < dashboardHtml.indexOf('id="tree-garden-scene"'));
  assert.match(dashboardSource, /window\.Auth\?\.getCurrentUser\(\)/);
  assert.match(dashboardSource, /window\.Auth\.updateOwnProfile/);
  assert.match(dashboardSource, /window\.Auth\.updateOwnPassword/);
  assert.match(dashboardSource, /newPassword\.value !== confirmPassword\.value/);
  assert.match(dashboardSource, /window\.LocalStorageDB\.read\(\)\.classes/);
  assert.match(dashboardSource, /Bạn có chắc chắn đổi mật khẩu\?/);

  const componentStyles = fs.readFileSync(
    path.join(__dirname, '..', 'css', 'components.css'),
    'utf8'
  );
  assert.match(componentStyles, /\.student-profile-dialog\s*\{[^}]*margin:\s*auto/s);
  const responsiveStyles = fs.readFileSync(
    path.join(__dirname, '..', 'css', 'responsive.css'),
    'utf8'
  );
  assert.match(componentStyles, /\.student-dashboard\.is-admin-student-profile\s*\{\s*display:\s*block/s);
  assert.match(responsiveStyles, /\.student-dashboard\s*\{[^}]*grid-template-columns:\s*calc\(var\(--student-menu-tile-size\)\s*\+\s*1\.125rem\)\s+minmax\(0,\s*1fr\)/s);
  assert.match(responsiveStyles, /--student-menu-tile-size:\s*min\(7\.5rem,\s*max\(2\.5rem,\s*calc\(\(100dvh\s*-\s*10\.5rem\)\s*\/\s*3\)\)\)/);
  assert.match(responsiveStyles, /@media screen and \(max-width: 850px\)[\s\S]*\.student-dashboard\s*\{[^}]*display:\s*block[\s\S]*\.student-tab-list\s*\{[^}]*grid-template-columns:\s*repeat\(3,\s*minmax\(0,\s*1fr\)\)/);
  assert.match(responsiveStyles, /@media screen and \(max-width: 768px\)[\s\S]*\.student-tab-list\s*\{[^}]*grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\)/);
  assert.match(componentStyles, /\.student-profile-card\s*\{[^}]*display:\s*grid/s);
  assert.match(componentStyles, /\.student-profile-aside\s*\{[^}]*grid-column:\s*1/s);
  assert.match(componentStyles, /\.student-profile-card \.student-profile-details\s*\{[^}]*grid-column:\s*2/s);
  assert.match(componentStyles, /\.student-profile-info-row\s*\{[^}]*background:\s*transparent/s);
  assert.match(responsiveStyles, /\.student-profile-card\s*\{[^}]*grid-template-columns:\s*minmax\(0,\s*1fr\)/s);
});

test('student navigation displays the nickname and teacher accounts show nickname with legal name', () => {
  const elements = new Map([
    ['nav-guest', { classList: { add() {}, remove() {} } }],
    ['nav-user', { classList: { add() {}, remove() {} } }],
    ['user-fullname', { textContent: '' }],
    ['user-role-badge', { textContent: '', className: '' }]
  ]);
  let isAdminRole = false;
  const context = {
    document: {
      body: { classList: { toggle: (className, enabled) => {
        if (className === 'is-admin-role') isAdminRole = enabled;
      } } },
      getElementById: id => elements.get(id)
    }
  };
  vm.createContext(context);
  vm.runInContext(routerSource, context);

  context.updateNavUI({ role: 'student', nickname: 'Mầm xanh', fullName: 'Nguyễn An' });
  assert.equal(elements.get('user-fullname').textContent, 'Mầm xanh');
  assert.equal(isAdminRole, false);
  context.updateNavUI({ role: 'admin', fullName: 'Giáo viên' });
  assert.equal(isAdminRole, true);
  context.updateNavUI({ role: 'student', nickname: '', fullName: 'Nguyễn An' });
  assert.equal(elements.get('user-fullname').textContent, 'Nguyễn An');
  assert.equal(isAdminRole, false);

  const componentStyles = fs.readFileSync(
    path.join(__dirname, '..', 'css', 'components.css'),
    'utf8'
  );
  assert.match(componentStyles, /body\.is-admin-role #student-mascot-floating\s*\{\s*display:\s*none/s);

  const adminUsersSource = fs.readFileSync(
    path.join(__dirname, '..', 'js', 'features', 'admin', 'admin-users.js'),
    'utf8'
  );
  const usersHtml = fs.readFileSync(
    path.join(__dirname, '..', 'views', 'admin', 'tabs', 'tab-users.html'),
    'utf8'
  );
  assert.match(adminUsersSource, /searchableText: \['userId', 'username', 'fullName', 'nickname'\]/);
  assert.match(adminUsersSource, /nickname\.textContent = user\.nickname/);
  assert.match(adminUsersSource, /fullName\.textContent = .*user\.fullName/);
  assert.match(usersHtml, /Biệt danh \(Họ tên\)/);
  assert.doesNotMatch(usersHtml, /Mã tài khoản/);
  assert.doesNotMatch(adminUsersSource, /accountIdCell/);
});

test('AdaptiveQuiz logo returns each role to its home view', () => {
  let currentUser = { role: 'admin' };
  let selectedProfileTab = false;
  let selectedAdminHomeTab = false;
  const views = ['view-auth', 'view-list', 'view-admin'].map(id => ({
    id,
    classList: { toggle(name, hidden) { this.hidden = hidden; } },
    setAttribute() {},
    focus() {}
  }));
  const elements = new Map(views.map(view => [view.id, view]));
  elements.set('admin-tab-quizzes', { click() { selectedAdminHomeTab = true; } });
  elements.set('tab-profile', { click() { selectedProfileTab = true; } });
  const context = {
    document: {
      getElementById: id => elements.get(id),
      querySelectorAll: () => views
    },
    window: { Auth: { getCurrentUser: () => currentUser } }
  };
  vm.createContext(context);
  vm.runInContext(routerSource, context);

  context.navigateHome();
  assert.equal(views.find(view => view.id === 'view-admin').classList.hidden, false);
  assert.equal(selectedAdminHomeTab, true);

  currentUser = { role: 'student' };
  context.navigateHome();
  assert.equal(views.find(view => view.id === 'view-list').classList.hidden, false);
  assert.equal(selectedProfileTab, true);
  assert.match(mainHtml, /<a class="logo-area" id="brand-logo" href="#home"[^>]*aria-label="Về trang chủ AdaptiveQuiz"/);
  assert.match(moduleSource, /document\.getElementById\('brand-logo'\)\?\.addEventListener\('click'/);
});

test('teacher opens the shared readonly student profile and filters its history by student', () => {
  const adminUsersSource = fs.readFileSync(
    path.join(__dirname, '..', 'js', 'features', 'admin', 'admin-users.js'),
    'utf8'
  );
  const adminCoreSource = fs.readFileSync(
    path.join(__dirname, '..', 'js', 'features', 'admin', 'admin-core.js'),
    'utf8'
  );
  const adminDashboardHtml = fs.readFileSync(
    path.join(__dirname, '..', 'views', 'admin', 'dashboard.html'),
    'utf8'
  );
  const sharedModals = fs.readFileSync(
    path.join(__dirname, '..', 'views', 'shared', 'modals.html'),
    'utf8'
  );
  const dashboardSource = fs.readFileSync(
    path.join(__dirname, '..', 'js', 'features', 'student', 'student-dashboard.js'),
    'utf8'
  );
  const dashboardHtml = fs.readFileSync(
    path.join(__dirname, '..', 'views', 'student', 'dashboard.html'),
    'utf8'
  );
  const historySource = fs.readFileSync(
    path.join(__dirname, '..', 'js', 'features', 'student', 'student-history.js'),
    'utf8'
  );
  const context = {
    window: {
      QuizHistoryStorage: {
        readAll: () => [
          { ownerUsername: 'student_1', score: 8 },
          { ownerUsername: 'student_2', score: 10 },
          { username: 'student_1', score: 7 }
        ]
      }
    }
  };
  vm.createContext(context);
  vm.runInContext(historySource, context);
  context.window.QuizHistoryStorage = {
    readAll: () => [
      { ownerUsername: 'student_1', score: 8 },
      { ownerUsername: 'student_2', score: 10 },
      { username: 'student_1', score: 7 }
    ]
  };
  const matchingHistory = context.getQuizHistoryForUser({
    userId: 'student_1',
    username: 'student_1',
    fullName: 'Học viên Một'
  });
  assert.deepEqual(Array.from(matchingHistory, item => item.score), [8, 7]);
  assert.match(adminUsersSource, /btn-view-student-profile/);
  assert.match(adminUsersSource, /renderStudentDashboard\(\{ viewingStudentId: profileButton\.dataset\.userId \}\)/);
  assert.match(adminUsersSource, /showAdminStudentProfile\(\)/);
  assert.match(adminUsersSource, /navigateTo\('view-admin'\)/);
  assert.match(adminUsersSource, /window\.requestAnimationFrame\(\(\) => window\.scrollTo\(0,\s*0\)\)/);
  assert.match(adminDashboardHtml, /id="admin-student-profile-content"[^>]*hidden/);
  assert.match(adminCoreSource, /function showAdminStudentProfile\(\)/);
  assert.match(adminCoreSource, /studentProfile\.hidden = true/);
  assert.match(dashboardSource, /viewingStudentId\s*\?\s*document\.getElementById\('admin-student-profile-content'\)/);
  assert.match(dashboardHtml, /student-profile-admin-toolbar" hidden/);
  assert.match(dashboardHtml, /id="btn-return-admin-profile"[^>]*aria-label="Quay lại"/);
  assert.match(dashboardSource, /adminToolbar\.hidden = false/);
  assert.match(dashboardSource, /document\.getElementById\('admin-tab-users'\)\?\.click\(\)/);
  assert.match(adminUsersSource, /Chỉ giáo viên mới có thể xem hồ sơ và thống kê học viên/);
  assert.doesNotMatch(sharedModals, /modal-student-profile|student-profile-modal-/);
  assert.match(dashboardSource, /window\.AppState\.viewingStudentId = viewingStudentId/);
  assert.match(dashboardSource, /getQuizHistoryForUser\(viewedStudent\)/);
  assert.match(dashboardSource, /editButton\.disabled = isReadOnly/);
  assert.match(dashboardSource, /passwordButton\.disabled = isReadOnly/);
  assert.match(dashboardSource, /avatar\.disabled = isReadOnly/);
  assert.match(dashboardSource, /waterButton\.disabled = isReadOnly/);
  assert.match(dashboardSource, /studentNav\.hidden = true/);
  assert.match(dashboardSource, /is-admin-student-profile/);
  assert.match(dashboardSource, /function isViewingStudentAsAdmin\(\)/);
  assert.match(historySource, /window\.getQuizHistoryForUser = getQuizHistoryForUser/);
});

test('login form requests username and password without self-registration', () => {
  const authHtml = fs.readFileSync(
    path.join(__dirname, '..', 'views', 'auth', 'auth.html'),
    'utf8'
  );
  assert.match(authHtml, /id="demo-username"[^>]*autocomplete="username"/);
  assert.match(authHtml, /id="demo-password"[^>]*type="password"[^>]*autocomplete="current-password"/);
  assert.match(authHtml, /id="btn-demo-login"[^>]*type="submit"/);
  assert.doesNotMatch(authHtml, /demo-account-select|đăng ký|tạo tài khoản/i);
});

test('teacher account form collects name, username, and password without a role selector', () => {
  const usersHtml = fs.readFileSync(
    path.join(__dirname, '..', 'views', 'admin', 'tabs', 'tab-users.html'),
    'utf8'
  );
  const sharedModals = fs.readFileSync(
    path.join(__dirname, '..', 'views', 'shared', 'modals.html'),
    'utf8'
  );
  const adminUsersSource = fs.readFileSync(
    path.join(__dirname, '..', 'js', 'features', 'admin', 'admin-users.js'),
    'utf8'
  );
  const adminCoreSource = fs.readFileSync(
    path.join(__dirname, '..', 'js', 'features', 'admin', 'admin-core.js'),
    'utf8'
  );
  assert.match(usersHtml, /id="admin-user-tab-students"[^>]*role="tab"/);
  assert.match(usersHtml, /id="admin-user-tab-classes"[^>]*role="tab"/);
  assert.match(usersHtml, /id="admin-user-panel-students"[^>]*role="tabpanel"/);
  assert.match(usersHtml, /id="admin-user-panel-classes"[^>]*role="tabpanel"[^>]*hidden/);
  assert.match(usersHtml, /id="btn-open-admin-create-student"/);
  assert.match(usersHtml, /<option value="student" selected>Học viên<\/option>/);
  assert.match(sharedModals, /id="modal-create-student"[^>]*admin-modal[^>]*hidden/);
  assert.match(sharedModals, /id="form-admin-create-student"/);
  assert.match(sharedModals, /<input[^>]*id="admin-new-student-name"[^>]*required/);
  assert.match(sharedModals, /<input[^>]*id="admin-new-student-username"[^>]*pattern="\[A-Za-z0-9\._-\]\{3,40\}"/);
  assert.match(sharedModals, /id="admin-new-student-password"[^>]*autocomplete="new-password"[^>]*required/);
  assert.match(sharedModals, /id="btn-cancel-create-student"/);
  assert.match(adminUsersSource, /function setupAdminUserTabs\(\)/);
  assert.match(adminUsersSource, /function closeCreateStudentModal\(\)/);
  assert.match(adminUsersSource, /event\.target === createStudentModal/);
  assert.match(adminCoreSource, /'modal-create-student': 'btn-cancel-create-student'/);
  assert.doesNotMatch(sharedModals, /<select[^>]*name="role"/);
});

test('resolves the current session against the latest database user record', () => {
  const { auth, storage, getDatabase } = createAuthContext();
  storage.setItem('app_current_user', JSON.stringify({ userId: 'student_1', role: 'admin' }));
  assert.equal(auth.getCurrentUser().role, 'student');

  const database = getDatabase();
  database.users.find(user => user.userId === 'student_1').status = 'locked';
  storage.setItem('app_current_user', JSON.stringify({ userId: 'student_1' }));
  assert.equal(auth.getCurrentUser(), null);
  assert.equal(storage.getItem('app_current_user'), null);
});

test('allows admin account updates while rejecting non-admin updates', () => {
  const { auth, storage, getDatabase } = createAuthContext();
  storage.setItem('app_current_user', JSON.stringify({ userId: 'student_1' }));
  assert.throws(() => auth.updateUser('inactive_1', { status: 'active' }), /Chỉ tài khoản giáo viên/);

  storage.setItem('app_current_user', JSON.stringify({ userId: 'teacher_1' }));
  const updatedUser = auth.updateUser('inactive_1', { status: 'active' });
  assert.equal(Object.hasOwn(updatedUser, 'password'), false);
  assert.equal(getDatabase().users.find(user => user.userId === 'inactive_1').status, 'active');
  assert.throws(() => auth.updateUser('student_1', { fullName: 'Changed' }), /Chỉ được cập nhật role, status hoặc classIds/);
});

test('updates student class IDs and removes memberships when changing the account to admin', () => {
  const { auth, storage, getDatabase } = createAuthContext();
  storage.setItem('app_current_user', JSON.stringify({ userId: 'teacher_1' }));
  const database = getDatabase();
  database.classes = [{ classId: 'class_10a', name: '10A', status: 'active' }];

  auth.updateUser('student_1', { classIds: ['class_10a'] });
  assert.deepEqual(Array.from(getDatabase().users.find(user => user.userId === 'student_1').classIds), ['class_10a']);
  auth.updateUser('student_1', { role: 'admin' });
  assert.deepEqual(Array.from(getDatabase().users.find(user => user.userId === 'student_1').classIds), []);
  assert.throws(() => auth.updateUser('inactive_1', { classIds: 'class_10a' }), /mảng classId hợp lệ/);
});

test('logout clears the session and runtime user', () => {
  const { auth, storage, context } = createAuthContext();
  storage.setItem('app_current_user', JSON.stringify({ userId: 'student_1' }));
  context.window.AppState.currentUser = { userId: 'student_1' };

  auth.logout();
  assert.equal(storage.getItem('app_current_user'), null);
  assert.equal(context.window.AppState.currentUser, null);
});
