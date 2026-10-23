/* ==========================================================================
   Adaptive Quiz System - Shared UI Utilities (js/core/utils.js)
   ========================================================================== */

function bindListEvents(elementIds, listKey, callback) {
  elementIds.forEach((id, index) => {
    const element = document.getElementById(id);
    if (!element) return;

    const eventName = index === 0 ? 'input' : 'change';
    element.addEventListener(eventName, () => {
      window.AppState.listsState[listKey].currentPage = 1;
      callback();
    });
  });
  bindListResetControl(elementIds, listKey, callback);
}

function bindListResetControl(elementIds, listKey, callback) {
  const firstControl = document.getElementById(elementIds[0]);
  const filterGroup = firstControl?.closest?.('.admin-filter-bar, .catalog-filters, .history-filters');
  if (!filterGroup || filterGroup.dataset.listResetBound === 'true') return;
  filterGroup.dataset.listResetBound = 'true';

  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'btn btn-outline list-reset-button';
  button.textContent = 'Đặt lại';
  button.setAttribute('aria-label', 'Đặt lại tìm kiếm, bộ lọc và sắp xếp');
  button.title = 'Đặt lại tìm kiếm, bộ lọc và sắp xếp';
  filterGroup.appendChild(button);
  button.addEventListener('click', () => {
    elementIds.forEach(id => {
      const control = document.getElementById(id);
      if (!control) return;
      if (control.tagName === 'INPUT') {
        control.value = '';
        return;
      }
      const options = Array.from(control.options || []);
      const defaultOption = options.find(option => option.defaultSelected) || options[0];
      if (defaultOption) control.value = defaultOption.value;
    });
    const state = window.AppState?.listsState?.[listKey];
    if (state) state.currentPage = 1;
    callback();
  });
}

function getListItemTimestamp(item) {
  const dateFields = ['createdAt', 'completedAt', 'submittedAt', 'timestamp', 'startedAt'];
  for (const field of dateFields) {
    if (!item?.[field]) continue;
    const timestamp = Date.parse(item[field]);
    if (Number.isFinite(timestamp)) return timestamp;
  }
  return null;
}

function sortListByDate(records, sort = 'DATE_DESC') {
  const direction = sort === 'DATE_ASC' ? 1 : -1;
  return records
    .map((item, index) => ({ item, index, timestamp: getListItemTimestamp(item) }))
    .sort((left, right) => {
      if (left.timestamp === null || right.timestamp === null) {
        if (left.timestamp === right.timestamp) return left.index - right.index;
        return left.timestamp === null ? 1 : -1;
      }
      return (left.timestamp - right.timestamp) * direction || left.index - right.index;
    })
    .map(entry => entry.item);
}

function normalizeListSearchText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/gi, 'd')
    .toLocaleLowerCase('vi')
    .trim();
}

function processListRecords(records, {
  searchText = '',
  searchableText = () => [],
  filters = [],
  sortRecords = items => items,
  currentPage = 1,
  pageSize = 10
} = {}) {
  if (!Array.isArray(records)) throw new TypeError('Danh sách cần xử lý phải là một mảng.');
  const query = normalizeListSearchText(searchText);
  const searchableFields = Array.isArray(searchableText) ? searchableText : [searchableText];
  const matchingRecords = records.filter(record => {
    const matchesSearch = !query || searchableFields.some(getValue =>
      normalizeListSearchText(typeof getValue === 'function' ? getValue(record) : record?.[getValue]).includes(query)
    );
    return matchesSearch && filters.every(filter => filter(record));
  });
  const sortedRecords = sortRecords(matchingRecords.slice());
  const normalizedPageSize = pageSize === 'ALL' ? 'ALL' : Math.max(1, Number.parseInt(pageSize, 10) || 10);
  const totalRecords = sortedRecords.length;
  const totalPages = normalizedPageSize === 'ALL'
    ? 1
    : Math.max(1, Math.ceil(totalRecords / normalizedPageSize));
  const activePage = normalizedPageSize === 'ALL'
    ? 1
    : Math.min(Math.max(1, Number(currentPage) || 1), totalPages);
  const startIndex = normalizedPageSize === 'ALL' ? 0 : (activePage - 1) * normalizedPageSize;
  const endIndex = normalizedPageSize === 'ALL'
    ? totalRecords
    : Math.min(startIndex + normalizedPageSize, totalRecords);

  return {
    records: normalizedPageSize === 'ALL' ? sortedRecords : sortedRecords.slice(startIndex, endIndex),
    totalRecords,
    totalPages,
    currentPage: activePage,
    pageSize: normalizedPageSize,
    startIndex,
    endIndex
  };
}

