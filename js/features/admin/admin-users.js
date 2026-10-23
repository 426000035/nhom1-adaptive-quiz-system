/* ==========================================================================
   Adaptive Quiz System - Admin Users Management Module (js/features/admin/admin-users.js)
   ========================================================================== */

function initAdminUsersModule() {
  bindAdminUsersEvents();
}

let classAssignmentUserId = null;
let classAssignmentDraftIds = new Set();

function bindAdminUsersEvents() {
  setupAdminUserTabs();
  bindListEvents(['search-admin-users', 'filter-role-admin-users', 'filter-class-admin-users', 'filter-status-admin-users', 'sort-admin-users', 'pagesize-admin-users'], 'adminUsers', renderAdminUsersTable);
  bindListEvents(['search-admin-classes', 'filter-status-admin-classes', 'sort-admin-classes', 'pagesize-admin-classes'], 'adminClasses', renderAdminUsersTable);

  const createStudentModal = document.getElementById('modal-create-student');
  document.getElementById('btn-open-admin-create-student')?.addEventListener('click', () => {
    const status = document.getElementById('admin-create-student-status');
    if (status) status.textContent = '';
    createStudentModal?.classList.remove('hidden');
  });
  ['btn-close-create-student', 'btn-cancel-create-student'].forEach(id => {
    document.getElementById(id)?.addEventListener('click', closeCreateStudentModal);
  });
  createStudentModal?.addEventListener('click', event => {
    if (event.target === createStudentModal) closeCreateStudentModal();
  });

  const createStudentForm = document.getElementById('form-admin-create-student');
  createStudentForm?.addEventListener('submit', async event => {
    event.preventDefault();
    const submitButton = document.getElementById('btn-admin-create-student');
    const status = document.getElementById('admin-create-student-status');
    const fullNameInput = document.getElementById('admin-new-student-name');
    const usernameInput = document.getElementById('admin-new-student-username');
    const passwordInput = document.getElementById('admin-new-student-password');
    submitButton.disabled = true;
    status.textContent = 'Đang tạo tài khoản học viên...';
    try {
      const user = window.Auth.createStudentAccount(
        fullNameInput.value,
        usernameInput.value,
        passwordInput.value
      );
      createStudentForm.reset();
      window.AppState.listsState.adminUsers.currentPage = 1;
      try {
        await renderAdminUsersTable();
      } catch (error) {
        closeCreateStudentModal();
        showAdminUserError('Đã tạo tài khoản nhưng không thể tải danh sách', error);
        return;
      }
      closeCreateStudentModal();
      if (typeof Swal !== 'undefined') {
        Swal.fire({ icon: 'success', title: 'Đã tạo tài khoản học viên', text: `Username: ${user.username}` });
      }
    } catch (error) {
      status.textContent = error.message;
      showAdminUserError('Không thể tạo tài khoản học viên', error);
    } finally {
      submitButton.disabled = false;
    }
  });

  document.getElementById('form-admin-add-class')?.addEventListener('submit', async event => {
    event.preventDefault();
    const input = document.getElementById('admin-new-class-name');
    const status = document.getElementById('admin-create-class-status');
    try {
      requireAdminForClassManagement();
      const name = input.value.trim();
      if (!name) throw new Error('Tên lớp không được để trống.');
      window.LocalStorageDB.update(database => {
        if (database.classes.some(classRecord =>
          classRecord.name.trim().toLocaleLowerCase('vi') === name.toLocaleLowerCase('vi')
        )) {
          throw new Error('Tên lớp này đã tồn tại.');
        }
        database.classes.push({
          classId: createAdminClassId(),
          name,
          status: 'active',
          createdAt: new Date().toISOString()
        });
      });
      window.AppState.listsState.adminClasses.currentPage = 1;
      input.value = '';
      if (status) status.textContent = `Đã tạo lớp ${name}.`;
      await renderAdminUsersTable();
    } catch (error) {
      if (status) status.textContent = error.message;
      showAdminUserError('Không thể thêm lớp', error);
    }
  });

  document.getElementById('admin-classes-tbody')?.addEventListener('click', handleAdminClassAction);
  document.getElementById('admin-users-tbody')?.addEventListener('click', async event => {
    const profileButton = event.target.closest('.btn-view-student-profile');
    if (profileButton) {
      try {
        if (window.Auth?.getCurrentUser()?.role !== 'admin') {
          throw new Error('Chỉ giáo viên mới có thể xem hồ sơ và thống kê học viên.');
        }
        await window.renderStudentDashboard({ viewingStudentId: profileButton.dataset.userId });
        showAdminStudentProfile();
        navigateTo('view-admin');
        window.requestAnimationFrame(() => window.scrollTo(0, 0));
      } catch (error) {
        showAdminUserError('Không thể xem hồ sơ học viên', error);
      }
      return;
    }
    const button = event.target.closest('.btn-manage-user-classes');
    if (button) openStudentClassModal(button.dataset.userId);
  });
  document.getElementById('user-classes-checkbox-list')?.addEventListener('change', event => {
    const checkbox = event.target.closest('.user-class-checkbox');
    if (!checkbox) return;
    if (checkbox.checked) classAssignmentDraftIds.add(checkbox.value);
    else classAssignmentDraftIds.delete(checkbox.value);
  });
  ['btn-close-user-classes', 'btn-cancel-user-classes'].forEach(id => {
    document.getElementById(id)?.addEventListener('click', closeStudentClassModal);
  });
  document.getElementById('btn-save-user-classes')?.addEventListener('click', saveStudentClassAssignments);

  document.getElementById('admin-users-tbody')?.addEventListener('click', async (event) => {
    const button = event.target.closest('.btn-toggle-role, .btn-toggle-status');
    if (!button) return;

    button.disabled = true;
    try {
      const userId = button.dataset.userId;
      const users = await window.Auth.getUsers();
      const user = users.find(item => item.userId === userId);
      if (!user) throw new Error('Không tìm thấy tài khoản cần cập nhật. Hãy tải lại danh sách.');

      const patch = button.classList.contains('btn-toggle-role')
        ? { role: user.role === 'admin' ? 'student' : 'admin' }
        : { status: user.status === 'locked' ? 'active' : 'locked' };
      await window.Auth.updateUser(userId, patch);
      await renderAdminUsersTable();

      if (typeof Swal !== 'undefined') {
        Swal.fire({
          icon: 'success',
          title: patch.role ? `Đã cập nhật role thành ${patch.role.toUpperCase()}` : `Đã ${patch.status === 'locked' ? 'khóa' : 'mở khóa'} tài khoản!`
        });
      }
    } catch (error) {
      if (typeof Swal !== 'undefined') Swal.fire({ icon: 'error', title: 'Không thể cập nhật tài khoản', text: error.message });
      else console.error('Không thể cập nhật tài khoản:', error);
    } finally {
      button.disabled = false;
    }
  });
}

