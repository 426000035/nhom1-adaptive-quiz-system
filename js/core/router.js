/* ==========================================================================
   Adaptive Quiz System - SPA Router & Nav Module (js/core/router.js)
   ========================================================================== */

/**
 * SPA View Router - Điều hướng ẩn/hiện giữa các Màn hình (Views)
 * @param {string} viewId - ID của section view cần hiển thị (VD: 'view-list', 'view-admin')
 */
function navigateTo(viewId) {
  if (typeof closeMobileModuleMenu === 'function') closeMobileModuleMenu();

  let targetView = document.getElementById(viewId);
  if (!targetView) targetView = document.getElementById('view-list');

  document.querySelectorAll('.view-section').forEach(sec => {
    const isActive = sec === targetView;
    sec.classList.toggle('hidden', !isActive);
    sec.setAttribute('aria-hidden', String(!isActive));
  });

  if (targetView) {
    targetView.focus({ preventScroll: true });
  }
  if (typeof syncMobileModuleMenu === 'function') syncMobileModuleMenu();
}

function navigateHome() {
  const user = window.Auth?.getCurrentUser();
  if (!user) {
    navigateTo('view-auth');
    return;
  }

  if (user.role === 'admin') {
    document.getElementById('admin-tab-quizzes')?.click();
    navigateTo('view-admin');
    return;
  }

  navigateTo('view-list');
  document.getElementById('tab-profile')?.click();
}

/**
 * Cập nhật thanh Navigation Bar (Top Header) dựa trên thông tin đăng nhập
 * @param {Object|null} user - Đối tượng người dùng từ Auth.getCurrentUser()
 */
function updateNavUI(user) {
  const navGuest = document.getElementById('nav-guest');
  const navUser = document.getElementById('nav-user');
  const userFullname = document.getElementById('user-fullname');
  const userRoleBadge = document.getElementById('user-role-badge');
  document.body.classList.toggle('is-admin-role', user?.role === 'admin');

  if (user) {
    navGuest?.classList.add('hidden');
    navUser?.classList.remove('hidden');
    
    if (userFullname) {
      userFullname.textContent = user.role === 'student'
        ? (user.nickname || user.fullName)
        : user.fullName;
    }
    
    if (userRoleBadge) {
      const userRole = user.role || 'student';
      userRoleBadge.textContent = userRole.toUpperCase();
      userRoleBadge.className = `badge ${userRole === 'admin' ? 'badge-admin' : 'badge-student'}`;
    }
  } else {
    navGuest?.classList.remove('hidden');
    navUser?.classList.add('hidden');
  }
}