function renderListPagination(containerId, listView, onPageChange, recordLabel = 'kết quả') {
  const container = document.getElementById(containerId);
  if (!container) return;
  let summary = container.previousElementSibling;
  if (!summary?.classList?.contains('list-result-summary')) {
    summary = document.createElement('p');
    summary.className = 'list-result-summary';
    summary.setAttribute('role', 'status');
    summary.setAttribute('aria-live', 'polite');
    container.parentNode.insertBefore(summary, container);
  }
  summary.textContent = listView.totalRecords === 0
    ? `Không có ${recordLabel} phù hợp.`
    : `Hiển thị ${listView.startIndex + 1}–${listView.endIndex} trên ${listView.totalRecords} ${recordLabel}.`;
  renderPaginationUI(containerId, listView.totalPages, listView.currentPage, onPageChange);
}

function clearListPagination(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;
  if (container.previousElementSibling?.classList?.contains('list-result-summary')) {
    container.previousElementSibling.remove();
  }
  renderPaginationUI(containerId, 1, 1, () => {});
}

function renderPaginationUI(containerId, totalPages, currentPage, onPageChange) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = '';

  if (totalPages <= 1) return;

  const createButton = (text, page, disabled = false, active = false, label = `Trang ${page}`) => {
    const button = document.createElement('button');
    button.className = `btn ${active ? 'btn-primary' : 'btn-outline'}`;
    button.classList.add('pagination-button');
    button.type = 'button';
    button.textContent = text;
    button.setAttribute('aria-label', label);
    if (active) button.setAttribute('aria-current', 'page');
    if (disabled) {
      button.disabled = true;
    } else {
      button.addEventListener('click', () => onPageChange(page));
    }
    return button;
  };

  container.appendChild(createButton('«', currentPage - 1, currentPage === 1, false, 'Trang trước'));

  let pages = [];
  if (totalPages <= 7) {
    pages = Array.from({ length: totalPages }, (_, index) => index + 1);
  } else if (currentPage <= 4) {
    pages = [1, 2, 3, 4, 5, '...', totalPages];
  } else if (currentPage >= totalPages - 3) {
    pages = [1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
  } else {
    pages = [1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages];
  }

  pages.forEach(page => {
    if (page === '...') {
      const dots = document.createElement('span');
      dots.className = 'pagination-ellipsis';
      dots.textContent = '...';
      container.appendChild(dots);
    } else {
      container.appendChild(createButton(page, page, false, page === currentPage));
    }
  });

  container.appendChild(createButton('»', currentPage + 1, currentPage === totalPages, false, 'Trang sau'));
}

async function loadComponent(containerId, filePath) {
  try {
    const response = await fetch(filePath);
    if (!response.ok) {
      throw new Error(`Không thể tải file: ${filePath} (Status: ${response.status})`);
    }

    const container = document.getElementById(containerId);
    if (!container) {
      console.warn(`Không tìm thấy thẻ container có ID: ${containerId}`);
      return;
    }

    container.innerHTML = await response.text();
  } catch (error) {
    console.error(`Lỗi khi nạp component [${filePath}]:`, error);
  }
}

async function initAllComponents() {
  await Promise.all([
    loadComponent('view-auth', 'views/auth/auth.html'),
    loadComponent('view-list', 'views/student/catalog.html'),
    loadComponent('view-quiz', 'views/student/quiz.html'),
    loadComponent('view-result', 'views/student/result.html'),
    loadComponent('view-admin', 'views/admin/dashboard.html'),
    loadComponent('modals-holder', 'views/shared/modals.html')
  ]);

  await Promise.all([
    loadComponent('holder-tab-quizzes', 'views/admin/tabs/tab-quizzes.html'),
    loadComponent('holder-tab-catalogs', 'views/admin/tabs/tab-catalogs.html'),
    loadComponent('holder-tab-bank', 'views/admin/tabs/tab-bank.html'),
    loadComponent('holder-tab-users', 'views/admin/tabs/tab-users.html'),
    loadComponent('holder-tab-reports', 'views/admin/tabs/tab-reports.html'),
    loadComponent('holder-tab-tools', 'views/admin/tabs/tab-tools.html')
  ]);

  if (typeof lucide !== 'undefined') lucide.createIcons();
}