function setupAdminUserTabs() {
  const tabList = document.getElementById('admin-user-tabs');
  if (!tabList) return;

  const tabs = Array.from(tabList.querySelectorAll('[role="tab"]'));
  const activateTab = (tab, focus = false) => {
    const panelId = tab.getAttribute('aria-controls');
    const activePanel = document.getElementById(panelId);
    if (!activePanel) return;

    tabs.forEach(candidate => {
      const selected = candidate === tab;
      candidate.setAttribute('aria-selected', String(selected));
      candidate.setAttribute('tabindex', selected ? '0' : '-1');
      candidate.classList.toggle('active', selected);
      const panel = document.getElementById(candidate.getAttribute('aria-controls'));
      if (panel) panel.hidden = !selected;
    });
    if (focus) tab.focus();
  };

  tabList.addEventListener('click', event => {
    const tab = event.target.closest('[role="tab"]');
    if (tab && tabs.includes(tab)) activateTab(tab);
  });
  tabList.addEventListener('keydown', event => {
    const currentTab = event.target.closest('[role="tab"]');
    if (!currentTab || !tabs.includes(currentTab)) return;
    const currentIndex = tabs.indexOf(currentTab);
    let nextIndex;
    if (event.key === 'ArrowRight') nextIndex = (currentIndex + 1) % tabs.length;
    else if (event.key === 'ArrowLeft') nextIndex = (currentIndex - 1 + tabs.length) % tabs.length;
    else if (event.key === 'Home') nextIndex = 0;
    else if (event.key === 'End') nextIndex = tabs.length - 1;
    else return;
    event.preventDefault();
    activateTab(tabs[nextIndex], true);
  });
  activateTab(tabs.find(tab => tab.getAttribute('aria-selected') === 'true') || tabs[0]);
}

