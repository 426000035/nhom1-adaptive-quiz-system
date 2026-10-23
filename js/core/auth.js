/* ==========================================================================
   Adaptive Quiz System - Authentication Module (js/core/auth.js)
   ========================================================================== */

window.Auth = {
  toPublicUser(user) {
    const publicUser = { ...user };
    delete publicUser.password;
    return publicUser;
  },

  getUsers() {
    return window.LocalStorageDB.read().users.map(user => this.toPublicUser(user));
  },

  getCurrentUser() {
    let session;
    try {
      session = JSON.parse(localStorage.getItem('app_current_user') || 'null');
    } catch (error) {
      console.error('Không thể đọc phiên đăng nhập demo:', error);
      return null;
    }
    if (!session || typeof session.userId !== 'string') return null;

    try {
      const user = this.getUsers().find(item => item.userId === session.userId);
      if (!user || user.status !== 'active' || !['admin', 'student'].includes(user.role)) {
        localStorage.removeItem('app_current_user');
        return null;
      }
      return {
        userId: user.userId,
        username: user.username,
        fullName: user.fullName,
        nickname: user.nickname,
        avatar: user.avatar,
        birthDate: user.birthDate || '',
        phone: user.phone || '',
        classIds: user.classIds || [],
        role: user.role,
        status: user.status
      };
    } catch (error) {
      console.error('Không thể xác thực phiên với database demo:', error);
      return null;
    }
  },

  async init() {
    return undefined;
  },

  login(username, password) {
    if (typeof username !== 'string' || !username.trim() ||
        typeof password !== 'string' || !password) {
      throw new Error('Vui lòng nhập username và mật khẩu.');
    }
    const normalizedUsername = username.trim().toLocaleLowerCase();
    const user = window.LocalStorageDB.read().users.find(item =>
      String(item.username || '').trim().toLocaleLowerCase() === normalizedUsername
    );
    if (!user || user.password !== password) {
      throw new Error('Username hoặc mật khẩu không chính xác.');
    }
    if (user.status !== 'active') {
      throw new Error('Tài khoản không hoạt động. Hãy liên hệ giáo viên.');
    }
    if (!['admin', 'student'].includes(user.role)) {
      throw new Error('Không thể đăng nhập bằng tài khoản này.');
    }

    localStorage.setItem('app_current_user', JSON.stringify({ userId: user.userId }));
    const sessionUser = this.getCurrentUser();
    if (!sessionUser) throw new Error('Không thể khởi tạo phiên đăng nhập cho tài khoản đã chọn.');
    window.AppState.currentUser = sessionUser;
    window.ThemeManager?.startNewLoginSession();
    return sessionUser;
  },

  createStudentAccount(fullName, username, password) {
    if (this.getCurrentUser()?.role !== 'admin') {
      throw new Error('Chỉ giáo viên mới có thể tạo tài khoản học viên.');
    }
    if (typeof fullName !== 'string' || !fullName.trim() || fullName.trim().length > 120) {
      throw new Error('Họ tên học viên phải có từ 1 đến 120 ký tự.');
    }
    if (typeof username !== 'string' || !/^[a-z0-9._-]{3,40}$/i.test(username.trim())) {
      throw new Error('Username phải có từ 3 đến 40 ký tự chữ, số, dấu chấm, gạch dưới hoặc gạch ngang.');
    }
    if (typeof password !== 'string' || !password) {
      throw new Error('Vui lòng nhập mật khẩu ban đầu.');
    }

    const normalizedUsername = username.trim().toLocaleLowerCase();
    const uuid = window.crypto?.randomUUID?.();
    const userId = `usr_${uuid || `${Date.now()}_${Math.random().toString(36).slice(2)}`}`;
    const createdUser = window.LocalStorageDB.update(database => {
      if (database.users.some(user =>
        String(user.username || '').trim().toLocaleLowerCase() === normalizedUsername
      )) {
        throw new Error('Username này đã được sử dụng. Vui lòng chọn username khác.');
      }
      if (database.users.some(user => user.userId === userId)) {
        throw new Error('Không thể tạo mã tài khoản duy nhất. Vui lòng thử lại.');
      }

      database.users.push({
        userId,
        username: normalizedUsername,
        password,
        fullName: fullName.trim(),
        nickname: '',
        avatar: 'seedling',
        birthDate: '',
        phone: '',
        role: 'student',
        status: 'active',
        classIds: [],
        createdAt: new Date().toISOString()
      });
    }).users.find(user => user.userId === userId);

    if (!createdUser) throw new Error('Không thể lưu tài khoản học viên.');
    return this.toPublicUser(createdUser);
  },

  updateOwnProfile(patch) {
    const currentUser = this.getCurrentUser();
    if (currentUser?.role !== 'student') {
      throw new Error('Chỉ học viên đang đăng nhập mới có thể cập nhật hồ sơ cá nhân.');
    }
    if (!patch || typeof patch !== 'object' || Array.isArray(patch)) {
      throw new Error('Thông tin hồ sơ cần cập nhật không hợp lệ.');
    }
    const allowedFields = new Set(['nickname', 'avatar', 'birthDate', 'phone']);
    const fields = Object.keys(patch);
    if (fields.length === 0 || fields.some(field => !allowedFields.has(field))) {
      throw new Error('Chỉ được cập nhật biệt danh, ngày sinh, số điện thoại và avatar của hồ sơ cá nhân.');
    }
    if (Object.prototype.hasOwnProperty.call(patch, 'nickname') &&
        (typeof patch.nickname !== 'string' || patch.nickname.trim().length > 40)) {
      throw new Error('Biệt danh không được vượt quá 40 ký tự.');
    }
    const allowedAvatars = new Set(['seedling', 'sunflower', 'book', 'star', 'fox']);
    if (Object.prototype.hasOwnProperty.call(patch, 'avatar') &&
        !allowedAvatars.has(patch.avatar)) {
      throw new Error('Avatar đã chọn không hợp lệ.');
    }
    if (Object.prototype.hasOwnProperty.call(patch, 'birthDate') &&
        !this.isValidBirthDate(patch.birthDate)) {
      throw new Error('Ngày sinh không hợp lệ hoặc nằm trong tương lai.');
    }
    if (Object.prototype.hasOwnProperty.call(patch, 'phone') &&
        !this.isValidPhone(patch.phone)) {
      throw new Error('Số điện thoại cần có từ 9 đến 15 chữ số và chỉ dùng ký tự số, khoảng trắng, dấu +, -, dấu chấm hoặc ngoặc.');
    }

    const updatedUser = window.LocalStorageDB.update(database => {
      const user = database.users.find(item => item.userId === currentUser.userId);
      if (!user || user.status !== 'active' || user.role !== 'student') {
        throw new Error('Tài khoản học viên không còn khả dụng.');
      }
      if (Object.prototype.hasOwnProperty.call(patch, 'nickname')) {
        user.nickname = patch.nickname.trim();
      }
      if (Object.prototype.hasOwnProperty.call(patch, 'avatar')) {
        user.avatar = patch.avatar;
      }
      if (Object.prototype.hasOwnProperty.call(patch, 'birthDate')) {
        user.birthDate = patch.birthDate;
      }
      if (Object.prototype.hasOwnProperty.call(patch, 'phone')) {
        user.phone = patch.phone.trim();
      }
    }).users.find(user => user.userId === currentUser.userId);
    if (!updatedUser) throw new Error('Không thể lưu hồ sơ học viên.');

    const publicUser = this.toPublicUser(updatedUser);
    window.AppState.currentUser = this.getCurrentUser();
    return publicUser;
  },

  isValidBirthDate(value) {
    if (typeof value !== 'string') return false;
    if (value === '') return true;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const [year, month, day] = value.split('-').map(Number);
    const parsed = new Date(Date.UTC(year, month - 1, day));
    const today = new Date();
    const localToday = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    return parsed.getUTCFullYear() === year &&
      parsed.getUTCMonth() === month - 1 &&
      parsed.getUTCDate() === day &&
      value <= localToday;
  },

  isValidPhone(value) {
    if (typeof value !== 'string') return false;
    if (value === '') return true;
    if (!/^[+()\d\s.-]+$/.test(value)) return false;
    const digitCount = value.replace(/\D/g, '').length;
    return digitCount >= 9 && digitCount <= 15;
  },

  updateOwnPassword(currentPassword, newPassword) {
    const currentUser = this.getCurrentUser();
    if (currentUser?.role !== 'student') {
      throw new Error('Chỉ học viên đang đăng nhập mới có thể đổi mật khẩu.');
    }
    if (typeof currentPassword !== 'string' || !currentPassword ||
        typeof newPassword !== 'string' || !newPassword) {
      throw new Error('Vui lòng nhập mật khẩu hiện tại và mật khẩu mới.');
    }
    if (newPassword.length < 8 || newPassword.length > 128) {
      throw new Error('Mật khẩu mới phải có từ 8 đến 128 ký tự.');
    }
    if (currentPassword === newPassword) {
      throw new Error('Mật khẩu mới phải khác mật khẩu hiện tại.');
    }

    window.LocalStorageDB.update(database => {
      const user = database.users.find(item => item.userId === currentUser.userId);
      if (!user || user.status !== 'active' || user.role !== 'student') {
        throw new Error('Tài khoản học viên không còn khả dụng.');
      }
      if (user.password !== currentPassword) {
        throw new Error('Mật khẩu hiện tại không chính xác.');
      }
      user.password = newPassword;
    });
    return true;
  },

  updateUser(userId, patch) {
    const currentUser = this.getCurrentUser();
    if (currentUser?.role !== 'admin') {
      throw new Error('Chỉ tài khoản giáo viên demo mới có thể cập nhật người dùng.');
    }
    if (!patch || typeof patch !== 'object' || Array.isArray(patch)) {
      throw new Error('Thông tin cập nhật tài khoản không hợp lệ.');
    }
    const allowedFields = new Set(['role', 'status', 'classIds']);
    if (Object.keys(patch).length === 0 ||
        Object.keys(patch).some(field => !allowedFields.has(field))) {
      throw new Error('Chỉ được cập nhật role, status hoặc classIds của tài khoản.');
    }
    if (Object.prototype.hasOwnProperty.call(patch, 'classIds') &&
        (!Array.isArray(patch.classIds) || patch.classIds.some(classId =>
          typeof classId !== 'string' || !classId.trim()
        ))) {
      throw new Error('Danh sách lớp học phải là mảng classId hợp lệ.');
    }
    const updatedUser = window.LocalStorageDB.update(database => {
      const user = database.users.find(item => item.userId === userId);
      if (!user) throw new Error('Không tìm thấy tài khoản cần cập nhật.');
      if (Object.prototype.hasOwnProperty.call(patch, 'classIds') &&
          (patch.role || user.role) !== 'student') {
        throw new Error('Chỉ tài khoản học viên mới được gán lớp học.');
      }
      Object.assign(user, patch);
      if (user.role !== 'student') user.classIds = [];
    }).users.find(item => item.userId === userId);
    if (!updatedUser) throw new Error('Không tìm thấy tài khoản cần cập nhật.');
    return this.toPublicUser(updatedUser);
  },

  logout() {
    localStorage.removeItem('app_current_user');
    window.AppState.currentUser = null;
    window.ThemeManager?.endLoginSession();
  }
};

