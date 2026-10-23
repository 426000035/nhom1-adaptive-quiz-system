/* Local subject, skill, and difficulty catalogs for the admin dashboard. */

function initAdminCatalogsModule() {
  setupAdminCatalogTabs();
  bindListEvents(
    ['search-admin-subjects', 'sort-admin-subjects', 'pagesize-admin-subjects'],
    'adminSubjects',
    renderAdminCatalogs
  );
  bindListEvents(
    ['search-admin-skills', 'sort-admin-skills', 'pagesize-admin-skills'],
    'adminSkills',
    renderAdminCatalogs
  );
  bindListEvents(
    ['search-admin-difficulties', 'sort-admin-difficulties', 'pagesize-admin-difficulties'],
    'adminDifficulties',
    renderAdminCatalogs
  );
  document.getElementById('btn-admin-add-subject')?.addEventListener('click', addSubject);
  document.getElementById('btn-admin-add-skill')?.addEventListener('click', addSkill);
  document.getElementById('btn-admin-add-difficulty')?.addEventListener('click', addDifficulty);
  document.getElementById('admin-subjects-tbody')?.addEventListener('click', handleSubjectAction);
  document.getElementById('admin-skills-tbody')?.addEventListener('click', handleSkillAction);
  document.getElementById('admin-difficulties-tbody')?.addEventListener('click', handleDifficultyAction);
  document.getElementById('q-form-topic')?.addEventListener('change', event => {
    populateSkillSelect(event.currentTarget.value);
  });
}

function getCatalogListView(records, { searchText, sort, pageSize, currentPage, searchableText }) {
  const listView = processListRecords(records, {
    searchText,
    searchableText: record => searchableText(record),
    sortRecords: items => {
      if (sort !== 'TITLE_ASC' && sort !== 'TITLE_DESC') return sortListByDate(items, sort);
      const direction = sort === 'TITLE_ASC' ? 1 : -1;
      return items
        .map((record, index) => ({ record, index }))
        .sort((left, right) => direction * String(left.record.name || '').localeCompare(String(right.record.name || ''), 'vi', { sensitivity: 'base' }) || left.index - right.index)
        .map(entry => entry.record);
    },
    currentPage,
    pageSize
  });
  return { records: listView.records, totalRecords: listView.totalRecords, totalPages: listView.totalPages, currentPage: listView.currentPage };
}