function closeCreateStudentModal() {
  document.getElementById('modal-create-student')?.classList.add('hidden');
}

function createAdminClassId() {
  const uuid = window.crypto?.randomUUID?.();
  return `class_${uuid || `${Date.now()}_${Math.random().toString(36).slice(2)}`}`;
}

function requireAdminForClassManagement() {
  const currentUser = window.AppState.currentUser || window.Auth?.getCurrentUser();
  if (currentUser?.role !== 'admin') {
    throw new Error('Chỉ giáo viên mới có thể quản lý lớp học.');
  }
}

function showAdminUserError(title, error) {
  if (typeof Swal !== 'undefined') Swal.fire({ icon: 'error', title, text: error.message });
  else console.error(`${title}:`, error);
}

function handleAdminClassAction(event) {
  const button = event.target.closest('.btn-rename-class, .btn-toggle-class-status');
  if (!button) return;
  try {
    requireAdminForClassManagement();
  } catch (error) {
    showAdminUserError('Không thể quản lý lớp', error);
    return;
  }
  const classId = button.dataset.classId;
  const classRecord = window.LocalStorageDB.read().classes.find(item => item.classId === classId);
  if (!classRecord) {
    showAdminUserError('Không tìm thấy lớp', new Error('Hãy tải lại danh sách lớp.'));
    return;
  }

  if (button.classList.contains('btn-toggle-class-status')) {
    try {
      window.LocalStorageDB.update(database => {
        const record = database.classes.find(item => item.classId === classId);
        if (!record) throw new Error('Lớp đã bị xóa hoặc không còn tồn tại.');
        record.status = record.status === 'active' ? 'inactive' : 'active';
      });
      renderAdminUsersTable();
    } catch (error) {
      showAdminUserError('Không thể cập nhật trạng thái lớp', error);
    }
    return;
  }

  if (typeof Swal === 'undefined') return;
  Swal.fire({
    title: 'Đổi tên lớp',
    input: 'text',
    inputValue: classRecord.name,
    inputLabel: 'Tên lớp',
    showCancelButton: true,
    confirmButtonText: 'Lưu',
    cancelButtonText: 'Hủy',
    inputValidator: value => value.trim() ? undefined : 'Tên lớp không được để trống.'
  }).then(result => {
    if (!result.isConfirmed) return;
    try {
      window.LocalStorageDB.update(database => {
        const record = database.classes.find(item => item.classId === classId);
        if (!record) throw new Error('Lớp đã bị xóa hoặc không còn tồn tại.');
        record.name = result.value.trim();
      });
      renderAdminUsersTable();
    } catch (error) {
      showAdminUserError('Không thể đổi tên lớp', error);
    }
  });
}