function navigateAfterLogin(user) {
  window.AppState.currentUser = user;
  if (typeof updateNavUI === 'function') updateNavUI(user);
  if (user.role === 'admin') {
    if (typeof renderAdminDashboard === 'function') renderAdminDashboard();
    if (typeof navigateTo === 'function') navigateTo('view-admin');
  } else {
    if (typeof renderStudentDashboard === 'function') {
      Promise.resolve(renderStudentDashboard()).then(() => {
        if (typeof navigateTo === 'function') navigateTo('view-list');
      }).catch(error => {
        console.error('Không thể tải dashboard học viên:', error);
        if (typeof Swal !== 'undefined') {
          Swal.fire({ icon: 'error', title: 'Không thể mở khu vực học viên', text: error.message });
        }
      });
      return;
    }
    if (typeof navigateTo === 'function') navigateTo('view-list');
  }
}

function initAuthModule() {
  document.getElementById('brand-logo')?.addEventListener('click', event => {
    event.preventDefault();
    navigateHome();
  });

  const loginForm = document.getElementById('form-demo-login');
  const usernameInput = document.getElementById('demo-username');
  const passwordInput = document.getElementById('demo-password');
  const loginButton = document.getElementById('btn-demo-login');
  const status = document.getElementById('demo-login-status');

  if (loginForm && usernameInput && passwordInput && loginButton && status) {
    try {
      const users = window.Auth.getUsers();
      const activeUsers = users.filter(user => user.status === 'active');
      status.textContent = activeUsers.length
        ? 'Tài khoản demo: usr_01 (học viên) hoặc usr_02 (giáo viên); mật khẩu ban đầu: 123.'
        : 'Database demo chưa có tài khoản đang hoạt động.';
    } catch (error) {
      status.textContent = `Không thể tải tài khoản demo: ${error.message}`;
    }

    loginForm.addEventListener('submit', event => {
      event.preventDefault();
      loginButton.disabled = true;
      status.textContent = 'Đang xác thực tài khoản demo...';
      try {
        const user = window.Auth.login(usernameInput.value, passwordInput.value);
        navigateAfterLogin(user);
        passwordInput.value = '';
        if (typeof Swal !== 'undefined') {
          Swal.fire({ icon: 'success', title: 'Đăng nhập thành công', timer: 1200, showConfirmButton: false });
        }
      } catch (error) {
        status.textContent = error.message;
        if (typeof Swal !== 'undefined') {
          Swal.fire({ icon: 'error', title: 'Không thể đăng nhập', text: error.message });
        }
      } finally {
        loginButton.disabled = false;
      }
    });
  }

  document.getElementById('btn-nav-login')?.addEventListener('click', () => {
    if (typeof navigateTo === 'function') navigateTo('view-auth');
  });

  document.getElementById('btn-logout')?.addEventListener('click', () => {
    window.Auth.logout();
    if (typeof updateNavUI === 'function') updateNavUI(null);
    if (typeof navigateTo === 'function') navigateTo('view-auth');
  });
}

window.initAuthModule = initAuthModule;