function setupAdminCatalogTabs() {
  const tabList = document.getElementById('admin-catalog-tabs');
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

function requireCatalogAdmin() {
  const user = window.AppState.currentUser || window.Auth?.getCurrentUser();
  if (!user || user.role !== 'admin') throw new Error('Chỉ giáo viên mới có thể quản lý danh mục.');
  return user;
}

function newCatalogId(prefix) {
  const uuid = window.crypto?.randomUUID?.();
  return `${prefix}_${uuid || `${Date.now()}_${Math.random().toString(36).slice(2)}`}`;
}

function readCatalogs({ requireAdmin = true } = {}) {
  if (requireAdmin) requireCatalogAdmin();
  const database = window.LocalStorageDB.read();
  return {
    subjects: database.subjects,
    skills: database.skills,
    difficulties: database.difficulties
  };
}

function syncCatalogSettings(subjects, difficulties) {
  if (!window.AppState.settings) return;
  const activeSubjects = subjects.filter(subject => subject.status === 'active');
  const activeDifficulties = difficulties
    .filter(difficulty => difficulty.status === 'active')
    .sort((a, b) => Number(a.rank) - Number(b.rank));
  window.AppState.settings.topics = activeSubjects.map(subject => subject.name);
  window.AppState.settings.difficulties = activeDifficulties.map(difficulty => difficulty.label);
  if (typeof saveAdminSettings === 'function') saveAdminSettings();
  else if (typeof updateFilterOptionsUI === 'function') updateFilterOptionsUI();
}

async function populateQuestionCatalogFields({
  subjectId = '',
  skillId = '',
  topic = '',
  difficultyId = '',
  difficulty = ''
} = {}) {
  const subjectSelect = document.getElementById('q-form-topic');
  if (!subjectSelect) return;

  const { subjects, skills, difficulties } = readCatalogs({
    requireAdmin: (window.AppState.currentUser || window.Auth?.getCurrentUser())?.role === 'admin'
  });
  const activeSubjects = subjects.filter(subject => subject.status === 'active');
  window.AdminCatalogCache = { subjects, skills, difficulties };
  subjectSelect.replaceChildren();
  activeSubjects.forEach(subject => {
    const option = document.createElement('option');
    option.value = subject.subjectId;
    option.textContent = subject.name;
    subjectSelect.appendChild(option);
  });

  const selectedSubject = activeSubjects.find(subject =>
    String(subject.subjectId) === String(subjectId) ||
    (!subjectId && topic && subject.name.trim().toLowerCase() === String(topic).trim().toLowerCase())
  );
  if (!selectedSubject && activeSubjects.length === 0) {
    throw new Error('Chưa có môn học đang hoạt động. Hãy thêm môn trong mục Môn Học & Kỹ Năng trước.');
  }
  subjectSelect.value = selectedSubject?.subjectId || activeSubjects[0].subjectId;
  populateSkillSelect(subjectSelect.value, skillId);
  await populateDifficultySelect(document.getElementById('q-form-difficulty'), difficultyId, difficulty);
}

window.AdminCatalogs = Object.freeze({
  getActiveCatalogs: async () => {
    const currentUser = window.AppState.currentUser || window.Auth?.getCurrentUser();
    const { subjects, skills, difficulties } = readCatalogs({ requireAdmin: currentUser?.role === 'admin' });
    const activeSubjectIds = new Set(subjects.filter(subject => subject.status === 'active').map(subject => String(subject.subjectId)));
    const activeSubjects = subjects.filter(subject => subject.status === 'active');
    const activeDifficulties = difficulties
      .filter(difficulty => difficulty.status === 'active')
      .sort((a, b) => Number(a.rank) - Number(b.rank));
    syncCatalogSettings(subjects, difficulties);
    return {
      subjects: activeSubjects,
      skills: skills.filter(skill => skill.status === 'active' && activeSubjectIds.has(String(skill.subjectId))),
      difficulties: activeDifficulties
    };
  },
  populateQuestionCatalogFields,
  populateDifficultySelect
});

async function populateDifficultySelect(select, selectedDifficultyId = '', fallbackLabel = '') {
  if (!select) throw new Error('Không tìm thấy trường chọn độ khó trong biểu mẫu.');
  const { difficulties } = await window.AdminCatalogs.getActiveCatalogs();
  select.replaceChildren();
  difficulties.forEach(difficulty => {
    const option = document.createElement('option');
    option.value = difficulty.difficultyId;
    option.textContent = difficulty.label;
    option.dataset.label = difficulty.label;
    option.dataset.rank = difficulty.rank;
    select.appendChild(option);
  });
  const selected = difficulties.find(item =>
    String(item.difficultyId) === String(selectedDifficultyId) ||
    (!selectedDifficultyId && item.label === fallbackLabel)
  );
  const defaultDifficulty = selected ||
    difficulties.find(item => item.label.toLowerCase() === 'medium') ||
    difficulties[0];
  if (defaultDifficulty) select.value = defaultDifficulty.difficultyId;
  if (difficulties.length === 0) throw new Error('Chưa có độ khó đang hoạt động trong database demo.');
}

function populateSkillSelect(subjectId, selectedSkillId = '') {
  const skillSelect = document.getElementById('q-form-skill');
  if (!skillSelect) return;
  skillSelect.replaceChildren();
  const activeSkills = (window.AdminCatalogCache?.skills || []).filter(skill =>
    skill.status === 'active' && String(skill.subjectId) === String(subjectId)
  );
  activeSkills.forEach(skill => {
    const option = document.createElement('option');
    option.value = skill.skillId;
    option.textContent = skill.name;
    skillSelect.appendChild(option);
  });
  skillSelect.value = activeSkills.some(skill => String(skill.skillId) === String(selectedSkillId))
    ? selectedSkillId
    : activeSkills[0]?.skillId || '';
  skillSelect.disabled = activeSkills.length === 0;
  if (activeSkills.length === 0) {
    const option = document.createElement('option');
    option.value = '';
    option.textContent = 'Môn học chưa có kỹ năng đang hoạt động';
    skillSelect.appendChild(option);
  }
}

function showCatalogError(error) {
  const status = document.getElementById('admin-catalogs-status');
  if (status) status.textContent = error.message;
  if (typeof Swal !== 'undefined') {
    Swal.fire({ icon: 'error', title: 'Không thể quản lý danh mục', text: error.message });
  } else {
    console.error('Không thể quản lý danh mục:', error);
  }
}

async function renderAdminCatalogs() {
  const status = document.getElementById('admin-catalogs-status');
  const subjectsBody = document.getElementById('admin-subjects-tbody');
  const skillsBody = document.getElementById('admin-skills-tbody');
  const difficultiesBody = document.getElementById('admin-difficulties-tbody');
  if (!subjectsBody || !skillsBody || !difficultiesBody) return;

  if (status) status.textContent = 'Đang tải danh mục từ database demo...';
  subjectsBody.replaceChildren();
  skillsBody.replaceChildren();
  difficultiesBody.replaceChildren();

  try {
    const { subjects, skills, difficulties } = readCatalogs();
    const subjectNames = new Map(subjects.map(subject => [String(subject.subjectId), String(subject.name)]));
    const subjectList = renderCatalogList(
      subjects,
      'adminSubjects',
      'subjects',
      subject => subject.name
    );
    const skillList = renderCatalogList(
      skills,
      'adminSkills',
      'skills',
      skill => `${skill.name} ${subjectNames.get(String(skill.subjectId)) || ''}`
    );
    const difficultyListState = window.AppState.listsState.adminDifficulties;
    difficultyListState.searchText = document.getElementById('search-admin-difficulties')?.value || '';
    difficultyListState.sort = document.getElementById('sort-admin-difficulties')?.value || 'RANK_ASC';
    difficultyListState.pageSize = document.getElementById('pagesize-admin-difficulties')?.value || '10';
    const difficultyList = processListRecords(difficulties, {
      searchText: difficultyListState.searchText,
      searchableText: ['label'],
      sortRecords: records => records
        .map((record, index) => ({ record, index }))
        .sort((left, right) => {
          const comparison = difficultyListState.sort === 'TITLE_ASC' || difficultyListState.sort === 'TITLE_DESC'
            ? String(left.record.label || '').localeCompare(String(right.record.label || ''), 'vi', { sensitivity: 'base' }) *
              (difficultyListState.sort === 'TITLE_DESC' ? -1 : 1)
            : (Number(left.record.rank) - Number(right.record.rank)) *
              (difficultyListState.sort === 'RANK_DESC' ? -1 : 1);
          return comparison || left.index - right.index;
        })
        .map(entry => entry.record),
      currentPage: difficultyListState.currentPage,
      pageSize: difficultyListState.pageSize
    });
    difficultyListState.currentPage = difficultyList.currentPage;
    const subjectListState = window.AppState.listsState.adminSubjects;
    const skillListState = window.AppState.listsState.adminSkills;
    subjectListState.currentPage = subjectList.currentPage;
    skillListState.currentPage = skillList.currentPage;

    subjectList.records.forEach(subject => {
      const row = document.createElement('tr');
      row.append(catalogCell(subject.name), catalogCell(subject.status === 'active' ? 'Đang dùng' : 'Đã ẩn'));
      const actions = document.createElement('td');
      actions.className = 'admin-catalog-actions';
      actions.append(
        actionButton('Sửa', 'edit-subject', subject.subjectId),
        actionButton(subject.status === 'active' ? 'Tạm ẩn' : 'Hiện lại', 'toggle-subject', subject.subjectId),
        actionButton('Xóa', 'delete-subject', subject.subjectId)
      );
      row.appendChild(actions);
      subjectsBody.appendChild(row);
    });

    skillList.records.forEach(skill => {
      const row = document.createElement('tr');
      row.append(
        catalogCell(skill.name),
        catalogCell(subjectNames.get(String(skill.subjectId)) || 'Không tìm thấy môn học'),
        catalogCell(skill.status === 'active' ? 'Đang dùng' : 'Đã ẩn')
      );
      const actions = document.createElement('td');
      actions.className = 'admin-catalog-actions';
      actions.append(
        actionButton('Sửa', 'edit-skill', skill.skillId),
        actionButton(skill.status === 'active' ? 'Tạm ẩn' : 'Hiện lại', 'toggle-skill', skill.skillId),
        actionButton('Xóa', 'delete-skill', skill.skillId)
      );
      row.appendChild(actions);
      skillsBody.appendChild(row);
    });

    difficultyList.records.forEach(difficulty => {
      const row = document.createElement('tr');
      row.append(
        catalogCell(difficulty.label),
        catalogCell(difficulty.rank),
        catalogCell(difficulty.status === 'active' ? 'Đang dùng' : 'Đã ẩn')
      );
      const actions = document.createElement('td');
      actions.className = 'admin-catalog-actions';
      actions.append(
        actionButton('Sửa', 'edit-difficulty', difficulty.difficultyId),
        actionButton(difficulty.status === 'active' ? 'Tạm ẩn' : 'Hiện lại', 'toggle-difficulty', difficulty.difficultyId),
        actionButton('Xóa', 'delete-difficulty', difficulty.difficultyId)
      );
      row.appendChild(actions);
      difficultiesBody.appendChild(row);
    });

    if (subjectList.records.length === 0) {
      appendEmptyRow(subjectsBody, 3, subjects.length === 0 ? 'Chưa có môn học.' : 'Không tìm thấy môn học phù hợp.');
    }
    if (skillList.records.length === 0) {
      appendEmptyRow(skillsBody, 4, skills.length === 0 ? 'Chưa có kỹ năng.' : 'Không tìm thấy kỹ năng phù hợp.');
    }
    if (difficultyList.records.length === 0) {
      appendEmptyRow(difficultiesBody, 4, difficulties.length === 0 ? 'Chưa có độ khó.' : 'Không tìm thấy mức độ khó phù hợp.');
    }
    updateCatalogListSummary('subjects', subjectList);
    updateCatalogListSummary('skills', skillList);
    renderPaginationUI('pagination-admin-subjects', subjectList.totalPages, subjectList.currentPage, newPage => {
      subjectListState.currentPage = newPage;
      renderAdminCatalogs();
    });
    renderPaginationUI('pagination-admin-skills', skillList.totalPages, skillList.currentPage, newPage => {
      skillListState.currentPage = newPage;
      renderAdminCatalogs();
    });
    renderListPagination('pagination-admin-difficulties', difficultyList, newPage => {
      difficultyListState.currentPage = newPage;
      renderAdminCatalogs();
    }, 'mức độ khó');
    if (status) status.textContent = '';
  } catch (error) {
    if (status) status.textContent = error.message;
    showCatalogError(error);
  }
}

function renderCatalogList(records, stateKey, controlPrefix, searchableText) {
  const state = window.AppState.listsState[stateKey];
  state.searchText = document.getElementById(`search-admin-${controlPrefix}`)?.value.trim() || '';
  state.sort = document.getElementById(`sort-admin-${controlPrefix}`)?.value || state.sort;
  state.pageSize = document.getElementById(`pagesize-admin-${controlPrefix}`)?.value || state.pageSize;

  return getCatalogListView(records, {
    ...state,
    searchableText
  });
}

function updateCatalogListSummary(listName, listView) {
  const count = document.getElementById(`count-admin-${listName}`);
  if (!count) return;
  const noun = listName === 'subjects' ? 'môn học' : 'kỹ năng';
  if (listView.totalRecords === 0) {
    count.textContent = `0 ${noun}`;
    return;
  }
  const pageSize = document.getElementById(`pagesize-admin-${listName}`)?.value || '10';
  const pageLength = pageSize === 'ALL' ? listView.totalRecords : parseInt(pageSize, 10) || 10;
  const start = (listView.currentPage - 1) * pageLength + 1;
  const end = Math.min(start + listView.records.length - 1, listView.totalRecords);
  count.textContent = `Hiển thị ${start}–${end} trong ${listView.totalRecords} ${noun}`;
}

async function promptDifficultyValues({ label = '', rank = 1, title = 'Thêm độ khó' } = {}) {
  return Swal.fire({
    title,
    html: `<input id="difficulty-label" class="swal2-input" placeholder="Nhãn độ khó" value="${escapeHtmlAttribute(label)}"><input id="difficulty-rank" class="swal2-input" type="number" min="1" step="1" placeholder="Rank" value="${Number(rank)}">`,
    focusConfirm: false,
    showCancelButton: true,
    preConfirm: () => {
      const nextLabel = document.getElementById('difficulty-label').value.trim();
      const nextRank = Number(document.getElementById('difficulty-rank').value);
      if (!nextLabel) {
        Swal.showValidationMessage('Vui lòng nhập nhãn độ khó.');
        return false;
      }
      if (!Number.isInteger(nextRank) || nextRank < 1) {
        Swal.showValidationMessage('Rank phải là số nguyên từ 1 trở lên.');
        return false;
      }
      return { label: nextLabel, rank: nextRank };
    }
  });
}

function confirmCatalogDeletion(title, itemName) {
  return Swal.fire({
    title,
    text: itemName,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText: 'Xóa',
    cancelButtonText: 'Hủy'
  });
}

async function addDifficulty() {
  try {
    requireCatalogAdmin();
    const result = await promptDifficultyValues();
    if (!result.isConfirmed) return;
    const { label, rank } = result.value;
    window.LocalStorageDB.update(database => {
      if (database.difficulties.some(item => item.label.trim().toLowerCase() === label.toLowerCase())) {
        throw new Error('Nhãn độ khó đã tồn tại.');
      }
      if (database.difficulties.some(item => Number(item.rank) === rank)) {
        throw new Error('Rank độ khó đã được sử dụng. Hãy chọn rank khác.');
      }
      database.difficulties.push({ difficultyId: newCatalogId('difficulty'), label, rank, status: 'active' });
    });
    await renderAdminCatalogs();
  } catch (error) {
    showCatalogError(error);
  }
}

async function handleDifficultyAction(event) {
  const button = event.target.closest('button[data-action]');
  if (!button) return;
  button.disabled = true;
  try {
    requireCatalogAdmin();
    const { difficulties } = readCatalogs();
    const difficulty = difficulties.find(item => item.difficultyId === button.dataset.id);
    if (!difficulty) throw new Error('Không tìm thấy độ khó. Hãy tải lại danh sách.');

    if (button.dataset.action === 'edit-difficulty') {
      const result = await promptDifficultyValues({ label: difficulty.label, rank: difficulty.rank, title: 'Sửa độ khó' });
      if (!result.isConfirmed) return;
      const { label, rank } = result.value;
      window.LocalStorageDB.update(database => {
        if (database.difficulties.some(item => item.difficultyId !== difficulty.difficultyId &&
            item.label.trim().toLowerCase() === label.toLowerCase())) {
          throw new Error('Nhãn độ khó đã tồn tại.');
        }
        if (database.difficulties.some(item => item.difficultyId !== difficulty.difficultyId && Number(item.rank) === rank)) {
          throw new Error('Rank độ khó đã được sử dụng. Hãy chọn rank khác.');
        }
        const target = database.difficulties.find(item => item.difficultyId === difficulty.difficultyId);
        target.label = label;
        target.rank = rank;
      });
      updateLocalDifficultyReferences(difficulty.difficultyId, difficulty.label, label, rank);
    } else if (button.dataset.action === 'toggle-difficulty') {
      const status = difficulty.status === 'active' ? 'inactive' : 'active';
      if (status === 'inactive' && difficulties.filter(item => item.status === 'active').length <= 1) {
        throw new Error('Không thể ẩn độ khó cuối cùng đang hoạt động.');
      }
      if (status === 'inactive' && isDifficultyReferenced(difficulty)) {
        throw new Error('Độ khó đang được câu hỏi hoặc đề thi sử dụng. Hãy giữ hoạt động để bảo toàn dữ liệu.');
      }
      updateCatalogRecord('difficulties', difficulty.difficultyId, { status });
    } else if (button.dataset.action === 'delete-difficulty') {
      if (isDifficultyReferenced(difficulty)) {
        throw new Error('Độ khó đang được câu hỏi hoặc đề thi sử dụng. Không thể xóa.');
      }
      if (difficulty.status === 'active' && difficulties.filter(item => item.status === 'active').length <= 1) {
        throw new Error('Không thể xóa độ khó cuối cùng đang hoạt động.');
      }
      const result = await confirmCatalogDeletion('Xóa độ khó?', difficulty.label);
      if (!result.isConfirmed) return;
      deleteCatalogRecord('difficulties', difficulty.difficultyId);
    }
    await renderAdminCatalogs();
  } catch (error) {
    showCatalogError(error);
  } finally {
    button.disabled = false;
  }
}

function isDifficultyReferenced(difficulty) {
  const database = window.LocalStorageDB.read();
  const localQuestions = [
    ...(window.AppState.allQuestions || []),
    ...(window.AppState.allQuizzes || []).flatMap(quiz => quiz.questions || [])
  ];
  return database.questions.some(question => question.difficultyId === difficulty.difficultyId) ||
    database.quizzes.some(quiz => quiz.difficultyId === difficulty.difficultyId) ||
    localQuestions.some(question =>
      question.difficultyId === difficulty.difficultyId || question.difficulty === difficulty.label
    ) ||
    (window.AppState.allQuizzes || []).some(quiz =>
      quiz.difficultyId === difficulty.difficultyId || quiz.difficulty === difficulty.label
    );
}

function updateLocalDifficultyReferences(difficultyId, oldLabel, label, rank) {
  const questions = [
    ...(window.AppState.allQuestions || []),
    ...(window.AppState.allQuizzes || []).flatMap(quiz => quiz.questions || [])
  ];
  questions.forEach(question => {
    if (question.difficultyId !== difficultyId && question.difficulty !== oldLabel) return;
    question.difficultyId = difficultyId;
    question.difficulty = label;
    question.difficultyRank = Number(rank);
  });
  (window.AppState.allQuizzes || []).forEach(quiz => {
    if (quiz.difficultyId !== difficultyId && quiz.difficulty !== oldLabel) return;
    quiz.difficultyId = difficultyId;
    quiz.difficulty = label;
    quiz.difficultyRank = Number(rank);
  });
  if (typeof saveQuizzesAndQuestionsToStorage === 'function') saveQuizzesAndQuestionsToStorage();
}

function catalogCell(value) {
  const cell = document.createElement('td');
  cell.className = 'admin-catalog-cell';
  cell.textContent = String(value || '');
  return cell;
}

function actionButton(label, action, id) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'btn btn-outline admin-action-button admin-action-button--compact';
  button.dataset.action = action;
  button.dataset.id = id;
  button.textContent = label;
  return button;
}

