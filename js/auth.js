/* ==========================================================================
   Adaptive Quiz System - Authentication & Session Management (js/auth.js)
   ========================================================================== */

window.Auth = {
  // Kho lưu trữ danh sách tài khoản trong bộ nhớ tạm
  users: [],

  /**
   * Khởi tạo Module Auth: Tải danh sách user từ data/users.json vào localStorage
   */
  async init() {
    const storedUsers = localStorage.getItem('adaptive_quiz_users');
    if (storedUsers) {
      this.users = JSON.parse(storedUsers);
    } else {
      try {
        const response = await fetch('data/users.json');
        if (response.ok) {
          this.users = await response.json();
          localStorage.setItem('adaptive_quiz_users', JSON.stringify(this.users));
        }
      } catch (error) {
        console.error("Không thể tải data/users.json:", error);
      }
    }
  },

  /**
   * Xử lý Đăng Nhập
   * @param {string} username 
   * @param {string} password 
   * @returns {Object|null} User object nếu thành công, null nếu thất bại
   */
  login(username, password) {
    const user = this.users.find(u => u.username === username && u.password === password);
    if (user) {
      // Lưu thông tin phiên làm việc (không lưu password)
      const sessionData = {
        id: user.id,
        username: user.username,
        fullName: user.fullName,
        role: user.role
      };
      localStorage.setItem('adaptive_quiz_current_user', JSON.stringify(sessionData));
      window.AppState.currentUser = sessionData;
      return sessionData;
    }
    return null;
  },

  /**
   * Xử lý Đăng Ký Tài Khoản Mới
   * @param {string} fullName 
   * @param {string} username 
   * @param {string} password 
   * @returns {Object} { success: boolean, message: string }
   */
  register(fullName, username, password) {
    // Kiểm tra trùng username
    const existingUser = this.users.find(u => u.username === username);
    if (existingUser) {
      return { success: false, message: "Tên đăng nhập đã tồn tại!" };
    }

    const newUser = {
      id: "usr_" + Date.now(),
      username: username,
      password: password,
      fullName: fullName,
      role: "student",
      history: []
    };

    this.users.push(newUser);
    localStorage.setItem('adaptive_quiz_users', JSON.stringify(this.users));
    return { success: true, message: "Đăng ký tài khoản thành công!" };
  },

  /**
   * Lấy thông tin User hiện tại từ localStorage
   */
  getCurrentUser() {
    const session = localStorage.getItem('adaptive_quiz_current_user');
    if (session) {
      const user = JSON.parse(session);
      window.AppState.currentUser = user;
      return user;
    }
    return null;
  },

  /**
   * Đăng Xuất Tài Khoản
   */
  logout() {
    localStorage.removeItem('adaptive_quiz_current_user');
    window.AppState.currentUser = null;
  }
};
