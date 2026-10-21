/* ==========================================================================
   Adaptive Quiz System - Authentication Module (js/auth.js)
   ========================================================================== */

window.Auth = {
  // 1. Lấy danh sách người dùng từ localStorage
  getUsers() {
    try {
      return JSON.parse(localStorage.getItem('app_users') || '[]');
    } catch (e) {
      return [];
    }
  },

  // 2. Lấy người dùng đang đăng nhập
  getCurrentUser() {
    try {
      return JSON.parse(localStorage.getItem('app_current_user') || 'null');
    } catch (e) {
      return null;
    }
  },

  // 3. Khởi tạo dữ liệu người dùng mặc định
  async init() {
    let users = this.getUsers();
    
    if (!users || users.length === 0) {
      users = [
        { username: 'admin', password: '123', fullName: 'Quản Trị Viên', role: 'admin', status: 'active' },
        { username: 'student', password: '123', fullName: 'Học Viên Demo', role: 'student', status: 'active' }
      ];
      localStorage.setItem('app_users', JSON.stringify(users));
    }
  },

  // 4. Logic Đăng nhập
  login(username, password) {
    const users = this.getUsers();
    const uInput = String(username || '').trim().toLowerCase();
    const pInput = String(password || '').trim();

    const user = users.find(u => 
      String(u.username || '').trim().toLowerCase() === uInput && 
      String(u.password || '').trim() === pInput
    );

    if (user) {
      if (user.status === 'locked') return null;
      localStorage.setItem('app_current_user', JSON.stringify(user));
      return user;
    }
    return null;
  },

  // 5. Logic Đăng ký
  register(fullName, username, password) {
    const users = this.getUsers();
    const uInput = String(username || '').trim().toLowerCase();

    if (users.some(u => String(u.username || '').trim().toLowerCase() === uInput)) {
      return { success: false, message: 'Tên đăng nhập đã tồn tại!' };
    }

    const newUser = { 
      username: String(username).trim(), 
      password: String(password).trim(), 
      fullName: String(fullName).trim(), 
      role: 'student', 
      status: 'active' 
    };

    users.push(newUser);
    localStorage.setItem('app_users', JSON.stringify(users));
    return { success: true, message: 'Đăng ký thành công!' };
  },

  // 6. Logic Đăng xuất
  logout() {
    localStorage.removeItem('app_current_user');
  }
};

function initAuthModule() {
  document.getElementById('link-to-register')?.addEventListener('click', (e) => {
    e.preventDefault();
    document.getElementById('form-login-box')?.classList.add('hidden');
    document.getElementById('form-register-box')?.classList.remove('hidden');
  });

  document.getElementById('link-to-login')?.addEventListener('click', (e) => {
    e.preventDefault();
    document.getElementById('form-register-box')?.classList.add('hidden');
    document.getElementById('form-login-box')?.classList.remove('hidden');
  });

  document.getElementById('btn-nav-login')?.addEventListener('click', () => {
    if (typeof navigateTo === 'function') navigateTo('view-auth');
  });

  document.getElementById('btn-nav-register')?.addEventListener('click', () => {
    if (typeof navigateTo === 'function') navigateTo('view-auth');
    document.getElementById('form-login-box')?.classList.add('hidden');
    document.getElementById('form-register-box')?.classList.remove('hidden');
  });

  // Submit Form Đăng nhập
  const loginForm = document.getElementById('form-login');
  if (loginForm) {
    loginForm.onsubmit = function (e) {
      e.preventDefault();

      const u = document.getElementById('login-username')?.value;
      const p = document.getElementById('login-password')?.value;

      if (!u || !p) {
        if (typeof Swal !== 'undefined') Swal.fire({ icon: 'warning', title: 'Vui lòng nhập đầy đủ thông tin!' });
        return;
      }

      const user = window.Auth.login(u, p);

      if (user) {
        if (typeof updateNavUI === 'function') updateNavUI(user);

        if (user.role === 'admin') {
          if (typeof renderAdminDashboard === 'function') renderAdminDashboard();
          if (typeof navigateTo === 'function') navigateTo('view-admin');
        } else {
          // Render danh sách đề thi cho Student khi đăng nhập thành công
          if (typeof filterAndRenderQuizzes === 'function') {
            filterAndRenderQuizzes();
          }
          if (typeof navigateTo === 'function') navigateTo('view-list');
        }

        if (typeof Swal !== 'undefined') {
          Swal.fire({ icon: 'success', title: 'Đăng nhập thành công!', timer: 1200, showConfirmButton: false });
        }
      } else {
        if (typeof Swal !== 'undefined') {
          Swal.fire({ icon: 'error', title: 'Thất bại', text: 'Sai thông tin đăng nhập hoặc tài khoản đã bị khóa!' });
        } else {
          alert('Sai thông tin đăng nhập hoặc tài khoản đã bị khóa!');
        }
      }
    };
  }

  // Submit Form Đăng ký
  const regForm = document.getElementById('form-register');
  if (regForm) {
    regForm.onsubmit = function (e) {
      e.preventDefault();
      const fn = document.getElementById('reg-fullname')?.value;
      const u = document.getElementById('reg-username')?.value;
      const p = document.getElementById('reg-password')?.value;

      const res = window.Auth.register(fn, u, p);
      if (res.success) {
        if (typeof Swal !== 'undefined') Swal.fire({ icon: 'success', title: 'Thành công', text: res.message });
        document.getElementById('form-register-box')?.classList.add('hidden');
        document.getElementById('form-login-box')?.classList.remove('hidden');
      } else {
        if (typeof Swal !== 'undefined') Swal.fire({ icon: 'error', title: 'Lỗi', text: res.message });
      }
    };
  }

  // Sự kiện Đăng xuất
  document.getElementById('btn-logout')?.addEventListener('click', () => {
    window.Auth.logout();
    if (typeof updateNavUI === 'function') updateNavUI(null);
    if (typeof navigateTo === 'function') navigateTo('view-auth');
  });
}

window.initAuthModule = initAuthModule;