function appendEmptyRow(tbody, columns, message) {
  const row = document.createElement('tr');
  const cell = catalogCell(message);
  cell.colSpan = columns;
  cell.className = 'admin-empty-state';
  row.appendChild(cell);
  tbody.appendChild(row);
}

async function addSubject() {
  try {
    requireCatalogAdmin();
    const { value, isConfirmed } = await Swal.fire({
      title: 'Thêm môn học',
      input: 'text',
      inputLabel: 'Tên môn học',
      inputPlaceholder: 'Ví dụ: Toán học',
      showCancelButton: true,
      inputValidator: value => value.trim() ? undefined : 'Vui lòng nhập tên môn học.'
    });
    if (!isConfirmed) return;
    const name = value.trim();
    const admin = requireCatalogAdmin();
    window.LocalStorageDB.update(database => {
      if (database.subjects.some(subject => subject.name.trim().toLowerCase() === name.toLowerCase())) {
        throw new Error('Tên môn học này đã tồn tại.');
      }
      database.subjects.push({
        subjectId: newCatalogId('subject'),
        name,
        status: 'active',
        createdByUserId: admin.userId,
        createdAt: new Date().toISOString()
      });
    });
    await renderAdminCatalogs();
  } catch (error) {
    showCatalogError(error);
  }
}

