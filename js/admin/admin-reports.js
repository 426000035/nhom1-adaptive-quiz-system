/* ==========================================================================
   Adaptive Quiz System - Admin Reports Module (js/admin/admin-reports.js)
   ========================================================================== */

function initAdminReportsModule() {
  bindAdminReportsEvents();
}

function bindAdminReportsEvents() {
  // Lọc & Phân trang Danh sách 5
  bindListEvents(['search-admin-reports', 'sort-admin-reports', 'pagesize-admin-reports'], 'adminReports', renderAdminReports);
}

function renderAdminReports() {
  const historyTbody = document.getElementById('admin-history-tbody');
  const attemptsEl = document.getElementById('stat-total-attempts');
  const avgScoreEl = document.getElementById('stat-avg-score');

  const history = JSON.parse(localStorage.getItem('quiz_history_all') || '[]');

  if (attemptsEl) attemptsEl.textContent = history.length;
  if (history.length > 0) {
    const totalScore = history.reduce((sum, item) => sum + (item.score || 0), 0);
    if (avgScoreEl) avgScoreEl.textContent = (totalScore / history.length).toFixed(1);
  } else if (avgScoreEl) {
    avgScoreEl.textContent = "0.0";
  }

  if (!historyTbody) return;
  historyTbody.innerHTML = '';

  const st = window.AppState.listsState.adminReports;
  st.searchText = document.getElementById('search-admin-reports')?.value.trim().toLowerCase() || '';
  st.sort = document.getElementById('sort-admin-reports')?.value || 'TITLE_ASC';
  st.pageSize = document.getElementById('pagesize-admin-reports')?.value || '10';

  let filtered = history.filter(item => {
    return !st.searchText || 
           (item.username || '').toLowerCase().includes(st.searchText) || 
           (item.quizTitle || '').toLowerCase().includes(st.searchText);
  });

  if (st.sort === 'TITLE_ASC') filtered.sort((a, b) => (a.username || '').localeCompare(b.username || ''));
  else if (st.sort === 'TITLE_DESC') filtered.sort((a, b) => (b.username || '').localeCompare(a.username || ''));

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
    historyTbody.innerHTML = `<tr><td colspan="5" style="text-align: center; padding: 1.5rem; color: var(--text-muted);">Không có dữ liệu lượt nộp bài phù hợp.</td></tr>`;
  } else {
    pagedData.forEach(item => {
      const tr = document.createElement('tr');
      tr.style.borderBottom = '1px solid var(--border-color)';
      tr.innerHTML = `
        <td style="padding: 0.75rem; color: var(--text-muted); font-size: 0.8rem;">${item.timestamp || 'N/A'}</td>
        <td style="padding: 0.75rem; font-weight: 600;">${item.username || 'Học viên'}</td>
        <td style="padding: 0.75rem;">${item.quizTitle || 'Bài kiểm tra'}</td>
        <td style="padding: 0.75rem; font-weight: bold; color: ${item.score >= 8 ? 'var(--success)' : 'var(--danger)'};">${item.score} / 10</td>
        <td style="padding: 0.75rem;">${item.correctCount || 0} câu</td>
      `;
      historyTbody.appendChild(tr);
    });
  }

  renderPaginationUI('pagination-admin-reports', totalPages, st.currentPage, (newPage) => {
    st.currentPage = newPage;
    renderAdminReports();
  });
}