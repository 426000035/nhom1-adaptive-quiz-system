/* ==========================================================================
   Adaptive Quiz System - Theme Selection and Persistence
   ========================================================================== */

window.ThemeManager = {
  sessionOverrideKey: 'adaptive_quiz_theme_override',
  defaultTheme: 'evening',
  availableThemes: ['morning', 'evening'],
  manualTheme: null,
  clockIntervalId: null,

  getCurrentUser() {
    try {
      return window.Auth?.getCurrentUser() || null;
    } catch (error) {
      console.error('Không thể kiểm tra phiên đăng nhập để áp dụng giao diện:', error);
      return null;
    }
  },

  getAutomaticTheme(date = new Date()) {
    const hour = date.getHours();
    if (hour >= 6 && hour < 18) return 'morning';
    return 'evening';
  },

  applyTheme(theme) {
    if (!this.availableThemes.includes(theme)) {
      console.warn(`Giao diện không hợp lệ: ${theme}`);
      return false;
    }

    document.body.dataset.theme = theme;

    const toggle = document.getElementById('theme-toggle');
    if (toggle) {
      const darkModeEnabled = theme === 'evening';
      const label = document.getElementById('theme-toggle-label');
      if (label) label.textContent = darkModeEnabled ? 'Light mode' : 'Dark mode';
      toggle.setAttribute('aria-pressed', String(darkModeEnabled));
      toggle.setAttribute('aria-label', darkModeEnabled ? 'Tắt chế độ tối' : 'Bật chế độ tối');
      toggle.setAttribute('title', darkModeEnabled ? 'Tắt chế độ tối' : 'Bật chế độ tối');
    }

    return true;
  },

  applyAutomaticTheme() {
    if (this.manualTheme) return false;
    return this.applyTheme(this.getAutomaticTheme());
  },

  setManualTheme(theme) {
    if (!this.availableThemes.includes(theme)) {
      console.warn(`Giao diện không hợp lệ: ${theme}`);
      return false;
    }

    this.manualTheme = theme;
    this.applyTheme(theme);

    if (this.getCurrentUser()) {
      try {
        sessionStorage.setItem(this.sessionOverrideKey, theme);
      } catch (error) {
        console.error('Không thể giữ giao diện đã chọn trong phiên đăng nhập:', error);
      }
    }

    return true;
  },

  startNewLoginSession() {
    this.manualTheme = null;
    try {
      sessionStorage.removeItem(this.sessionOverrideKey);
    } catch (error) {
      console.error('Không thể xóa giao diện thủ công của phiên trước:', error);
    }
    this.applyAutomaticTheme();
  },

  endLoginSession() {
    this.manualTheme = null;
    try {
      sessionStorage.removeItem(this.sessionOverrideKey);
    } catch (error) {
      console.error('Không thể xóa giao diện thủ công khi đăng xuất:', error);
    }
    this.applyAutomaticTheme();
  },

  restoreSessionTheme() {
    if (!this.getCurrentUser()) {
      this.manualTheme = null;
      return this.applyAutomaticTheme();
    }

    try {
      const sessionTheme = sessionStorage.getItem(this.sessionOverrideKey);
      if (this.availableThemes.includes(sessionTheme)) {
        this.manualTheme = sessionTheme;
        return this.applyTheme(sessionTheme);
      }
      sessionStorage.removeItem(this.sessionOverrideKey);
    } catch (error) {
      console.error('Không thể khôi phục giao diện của phiên đăng nhập:', error);
    }

    this.manualTheme = null;
    return this.applyAutomaticTheme();
  },

  checkAutomaticTheme() {
    if (this.manualTheme) return;
    this.applyAutomaticTheme();
  },

  init() {
    this.restoreSessionTheme();

    const toggle = document.getElementById('theme-toggle');
    if (!toggle) {
      console.error('Không tìm thấy nút chuyển giao diện #theme-toggle.');
      return;
    }

    toggle.addEventListener('click', () => {
      const currentTheme = this.availableThemes.includes(document.body.dataset.theme)
        ? document.body.dataset.theme
        : this.getAutomaticTheme();
      const nextTheme = currentTheme === 'evening' ? 'morning' : 'evening';
      this.setManualTheme(nextTheme);
    });

    if (this.clockIntervalId !== null) clearInterval(this.clockIntervalId);
    this.clockIntervalId = setInterval(() => this.checkAutomaticTheme(), 60000);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') this.checkAutomaticTheme();
    });
  }
};

document.addEventListener('DOMContentLoaded', () => {
  window.ThemeManager.init();
});