async function addSkill() {
  try {
    requireCatalogAdmin();
    const { subjects } = readCatalogs();
    const activeSubjects = subjects.filter(subject => subject.status === 'active');
    if (activeSubjects.length === 0) throw new Error('Cần có ít nhất một môn học đang hoạt động trước khi thêm kỹ năng.');
    const { value, isConfirmed } = await Swal.fire({
      title: 'Thêm kỹ năng',
      html: `<input id="catalog-skill-name" class="swal2-input" placeholder="Tên kỹ năng"><select id="catalog-skill-subject" class="swal2-select">${activeSubjects.map(subject => `<option value="${escapeHtmlAttribute(subject.subjectId)}">${escapeHtml(subject.name)}</option>`).join('')}</select>`,
      focusConfirm: false,
      showCancelButton: true,
      preConfirm: () => ({
        name: document.getElementById('catalog-skill-name').value.trim(),
        subjectId: document.getElementById('catalog-skill-subject').value
      })
    });
    if (!isConfirmed) return;
    if (!value.name) throw new Error('Vui lòng nhập tên kỹ năng.');
    window.LocalStorageDB.update(database => {
      if (!database.subjects.some(subject => subject.subjectId === value.subjectId && subject.status === 'active')) {
        throw new Error('Môn học không còn hoạt động. Hãy tải lại danh mục.');
      }
      if (database.skills.some(skill => skill.subjectId === value.subjectId &&
          skill.name.trim().toLowerCase() === value.name.toLowerCase())) {
        throw new Error('Kỹ năng này đã tồn tại trong môn học đã chọn.');
      }
      database.skills.push({
        skillId: newCatalogId('skill'),
        subjectId: value.subjectId,
        name: value.name,
        status: 'active',
        createdAt: new Date().toISOString()
      });
    });
    await renderAdminCatalogs();
  } catch (error) {
    showCatalogError(error);
  }
}

