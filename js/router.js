/* ==========================================================================
   Adaptive Quiz System - SPA Router & Nav Module (js/router.js)
   ========================================================================== */

/**
 * SPA View Router - Điều hướng ẩn/hiện giữa các Màn hình (Views)
 * @param {string} viewId - ID của section view cần hiển thị (VD: 'view-list', 'view-admin')
 */
function navigateTo(viewId) {
  // Ẩn tất cả các section view
  document.querySelectorAll('.view-section').forEach(sec => {
    sec.classList.add('hidden');
  });

  // Hiển thị view mục tiêu
  const targetView = document.getElementById(viewId);
  if (targetView) {
    targetView.classList.remove('hidden');
  } else {
    // Fallback mặc định về màn hình danh sách bài thi
    const listView = document.getElementById('view-list');
    if (listView) listView.classList.remove('hidden');
  }
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

  if (user) {
    navGuest?.classList.add('hidden');
    navUser?.classList.remove('hidden');
    
    if (userFullname) {
      userFullname.textContent = user.fullName;
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