function renderAdminClassesTable(database = window.LocalStorageDB.read()) {
  const tbody = document.getElementById('admin-classes-tbody');
  if (!tbody) return;
  tbody.replaceChildren();
  const state = window.AppState.listsState.adminClasses;
  state.searchText = document.getElementById('search-admin-classes')?.value || '';
  state.status = document.getElementById('filter-status-admin-classes')?.value || 'ALL';
  state.sort = document.getElementById('sort-admin-classes')?.value || 'DATE_DESC';
  state.pageSize = document.getElementById('pagesize-admin-classes')?.value || '10';
  const listView = processListRecords(database.classes, {
    searchText: state.searchText,
    searchableText: ['name'],
    filters: [record => state.status === 'ALL' || record.status === state.status],
    sortRecords: records => state.sort === 'TITLE_ASC' || state.sort === 'TITLE_DESC'
      ? records.map((record, index) => ({ record, index }))
        .sort((left, right) => (state.sort === 'TITLE_DESC' ? -1 : 1) *
          String(left.record.name || '').localeCompare(String(right.record.name || ''), 'vi') || left.index - right.index)
        .map(entry => entry.record)
      : sortListByDate(records, state.sort),
    currentPage: state.currentPage,
    pageSize: state.pageSize
  });
  state.currentPage = listView.currentPage;
  const classes = listView.records;
  if (classes.length === 0) {
    const row = document.createElement('tr');
    const cell = document.createElement('td');
    cell.colSpan = 4;
    cell.className = 'admin-empty-state';
    cell.textContent = database.classes.length
      ? 'Không tìm thấy lớp học phù hợp.'
      : 'Chưa có lớp học. Thêm lớp để phân học viên và lọc khi giao đề.';
    row.appendChild(cell);
    tbody.appendChild(row);
  } else classes.forEach(classRecord => {
    const row = document.createElement('tr');
    const nameCell = document.createElement('td');
    nameCell.textContent = classRecord.name;
    const countCell = document.createElement('td');
    countCell.textContent = String(database.users.filter(user =>
      user.role === 'student' && (user.classIds || []).includes(classRecord.classId)
    ).length);
    const statusCell = document.createElement('td');
    statusCell.textContent = classRecord.status === 'active' ? 'Đang hoạt động' : 'Đã ẩn';
    const actionsCell = document.createElement('td');
    actionsCell.className = 'admin-table-actions';
    actionsCell.className = 'admin-table-actions';
    const renameButton = document.createElement('button');
    renameButton.type = 'button';
    renameButton.className = 'btn btn-outline admin-action-button admin-action-button--spaced btn-rename-class';
    renameButton.dataset.classId = classRecord.classId;
    renameButton.textContent = 'Đổi tên';
    const statusButton = document.createElement('button');
    statusButton.type = 'button';
    statusButton.className = 'btn btn-outline admin-action-button btn-toggle-class-status';
    statusButton.dataset.classId = classRecord.classId;
    statusButton.textContent = classRecord.status === 'active' ? 'Ẩn lớp' : 'Hiện lớp';
    actionsCell.append(renameButton, statusButton);
    row.append(nameCell, countCell, statusCell, actionsCell);
    tbody.appendChild(row);
  });

  renderListPagination('pagination-admin-classes', listView, newPage => {
    state.currentPage = newPage;
    renderAdminUsersTable();
  }, 'lớp học');
}

function openStudentClassModal(userId) {
  try {
    requireAdminForClassManagement();
  } catch (error) {
    showAdminUserError('Không thể phân lớp', error);
    return;
  }
  const database = window.LocalStorageDB.read();
  const student = database.users.find(user => user.userId === userId && user.role === 'student');
  if (!student) {
    showAdminUserError('Không thể phân lớp', new Error('Không tìm thấy học viên cần cập nhật.'));
    return;
  }
  classAssignmentUserId = userId;
  classAssignmentDraftIds = new Set(student.classIds || []);
  const list = document.getElementById('user-classes-checkbox-list');
  const name = document.getElementById('user-classes-student-name');
  if (!list || !name) return;
  list.replaceChildren();
  name.textContent = student.fullName;

  const availableClasses = database.classes
    .filter(classRecord => classRecord.status === 'active' || classAssignmentDraftIds.has(classRecord.classId))
    .sort((left, right) => String(left.name).localeCompare(String(right.name), 'vi'));
  if (availableClasses.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'empty-state';
    empty.textContent = 'Chưa có lớp hoạt động. Hãy thêm lớp trước khi phân học viên.';
    list.appendChild(empty);
  }
  availableClasses.forEach(classRecord => {
    const label = document.createElement('label');
    label.className = 'admin-user-class-option';
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.className = 'user-class-checkbox';
    checkbox.value = classRecord.classId;
    checkbox.checked = classAssignmentDraftIds.has(classRecord.classId);
    checkbox.disabled = classRecord.status !== 'active' && !checkbox.checked;
    const text = document.createElement('span');
    text.textContent = classRecord.status === 'active' ? classRecord.name : `${classRecord.name} (đã ẩn)`;
    label.append(checkbox, text);
    list.appendChild(label);
  });
  document.getElementById('modal-user-classes')?.classList.remove('hidden');
}