async function handleSubjectAction(event) {
  const button = event.target.closest('button[data-action]');
  if (!button) return;
  button.disabled = true;
  try {
    requireCatalogAdmin();
    const { subjects, skills } = readCatalogs();
    const subject = subjects.find(item => item.subjectId === button.dataset.id);
    if (!subject) throw new Error('Không tìm thấy môn học. Hãy tải lại danh sách.');

    if (button.dataset.action === 'edit-subject') {
      const { value, isConfirmed } = await Swal.fire({
        title: 'Sửa tên môn học',
        input: 'text',
        inputValue: subject.name,
        showCancelButton: true,
        inputValidator: value => value.trim() ? undefined : 'Tên môn học không được để trống.'
      });
      if (!isConfirmed) return;
      const name = value.trim();
      window.LocalStorageDB.update(database => {
        if (database.subjects.some(item => item.subjectId !== subject.subjectId &&
            item.name.trim().toLowerCase() === name.toLowerCase())) {
          throw new Error('Tên môn học này đã tồn tại.');
        }
        database.subjects.find(item => item.subjectId === subject.subjectId).name = name;
      });
    } else if (button.dataset.action === 'toggle-subject') {
      const status = subject.status === 'active' ? 'inactive' : 'active';
      if (status === 'inactive' && skills.some(skill =>
        skill.subjectId === subject.subjectId && skill.status === 'active'
      )) {
        throw new Error('Ẩn các kỹ năng của môn này trước khi tạm ẩn môn học.');
      }
      updateCatalogRecord('subjects', subject.subjectId, { status });
    } else if (button.dataset.action === 'delete-subject') {
      const database = window.LocalStorageDB.read();
      const referencedQuiz = (window.AppState.allQuizzes || []).some(quiz =>
        quiz.subjectId === subject.subjectId || (!quiz.subjectId && quiz.topic === subject.name)
      );
      if (skills.some(skill => skill.subjectId === subject.subjectId) ||
          database.questions.some(question => question.subjectId === subject.subjectId) ||
          database.quizzes.some(quiz => quiz.subjectId === subject.subjectId) ||
          referencedQuiz) {
        throw new Error('Môn học đang được kỹ năng, câu hỏi hoặc đề thi tham chiếu. Hãy tạm ẩn thay vì xóa.');
      }
      const result = await confirmCatalogDeletion('Xóa môn học?', subject.name);
      if (!result.isConfirmed) return;
      deleteCatalogRecord('subjects', subject.subjectId);
    }
    await renderAdminCatalogs();
  } catch (error) {
    showCatalogError(error);
  } finally {
    button.disabled = false;
  }
}

