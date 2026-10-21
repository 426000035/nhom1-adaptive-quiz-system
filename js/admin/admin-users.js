/* ==========================================================================
   Adaptive Quiz System - Admin Users Management Module (js/admin/admin-users.js)
   ========================================================================== */

function initAdminUsersModule() {
  bindAdminUsersEvents();
}

function bindAdminUsersEvents() {
  // Lọc & Phân trang Danh sách 4
  bindListEvents(['search-admin-users', 'filter-role-admin-users', 'sort-admin-users', 'pagesize-admin-users'], 'adminUsers', renderAdminUsersTable);

  // Đổi Role & Mở/Khóa Tài khoản
  document.getElementById('admin-users-tbody')?.addEventListener('click', (e) => {
    const btnRole = e.target.closest('.btn-toggle-role');
    const btnStatus = e.target.closest('.btn-toggle-status');
    let users = window.Auth ? window.Auth.getUsers() : JSON.parse(localStorage.getItem('app_users') || '[]');

    if (btnRole) {
      const u = users.find(x => x.username === btnRole.getAttribute('data-username'));
      if (u) {
        u.role = u.role === 'admin' ? 'student' : 'admin';
        localStorage.setItem('app_users', JSON.stringify(users));
        renderAdminUsersTable();
        Swal.fire({ icon: 'success', title: 'Đã cập nhật role thành ' + u.role.toUpperCase() });
      }
    }

    if (btnStatus) {
      const u = users.find(x => x.username === btnStatus.getAttribute('data-username'));
      if (u) {
        u.status = u.status === 'locked' ? 'active' : 'locked';
        localStorage.setItem('app_users', JSON.stringify(users));
        renderAdminUsersTable();
        Swal.fire({ icon: 'success', title: 'Đã ' + (u.status === 'locked' ? 'khóa' : 'mở khóa') + ' tài khoản!' });
      }
    }
  });
}

function renderAdminUsersTable() {
  const tbody = document.getElementById('admin-users-tbody');
  if (!tbody) return;
  tbody.innerHTML = '';

  const users = window.Auth ? window.Auth.getUsers() : JSON.parse(localStorage.getItem('app_users') || '[]');

  const st = window.AppState.listsState.adminUsers;
  st.searchText = document.getElementById('search-admin-users')?.value.trim().toLowerCase() || '';
  st.role = document.getElementById('filter-role-admin-users')?.value || 'ALL';
  st.sort = document.getElementById('sort-admin-users')?.value || 'TITLE_ASC';
  st.pageSize = document.getElementById('pagesize-admin-users')?.value || '10';

  let filtered = users.filter(u => {
    const textMatches = !st.searchText || u.username.toLowerCase().includes(st.searchText) || u.fullName.toLowerCase().includes(st.searchText);
    const roleMatches = (st.role === 'ALL') || (u.role === st.role);
    return textMatches && roleMatches;
  });

  if (st.sort === 'TITLE_ASC') filtered.sort((a, b) => a.fullName.localeCompare(b.fullName));
  else if (st.sort === 'TITLE_DESC') filtered.sort((a, b) => b.fullName.localeCompare(a.fullName));

  const totalItems = filtered.length;
  let pagedData = filtered;
  let totalPages = 1;

  if (st.pageSize !== 'ALL') {
    const sz = parseInt(st.pageSize) || 10;
    totalPages = Math.ceil(totalItems / sz) || 1;
    st.currentPage = Math.min(Math.max(1, st.currentPage), totalPages);
    pagedData = filtered.slice((st.currentPage - 1) * sz, (st.currentPage - 1) * sz + sz);
  }

  if (pagedData.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; padding: 1.5rem; color: var(--text-muted);">Không tìm thấy học viên nào phù hợp.</td></tr>`;
  } else {
    pagedData.forEach(u => {
      const tr = document.createElement('tr');
      tr.style.borderBottom = '1px solid var(--border-color)';
      const isLocked = u.status === 'locked';

      tr.innerHTML = `
        <td style="padding: 0.75rem; font-family: var(--font-family-mono); font-weight: 600;">${u.username}</td>
        <td style="padding: 0.75rem;">${u.fullName}</td>
        <td style="padding: 0.75rem;"><span class="badge ${u.role === 'admin' ? 'badge-admin' : 'badge-student'}">${u.role.toUpperCase()}</span></td>
        <td style="padding: 0.75rem;"><span style="color: ${isLocked ? 'var(--danger)' : 'var(--success)'}; font-weight: 600;">${isLocked ? 'Đã khóa' : 'Hoạt động'}</span></td>
        <td style="padding: 0.75rem; text-align: center; white-space: nowrap;">
          <button class="btn btn-outline btn-toggle-role" data-username="${u.username}" style="padding: 0.25rem 0.5rem; font-size: 0.8rem; margin-right: 0.35rem; color: var(--accent-ai);"><i data-lucide="shield"></i> Đổi Role</button>
          <button class="btn btn-outline btn-toggle-status" data-username="${u.username}" style="padding: 0.25rem 0.5rem; font-size: 0.8rem; color: ${isLocked ? 'var(--success)' : 'var(--danger)'};"><i data-lucide="${isLocked ? 'unlock' : 'lock'}"></i> ${isLocked ? 'Mở Khóa' : 'Khóa'}</button>
        </td>
      `;
      tbody.appendChild(tr);
    });
  }

  renderPaginationUI('pagination-admin-users', totalPages, st.currentPage, (newPage) => {
    st.currentPage = newPage;
    renderAdminUsersTable();
  });

  if (typeof lucide !== 'undefined') lucide.createIcons();
}