function closeStudentClassModal() {
  document.getElementById('modal-user-classes')?.classList.add('hidden');
  classAssignmentUserId = null;
  classAssignmentDraftIds = new Set();
}

async function saveStudentClassAssignments() {
  if (!classAssignmentUserId) return;
  try {
    await window.Auth.updateUser(classAssignmentUserId, {
      classIds: Array.from(classAssignmentDraftIds)
    });
    closeStudentClassModal();
    await renderAdminUsersTable();
  } catch (error) {
    showAdminUserError('Không thể lưu lớp học viên', error);
  }
}

async function renderAdminUsersTable() {
  const tbody = document.getElementById('admin-users-tbody');
  if (!tbody) return;
  tbody.replaceChildren();

  let database;
  try {
    database = window.LocalStorageDB.read();
  } catch (error) {
    const row = document.createElement('tr');
    const cell = document.createElement('td');
    cell.colSpan = 6;
    cell.className = 'admin-empty-state';
    cell.textContent = `Không tải được tài khoản demo: ${error.message}`;
    row.appendChild(cell);
    tbody.appendChild(row);
    return;
  }
  const users = database.users.map(user => window.Auth.toPublicUser(user));
  renderAdminClassesTable(database);
  populateAdminUserClassFilter(database.classes);

  const st = window.AppState.listsState.adminUsers;
  st.searchText = document.getElementById('search-admin-users')?.value.trim().toLowerCase() || '';
  st.role = document.getElementById('filter-role-admin-users')?.value || 'ALL';
  st.classId = document.getElementById('filter-class-admin-users')?.value || 'ALL';
  st.status = document.getElementById('filter-status-admin-users')?.value || 'ALL';
  st.sort = document.getElementById('sort-admin-users')?.value || 'DATE_DESC';
  st.pageSize = document.getElementById('pagesize-admin-users')?.value || '10';

  const listView = processListRecords(users, {
    searchText: st.searchText,
    searchableText: ['userId', 'username', 'fullName', 'nickname'],
    filters: [
      user => st.role === 'ALL' || user.role === st.role,
      user => st.status === 'ALL' || user.status === st.status,
      user => {
        const userClassIds = user.classIds || [];
        return st.classId === 'ALL' ||
          (st.classId === 'NONE' ? userClassIds.length === 0 : userClassIds.includes(st.classId));
      }
    ],
    sortRecords: records => {
      if (st.sort === 'TITLE_ASC' || st.sort === 'TITLE_DESC') {
        const direction = st.sort === 'TITLE_ASC' ? 1 : -1;
        return records
          .map((record, index) => ({ record, index }))
          .sort((left, right) => direction * String(left.record.fullName || '').localeCompare(String(right.record.fullName || ''), 'vi') || left.index - right.index)
          .map(entry => entry.record);
      }
      return sortListByDate(records, st.sort);
    },
    currentPage: st.currentPage,
    pageSize: st.pageSize
  });
  st.currentPage = listView.currentPage;
  const pagedData = listView.records;

  if (pagedData.length === 0) {
    const row = document.createElement('tr');
    const cell = document.createElement('td');
    cell.colSpan = 6;
    cell.className = 'empty-state';
    cell.textContent = 'Không tìm thấy tài khoản nào phù hợp.';
    row.appendChild(cell);
    tbody.appendChild(row);
  } else {
    pagedData.forEach(user => {
      const row = document.createElement('tr');

      const usernameCell = document.createElement('td');
      usernameCell.textContent = user.username || '';

      const nameCell = document.createElement('td');
      if (user.nickname) {
        const nickname = document.createElement('strong');
        nickname.className = 'admin-user-display-name';
        nickname.textContent = user.nickname;
        const fullName = document.createElement('span');
        fullName.className = 'admin-user-legal-name';
        fullName.textContent = `(${user.fullName || ''})`;
        nameCell.append(nickname, fullName);
      } else {
        nameCell.textContent = user.fullName || '';
      }

      const roleCell = document.createElement('td');
      const roleBadge = document.createElement('span');
      roleBadge.className = `badge ${user.role === 'admin' ? 'badge-admin' : 'badge-student'}`;
      roleBadge.textContent = String(user.role || '').toUpperCase();
      roleCell.appendChild(roleBadge);

      const classCell = document.createElement('td');
      if (user.role === 'student') {
        const assignedClasses = (user.classIds || [])
          .map(classId => database.classes.find(item => item.classId === classId)?.name)
          .filter(Boolean);
        classCell.textContent = assignedClasses.length ? assignedClasses.join(', ') : 'Chưa xếp lớp';
      } else {
        classCell.textContent = '—';
      }

      const statusCell = document.createElement('td');
      const isLocked = user.status === 'locked';
      const statusLabel = document.createElement('span');
      statusLabel.className = `admin-user-status ${isLocked ? 'admin-user-status--locked' : 'admin-user-status--active'}`;
      statusLabel.textContent = isLocked ? 'Đã khóa' : 'Hoạt động';
      statusCell.appendChild(statusLabel);

      const actionsCell = document.createElement('td');
      actionsCell.className = 'admin-table-actions';
      actionsCell.className = 'admin-table-actions';
      const roleButton = document.createElement('button');
      roleButton.type = 'button';
      roleButton.className = 'btn btn-outline admin-action-button admin-action-button--spaced admin-action-button--ai btn-toggle-role';
      roleButton.dataset.userId = user.userId;
      roleButton.textContent = 'Đổi Role';

      const statusButton = document.createElement('button');
      statusButton.type = 'button';
      statusButton.className = `btn btn-outline admin-action-button ${isLocked ? 'admin-action-button--success' : 'admin-action-button--danger'} btn-toggle-status`;
      statusButton.dataset.userId = user.userId;
      statusButton.textContent = isLocked ? 'Mở Khóa' : 'Khóa';

      if (user.role === 'student') {
        const profileButton = document.createElement('button');
        profileButton.type = 'button';
        profileButton.className = 'btn btn-outline admin-action-button admin-action-button--spaced btn-view-student-profile';
        profileButton.dataset.userId = user.userId;
        profileButton.textContent = 'Hồ sơ & thống kê';
        const classButton = document.createElement('button');
        classButton.type = 'button';
        classButton.className = 'btn btn-outline admin-action-button admin-action-button--spaced btn-manage-user-classes';
        classButton.dataset.userId = user.userId;
        classButton.textContent = 'Phân lớp';
        actionsCell.append(profileButton, classButton);
      }
      actionsCell.append(roleButton, statusButton);
      row.append(usernameCell, nameCell, roleCell, classCell, statusCell, actionsCell);
      tbody.appendChild(row);
    });
  }

  renderListPagination('pagination-admin-users', listView, (newPage) => {
    st.currentPage = newPage;
    renderAdminUsersTable();
  }, 'tài khoản');

  if (typeof lucide !== 'undefined') lucide.createIcons();
}

function populateAdminUserClassFilter(classes) {
  const select = document.getElementById('filter-class-admin-users');
  if (!select) return;
  const selectedClassId = select.value || 'ALL';
  select.replaceChildren();
  const allOption = document.createElement('option');
  allOption.value = 'ALL';
  allOption.textContent = 'Tất cả lớp';
  select.appendChild(allOption);
  const unassignedOption = document.createElement('option');
  unassignedOption.value = 'NONE';
  unassignedOption.textContent = 'Chưa xếp lớp';
  select.appendChild(unassignedOption);
  classes
    .filter(classRecord => classRecord.status === 'active')
    .sort((left, right) => String(left.name).localeCompare(String(right.name), 'vi'))
    .forEach(classRecord => {
      const option = document.createElement('option');
      option.value = classRecord.classId;
      option.textContent = classRecord.name;
      select.appendChild(option);
    });
  select.value = selectedClassId === 'NONE' || classes.some(classRecord =>
    classRecord.status === 'active' && classRecord.classId === selectedClassId
  ) ? selectedClassId : 'ALL';
}