async function handleSkillAction(event) {
  const button = event.target.closest('button[data-action]');
  if (!button) return;
  button.disabled = true;
  try {
    requireCatalogAdmin();
    const { subjects, skills } = readCatalogs();
    const skill = skills.find(item => item.skillId === button.dataset.id);
    if (!skill) throw new Error('Không tìm thấy kỹ năng. Hãy tải lại danh sách.');

    if (button.dataset.action === 'edit-skill') {
      const { value, isConfirmed } = await Swal.fire({
        title: 'Sửa tên kỹ năng',
        input: 'text',
        inputValue: skill.name,
        showCancelButton: true,
        inputValidator: value => value.trim() ? undefined : 'Tên kỹ năng không được để trống.'
      });
      if (!isConfirmed) return;
      const name = value.trim();
      window.LocalStorageDB.update(database => {
        if (database.skills.some(item => item.skillId !== skill.skillId &&
            item.subjectId === skill.subjectId && item.name.trim().toLowerCase() === name.toLowerCase())) {
          throw new Error('Kỹ năng này đã tồn tại trong môn học.');
        }
        database.skills.find(item => item.skillId === skill.skillId).name = name;
      });
    } else if (button.dataset.action === 'toggle-skill') {
      const parentSubject = subjects.find(item => item.subjectId === skill.subjectId);
      if (skill.status !== 'active' && parentSubject?.status !== 'active') {
        throw new Error('Không thể kích hoạt kỹ năng khi môn học đang bị ẩn.');
      }
      updateCatalogRecord('skills', skill.skillId, {
        status: skill.status === 'active' ? 'inactive' : 'active'
      });
    } else if (button.dataset.action === 'delete-skill') {
      const database = window.LocalStorageDB.read();
      const localQuestionReferences = [
        ...(window.AppState.allQuestions || []),
        ...(window.AppState.allQuizzes || []).flatMap(quiz => quiz.questions || [])
      ];
      if (database.questions.some(question => question.skillId === skill.skillId) ||
          localQuestionReferences.some(question => question.skillId === skill.skillId)) {
        throw new Error('Kỹ năng đang được câu hỏi tham chiếu. Hãy tạm ẩn thay vì xóa.');
      }
      const result = await confirmCatalogDeletion('Xóa kỹ năng?', skill.name);
      if (!result.isConfirmed) return;
      deleteCatalogRecord('skills', skill.skillId);
    }
    await renderAdminCatalogs();
  } catch (error) {
    showCatalogError(error);
  } finally {
    button.disabled = false;
  }
}

function updateCatalogRecord(collection, id, patch) {
  window.LocalStorageDB.update(database => {
    const record = database[collection].find(item => item[{
      subjects: 'subjectId',
      skills: 'skillId',
      difficulties: 'difficultyId'
    }[collection]] === id);
    if (!record) throw new Error('Không tìm thấy danh mục cần cập nhật. Hãy tải lại danh sách.');
    Object.assign(record, patch);
  });
}

function deleteCatalogRecord(collection, id) {
  const idField = { subjects: 'subjectId', skills: 'skillId', difficulties: 'difficultyId' }[collection];
  window.LocalStorageDB.update(database => {
    const index = database[collection].findIndex(item => item[idField] === id);
    if (index < 0) throw new Error('Không tìm thấy danh mục cần xóa. Hãy tải lại danh sách.');
    database[collection].splice(index, 1);
  });
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, character => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[character]);
}

function escapeHtmlAttribute(value) {
  return escapeHtml(value);
}
