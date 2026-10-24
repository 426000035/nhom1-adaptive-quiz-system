/* ==========================================================================
   Adaptive Quiz System - Admin Quizzes Management Module (js/features/admin/admin-quizzes.js)
   ========================================================================== */

function initAdminQuizzesModule() {
  bindAdminQuizzesEvents();
}

let quizAssignmentStudentIds = new Set();
let quizAssignmentDraftStudentIds = new Set();
let quizAssignmentStudents = [];
let quizAssignmentClasses = [];
let quizAssignmentSearchText = '';
let quizAssignmentStatusFilter = 'ALL';
let quizAssignmentClassFilter = 'ALL';
let quizAssignmentSort = 'DATE_DESC';
let quizAssignmentCurrentPage = 1;
let quizAssignmentPageSize = 10;

function getAssignedStudentIdsFromForm() {
  return Array.from(quizAssignmentStudentIds);
}

function setQuizDeadlineInput(value) {
  const input = document.getElementById('quiz-form-due-at');
  const hasDeadline = document.getElementById('quiz-form-has-deadline');
  if (!input || !hasDeadline) return;
  if (!value) {
    input.value = '';
    hasDeadline.checked = false;
    input.disabled = true;
    return;
  }
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) throw new Error('Hạn chót của đề thi không hợp lệ.');
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  input.value = localDate.toISOString().slice(0, 16);
  hasDeadline.checked = true;
  input.disabled = false;
}

function filterQuizAssignmentStudents(students, searchText = '', status = 'ALL', classId = 'ALL', sort = 'DATE_DESC') {
  return processListRecords(students, {
    searchText,
    searchableText: ['userId', 'fullName'],
    filters: [
      student => {
        const studentClassIds = student.classIds || [];
        return classId === 'ALL' ||
          (classId === 'NONE' ? studentClassIds.length === 0 : studentClassIds.includes(classId));
      },
      student => status === 'ALL' || student.status === status
    ],
    sortRecords: records => sort === 'TITLE_ASC' || sort === 'TITLE_DESC'
      ? records.map((record, index) => ({ record, index }))
        .sort((left, right) => (sort === 'TITLE_DESC' ? -1 : 1) *
          String(left.record.fullName || '').localeCompare(String(right.record.fullName || ''), 'vi') || left.index - right.index)
        .map(entry => entry.record)
      : sortListByDate(records, sort),
    pageSize: 'ALL'
  }).records;
}

function getSelectableFilteredQuizAssignmentStudents(students, searchText, status, classId, sort) {
  return filterQuizAssignmentStudents(students, searchText, status, classId, sort)
    .filter(student => student.status === 'active');
}

function getQuizAssignmentPage(students, page, pageSize) {
  const listView = processListRecords(students, {
    currentPage: page,
    pageSize
  });
  return {
    currentPage: listView.currentPage,
    totalPages: listView.totalPages,
    students: listView.records,
    totalRecords: listView.totalRecords,
    startIndex: listView.startIndex,
    endIndex: listView.endIndex
  };
}

function updateQuizAssignmentSelectionSummary() {
  const summary = document.getElementById('quiz-assignment-selection-summary');
  const selectedCount = document.getElementById('quiz-assignment-selected-count');
  const selectedCountValue = quizAssignmentDraftStudentIds.size;
  const assignedCount = quizAssignmentStudentIds.size;
  if (summary) summary.textContent = assignedCount ? `Đã chọn ${assignedCount} học sinh` : 'Chưa chọn học sinh';
  if (selectedCount) selectedCount.textContent = `Đang chọn ${selectedCountValue} học sinh`;
}

function updateQuizAssignmentFilteredSelectionCheckbox() {
  const checkbox = document.getElementById('chk-select-filtered-assignment-students');
  if (!checkbox) return;
  const filteredStudents = getSelectableFilteredQuizAssignmentStudents(
    quizAssignmentStudents,
    quizAssignmentSearchText,
    quizAssignmentStatusFilter,
    quizAssignmentClassFilter,
    quizAssignmentSort
  );
  checkbox.disabled = filteredStudents.length === 0;
  checkbox.checked = filteredStudents.length > 0 &&
    filteredStudents.every(student => quizAssignmentDraftStudentIds.has(student.userId));
}

function renderQuizAssignmentStudents() {
  const tbody = document.getElementById('quiz-assignment-students-tbody');
  if (!tbody) return;
  const filteredStudents = filterQuizAssignmentStudents(
    quizAssignmentStudents,
    quizAssignmentSearchText,
    quizAssignmentStatusFilter,
    quizAssignmentClassFilter,
    quizAssignmentSort
  );
  const page = getQuizAssignmentPage(
    filteredStudents,
    quizAssignmentCurrentPage,
    quizAssignmentPageSize
  );
  quizAssignmentCurrentPage = page.currentPage;
  tbody.replaceChildren();

  if (page.students.length === 0) {
    const row = document.createElement('tr');
    const cell = document.createElement('td');
    cell.colSpan = 4;
    cell.className = 'empty-state';
    cell.textContent = 'Không tìm thấy học sinh phù hợp.';
    row.appendChild(cell);
    tbody.appendChild(row);
  } else {
    page.students.forEach(student => {
      const row = document.createElement('tr');
      const checkboxCell = document.createElement('td');
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.className = 'quiz-assignment-student-checkbox';
      checkbox.value = student.userId;
      checkbox.checked = quizAssignmentDraftStudentIds.has(student.userId);
      checkbox.disabled = student.status !== 'active' && !quizAssignmentStudentIds.has(student.userId);
      checkbox.setAttribute('aria-label', `Giao đề cho ${student.fullName}`);
      if (checkbox.disabled) checkbox.title = 'Chỉ học sinh đang hoạt động mới có thể được giao đề mới.';
      checkboxCell.appendChild(checkbox);

      const nameCell = document.createElement('td');
      nameCell.textContent = student.fullName;
      const classesCell = document.createElement('td');
      classesCell.textContent = (student.classIds || [])
        .map(classId => quizAssignmentClasses.find(item => item.classId === classId)?.name)
        .filter(Boolean)
        .join(', ') || 'Chưa xếp lớp';
      const statusCell = document.createElement('td');
      statusCell.textContent = student.status === 'active'
        ? 'Đang hoạt động'
        : student.status === 'inactive' ? 'Tạm ngưng' : 'Đã khóa';
      row.append(checkboxCell, nameCell, classesCell, statusCell);
      tbody.appendChild(row);
    });
  }

  renderListPagination(
    'pagination-quiz-assignment-students',
    {
      totalPages: page.totalPages,
      currentPage: page.currentPage,
      totalRecords: page.totalRecords,
      startIndex: page.startIndex,
      endIndex: page.endIndex
    },
    newPage => {
      quizAssignmentCurrentPage = newPage;
      renderQuizAssignmentStudents();
    },
    'học sinh'
  );
  updateQuizAssignmentFilteredSelectionCheckbox();
  updateQuizAssignmentSelectionSummary();
}

function openQuizAssignmentModal() {
  const database = window.LocalStorageDB.read();
  quizAssignmentStudents = database.users.filter(user => user.role === 'student');
  quizAssignmentClasses = database.classes;
  quizAssignmentDraftStudentIds = new Set(quizAssignmentStudentIds);
  quizAssignmentSearchText = '';
  quizAssignmentStatusFilter = 'ALL';
  quizAssignmentClassFilter = 'ALL';
  quizAssignmentSort = 'DATE_DESC';
  quizAssignmentCurrentPage = 1;
  const search = document.getElementById('search-quiz-assignment-students');
  const status = document.getElementById('filter-quiz-assignment-status');
  const classFilter = document.getElementById('filter-quiz-assignment-class');
  const sortSelect = document.getElementById('sort-quiz-assignment-students');
  const pageSize = document.getElementById('pagesize-quiz-assignment-students');
  if (search) search.value = '';
  if (status) status.value = 'ALL';
  if (sortSelect) sortSelect.value = quizAssignmentSort;
  if (classFilter) {
    classFilter.replaceChildren();
    const allOption = document.createElement('option');
    allOption.value = 'ALL';
    allOption.textContent = 'Tất cả lớp';
    classFilter.appendChild(allOption);
    const unassignedOption = document.createElement('option');
    unassignedOption.value = 'NONE';
    unassignedOption.textContent = 'Chưa xếp lớp';
    classFilter.appendChild(unassignedOption);
    quizAssignmentClasses
      .filter(item => item.status === 'active')
      .slice()
      .sort((left, right) => String(left.name).localeCompare(String(right.name), 'vi'))
      .forEach(classRecord => {
        const option = document.createElement('option');
        option.value = classRecord.classId;
        option.textContent = classRecord.name;
        classFilter.appendChild(option);
      });
    classFilter.value = 'ALL';
  }
  if (pageSize) {
    pageSize.value = '10';
    quizAssignmentPageSize = 10;
  }
  bindListResetControl(
    [
      'search-quiz-assignment-students',
      'filter-quiz-assignment-status',
      'filter-quiz-assignment-class',
      'sort-quiz-assignment-students',
      'pagesize-quiz-assignment-students'
    ],
    'quizAssignmentStudents',
    () => {
      quizAssignmentSearchText = search?.value || '';
      quizAssignmentStatusFilter = status?.value || 'ALL';
      quizAssignmentClassFilter = classFilter?.value || 'ALL';
      quizAssignmentSort = sortSelect?.value || 'DATE_DESC';
      quizAssignmentPageSize = pageSize?.value === 'ALL' ? 'ALL' : Number(pageSize?.value) || 10;
      quizAssignmentCurrentPage = 1;
      renderQuizAssignmentStudents();
    }
  );
  renderQuizAssignmentStudents();
  document.getElementById('modal-quiz-assignment')?.classList.remove('hidden');
}

function populateQuizPolicyFields(quiz = null) {
  const unlimitedAttempts = document.getElementById('quiz-form-unlimited-attempts');
  const maxAttempts = document.getElementById('quiz-form-max-attempts-input');
  const scorePolicy = document.getElementById('quiz-form-score-policy');
  if (!unlimitedAttempts || !maxAttempts || !scorePolicy) return;
  const attemptLimit = quiz?.maxAttempts ?? null;
  unlimitedAttempts.checked = attemptLimit === null;
  maxAttempts.disabled = unlimitedAttempts.checked;
  maxAttempts.value = attemptLimit === null ? '1' : String(attemptLimit);
  scorePolicy.value = quiz?.scorePolicy || 'highest';
  setQuizDeadlineInput(quiz?.dueAt ?? null);
}

async function openQuizEditModal(quiz, title = 'Chỉnh Sửa Thông Tin Bài Thi') {
  if (!quiz) return false;

  try {
    await populateQuizModalSelects(quiz.subjectId, quiz.topic);
    document.getElementById('quiz-form-id').value = quiz.id;
    document.getElementById('quiz-form-title-input').value = quiz.title;
    document.getElementById('quiz-form-time-input').value = quiz.timeLimit;
    quizAssignmentStudentIds = new Set(quiz.assignedStudentIds || []);
    quizAssignmentDraftStudentIds = new Set(quizAssignmentStudentIds);
    updateQuizAssignmentSelectionSummary();
    populateQuizPolicyFields(quiz);
    document.getElementById('modal-quiz-title').textContent = title;
    document.getElementById('modal-quiz-form')?.classList.remove('hidden');
    return true;
  } catch (error) {
    Swal.fire({ icon: 'error', title: 'Không thể sửa đề thi', text: error.message });
    return false;
  }
}

function bindAdminQuizzesEvents() {
  // Lọc & Phân trang Danh sách 2 (Bảng Bài thi)
  bindListEvents(['search-admin-quizzes', 'filter-topic-admin-quizzes', 'filter-difficulty-admin-quizzes', 'sort-admin-quizzes', 'pagesize-admin-quizzes'], 'adminQuizzes', renderAdminQuizzesTable);

  // Lọc & Phân trang Danh sách 6 (Câu hỏi trong Modal)
  bindListEvents(['search-quiz-questions', 'sort-quiz-questions', 'pagesize-quiz-questions'], 'quizQuestions', () => {
    renderSelectedQuizQuestions(window.AppState.selectedQuizIdForAdmin);
  });

  // Modal Đề thi: Tạo mới / Hủy / Submit
  document.getElementById('btn-admin-create-quiz')?.addEventListener('click', async () => {
    document.getElementById('form-manage-quiz')?.reset();
    document.getElementById('quiz-form-id').value = '';
    quizAssignmentStudentIds = new Set();
    quizAssignmentDraftStudentIds = new Set();
    updateQuizAssignmentSelectionSummary();
    document.getElementById('modal-quiz-title').textContent = 'Tạo Bài Thi Mới';
    try {
      await populateQuizModalSelects();
      populateQuizPolicyFields();
      document.getElementById('modal-quiz-form')?.classList.remove('hidden');
    } catch (error) {
      Swal.fire({ icon: 'error', title: 'Không thể tạo đề thi', text: error.message });
    }
  });

  document.getElementById('btn-cancel-quiz-form')?.addEventListener('click', () => {
    document.getElementById('modal-quiz-form')?.classList.add('hidden');
  });

  document.getElementById('btn-open-quiz-assignment')?.addEventListener('click', () => {
    try {
      openQuizAssignmentModal();
    } catch (error) {
      Swal.fire({ icon: 'error', title: 'Không thể tải danh sách học sinh', text: error.message });
    }
  });
  document.getElementById('btn-close-quiz-assignment')?.addEventListener('click', () => {
    document.getElementById('modal-quiz-assignment')?.classList.add('hidden');
  });
  document.getElementById('btn-cancel-quiz-assignment')?.addEventListener('click', () => {
    document.getElementById('modal-quiz-assignment')?.classList.add('hidden');
  });
  document.getElementById('chk-select-filtered-assignment-students')?.addEventListener('change', event => {
    const filteredStudents = getSelectableFilteredQuizAssignmentStudents(
      quizAssignmentStudents,
      quizAssignmentSearchText,
      quizAssignmentStatusFilter,
      quizAssignmentClassFilter,
      quizAssignmentSort
    );
    filteredStudents.forEach(student => {
      if (event.currentTarget.checked) quizAssignmentDraftStudentIds.add(student.userId);
      else quizAssignmentDraftStudentIds.delete(student.userId);
    });
    renderQuizAssignmentStudents();
  });
  document.getElementById('btn-confirm-quiz-assignment')?.addEventListener('click', () => {
    quizAssignmentStudentIds = new Set(quizAssignmentDraftStudentIds);
    updateQuizAssignmentSelectionSummary();
    document.getElementById('modal-quiz-assignment')?.classList.add('hidden');
  });
  document.getElementById('quiz-assignment-students-tbody')?.addEventListener('change', event => {
    const checkbox = event.target.closest('.quiz-assignment-student-checkbox');
    if (!checkbox) return;
    if (checkbox.checked) quizAssignmentDraftStudentIds.add(checkbox.value);
    else quizAssignmentDraftStudentIds.delete(checkbox.value);
    updateQuizAssignmentFilteredSelectionCheckbox();
    updateQuizAssignmentSelectionSummary();
  });
  document.getElementById('search-quiz-assignment-students')?.addEventListener('input', event => {
    quizAssignmentSearchText = event.currentTarget.value;
    quizAssignmentCurrentPage = 1;
    renderQuizAssignmentStudents();
  });
  document.getElementById('filter-quiz-assignment-status')?.addEventListener('change', event => {
    quizAssignmentStatusFilter = event.currentTarget.value;
    quizAssignmentCurrentPage = 1;
    renderQuizAssignmentStudents();
  });
  document.getElementById('filter-quiz-assignment-class')?.addEventListener('change', event => {
    quizAssignmentClassFilter = event.currentTarget.value;
    quizAssignmentCurrentPage = 1;
    renderQuizAssignmentStudents();
  });
  document.getElementById('sort-quiz-assignment-students')?.addEventListener('change', event => {
    quizAssignmentSort = event.currentTarget.value;
    quizAssignmentCurrentPage = 1;
    renderQuizAssignmentStudents();
  });
  document.getElementById('pagesize-quiz-assignment-students')?.addEventListener('change', event => {
    quizAssignmentPageSize = event.currentTarget.value === 'ALL'
      ? 'ALL'
      : Number(event.currentTarget.value);
    quizAssignmentCurrentPage = 1;
    renderQuizAssignmentStudents();
  });

  document.getElementById('quiz-form-unlimited-attempts')?.addEventListener('change', event => {
    const input = document.getElementById('quiz-form-max-attempts-input');
    if (!input) return;
    input.disabled = event.currentTarget.checked;
    if (!event.currentTarget.checked && !input.value) input.value = '1';
  });

  document.getElementById('quiz-form-has-deadline')?.addEventListener('change', event => {
    const input = document.getElementById('quiz-form-due-at');
    if (!input) return;
    input.disabled = !event.currentTarget.checked;
    if (!event.currentTarget.checked) input.value = '';
  });

  document.getElementById('form-manage-quiz')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const qId = document.getElementById('quiz-form-id').value;
    const title = document.getElementById('quiz-form-title-input').value;
    const subjectId = document.getElementById('quiz-form-topic-select').value;
    let catalogs;
    try {
      catalogs = await window.AdminCatalogs.getActiveCatalogs();
    } catch (error) {
      Swal.fire({ icon: 'error', title: 'Không thể tải danh mục', text: error.message });
      return;
    }
    const subject = catalogs.subjects.find(item => String(item.subjectId) === String(subjectId));
    if (!subject) {
      Swal.fire({ icon: 'error', title: 'Không thể lưu đề', text: 'Hãy chọn một môn học đang hoạt động.' });
      return;
    }
    const timeLimit = parseInt(document.getElementById('quiz-form-time-input').value);
    const unlimitedAttempts = document.getElementById('quiz-form-unlimited-attempts').checked;
    const maxAttemptsValue = document.getElementById('quiz-form-max-attempts-input').value;
    const maxAttempts = unlimitedAttempts ? null : Number(maxAttemptsValue);
    if (maxAttempts !== null && (!Number.isInteger(maxAttempts) || maxAttempts < 1)) {
      Swal.fire({ icon: 'error', title: 'Số lượt làm không hợp lệ', text: 'Nhập số nguyên dương hoặc chọn không giới hạn.' });
      return;
    }
    const hasDeadline = document.getElementById('quiz-form-has-deadline').checked;
    const dueAtInput = document.getElementById('quiz-form-due-at').value;
    if (hasDeadline && !dueAtInput) {
      Swal.fire({ icon: 'error', title: 'Thiếu hạn chót', text: 'Hãy chọn ngày và giờ hạn chót hoặc bỏ chọn Có hạn chót.' });
      return;
    }
    const dueAtDate = hasDeadline ? new Date(dueAtInput) : null;
    if (dueAtDate && !Number.isFinite(dueAtDate.getTime())) {
      Swal.fire({ icon: 'error', title: 'Hạn chót không hợp lệ', text: 'Hãy nhập ngày và giờ hạn chót hợp lệ.' });
      return;
    }
    const dueAt = dueAtDate ? dueAtDate.toISOString() : null;
    const assignedStudentIds = getAssignedStudentIdsFromForm();
    const scorePolicy = document.getElementById('quiz-form-score-policy').value;

    if (qId) {
      const quiz = window.AppState.allQuizzes.find(q => q.id === qId);
      if (quiz) {
        const hasDifferentSubjectQuestion = (quiz.questions || []).some(question =>
          question.subjectId
            ? String(question.subjectId) !== String(subject.subjectId)
            : question.topic && question.topic !== subject.name
        );
        if (hasDifferentSubjectQuestion) {
          Swal.fire({ icon: 'error', title: 'Không thể đổi môn học', text: 'Một số câu hỏi trong đề thuộc môn học khác.' });
          return;
        }
        quiz.title = title;
        quiz.topic = subject.name;
        quiz.subjectId = subject.subjectId;
        quiz.timeLimit = timeLimit;
        quiz.assignedStudentIds = assignedStudentIds;
        quiz.maxAttempts = maxAttempts;
        quiz.scorePolicy = scorePolicy;
        quiz.dueAt = dueAt;
      }
    } else {
      window.AppState.allQuizzes.unshift({
        id: `quiz_${Date.now()}`,
        title,
        topic: subject.name,
        subjectId: subject.subjectId,
        timeLimit,
        assignedStudentIds,
        maxAttempts,
        scorePolicy,
        dueAt,
        createdAt: new Date().toISOString(),
        questions: []
      });
    }

    saveQuizzesAndQuestionsToStorage();
    document.getElementById('modal-quiz-form')?.classList.add('hidden');
    renderAdminQuizzesTable();
    Swal.fire({ icon: 'success', title: 'Thành công', text: qId ? 'Đã cập nhật bài thi!' : 'Đã tạo bài thi mới!' });
  });

  // Bảng Bài thi Actions (Quản lý câu hỏi / Sửa / Xóa)
  document.getElementById('admin-quizzes-tbody')?.addEventListener('click', (e) => {
    const btnManage = e.target.closest('.btn-manage-quiz-qs');
    const btnEdit = e.target.closest('.btn-edit-quiz-info');
    const btnDelete = e.target.closest('.btn-delete-quiz');

    if (btnManage) renderSelectedQuizQuestions(btnManage.getAttribute('data-id'));

    if (btnEdit) {
      const quiz = window.AppState.allQuizzes.find(q => q.id === btnEdit.getAttribute('data-id'));
      if (quiz) openQuizEditModal(quiz);
    }

    if (btnDelete) {
      const quizId = btnDelete.getAttribute('data-id');
      Swal.fire({
        title: 'Xác nhận xóa bài thi?',
        text: 'Thao tác này sẽ xóa bài thi khỏi hệ thống!',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Xóa',
        cancelButtonText: 'Hủy'
      }).then((res) => {
        if (res.isConfirmed) {
          window.AppState.allQuizzes = window.AppState.allQuizzes.filter(q => q.id !== quizId);
          saveQuizzesAndQuestionsToStorage();
          renderAdminQuizzesTable();
          Swal.fire({ icon: 'success', title: 'Đã xóa bài thi!' });
        }
      });
    }
  });

  // Modal Câu hỏi trong Bài thi Actions
  document.getElementById('btn-close-questions-modal')?.addEventListener('click', () => {
    document.getElementById('modal-manage-questions')?.classList.add('hidden');
  });

  document.getElementById('btn-admin-add-q-to-quiz')?.addEventListener('click', async () => {
    if (!window.AppState.selectedQuizIdForAdmin) return;
    document.getElementById('form-manage-question')?.reset();
    if (typeof setQuestionFormValues === 'function') setQuestionFormValues();
    document.getElementById('q-form-id').value = '';
    document.getElementById('modal-question-title').textContent = 'Thêm Câu Hỏi Mới Vào Bài Thi';
    const quiz = window.AppState.allQuizzes.find(item => item.id === window.AppState.selectedQuizIdForAdmin);
    try {
      await window.AdminCatalogs.populateQuestionCatalogFields({
        subjectId: quiz?.subjectId,
        topic: quiz?.topic,
        difficultyId: quiz?.difficultyId,
        difficulty: quiz?.difficulty
      });
      const catalogs = await window.AdminCatalogs.getActiveCatalogs();
      const quizSubject = catalogs.subjects.find(subject =>
        String(subject.subjectId) === String(quiz?.subjectId) ||
        (!quiz?.subjectId && subject.name === quiz?.topic)
      );
      if (quiz && (!quizSubject || String(document.getElementById('q-form-topic').value) !== String(quizSubject.subjectId))) {
        throw new Error('Đề thi liên kết với môn đang ẩn hoặc không còn tồn tại; không thể thêm câu hỏi.');
      }
      document.getElementById('q-form-topic').disabled = Boolean(quiz);
      openQuestionFormModal();
    } catch (error) {
      Swal.fire({ icon: 'error', title: 'Không thể thêm câu hỏi', text: error.message });
    }
  });

  document.getElementById('btn-cancel-q-form')?.addEventListener('click', () => {
    closeQuestionModal();
  });

  document.getElementById('admin-quiz-questions-tbody')?.addEventListener('click', (e) => {
    const btnEdit = e.target.closest('.btn-edit-q-in-quiz');
    const btnRemove = e.target.closest('.btn-remove-q-from-quiz');
    const activeQuizId = window.AppState.selectedQuizIdForAdmin;
    const quiz = window.AppState.allQuizzes.find(q => q.id === activeQuizId);
    if (!quiz) return;

    if (btnEdit) {
      const q = quiz.questions.find(item => item.id === btnEdit.getAttribute('data-qid'));
      if (q) {
        (async () => {
          try {
            await window.AdminCatalogs.populateQuestionCatalogFields({
              subjectId: q.subjectId || quiz.subjectId,
              skillId: q.skillId,
              topic: q.topic || quiz.topic,
              difficultyId: q.difficultyId || quiz.difficultyId,
              difficulty: q.difficulty || quiz.difficulty
            });
            document.getElementById('q-form-topic').disabled = Boolean(quiz.subjectId);
            setQuestionFormValues(q);
            document.getElementById('modal-question-title').textContent = 'Chỉnh Sửa Nội Dung Câu Hỏi';
            openQuestionFormModal();
          } catch (error) {
            Swal.fire({ icon: 'error', title: 'Không thể sửa câu hỏi', text: error.message });
          }
        })();
      }
    }

    if (btnRemove) {
      const qid = btnRemove.getAttribute('data-qid');
      quiz.questions = quiz.questions.filter(q => q.id !== qid);
      updateQuizGenerationSpec(quiz);
      saveQuizzesAndQuestionsToStorage();
      renderSelectedQuizQuestions(activeQuizId);
      renderAdminQuizzesTable();
      Swal.fire({ icon: 'success', title: 'Đã gỡ câu hỏi khỏi bài thi!' });
    }
  });
}

function renderAdminQuizzesTable() {
  const tbody = document.getElementById('admin-quizzes-tbody');
  if (!tbody) return;
  tbody.replaceChildren();

  const st = window.AppState.listsState.adminQuizzes;
  st.searchText = document.getElementById('search-admin-quizzes')?.value.trim().toLowerCase() || '';
  st.topic = document.getElementById('filter-topic-admin-quizzes')?.value || 'ALL';
  st.difficulty = document.getElementById('filter-difficulty-admin-quizzes')?.value || 'ALL';
  st.sort = document.getElementById('sort-admin-quizzes')?.value || 'DATE_DESC';
  st.pageSize = document.getElementById('pagesize-admin-quizzes')?.value || '10';

  const listView = processListRecords(window.AppState.allQuizzes, {
    searchText: st.searchText,
    searchableText: ['title', 'topic'],
    filters: [
      quiz => st.topic === 'ALL' || String(quiz.topic || '').toLocaleLowerCase() === st.topic.toLocaleLowerCase(),
      quiz => st.difficulty === 'ALL' || String(quiz.difficulty || '').toLocaleLowerCase() === st.difficulty.toLocaleLowerCase()
    ],
    sortRecords: records => {
      if (st.sort === 'TITLE_ASC' || st.sort === 'TITLE_DESC') {
        const direction = st.sort === 'TITLE_ASC' ? 1 : -1;
        return records
          .map((record, index) => ({ record, index }))
          .sort((left, right) => direction * String(left.record.title || '').localeCompare(String(right.record.title || ''), 'vi') || left.index - right.index)
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
    renderAdminEmptyRow(tbody, 6, 'Không tìm thấy bài thi phù hợp.');
  } else {
    pagedData.forEach(quiz => {
      const tr = document.createElement('tr');
      const questionCount = Array.isArray(quiz.questions) ? quiz.questions.length : 0;
      tr.append(
        createAdminTableCell(quiz.title, 'quiz-title-cell', 'admin-table-cell--strong')
      );

      const topicCell = document.createElement('td');
      const topicTag = document.createElement('span');
      topicTag.className = 'tag tag-topic';
      topicTag.textContent = String(quiz.topic || 'Chung');
      topicCell.appendChild(topicTag);

      const difficultyCell = document.createElement('td');
      const difficultyBadge = document.createElement('span');
      difficultyBadge.className = 'badge badge-student';
      const difficultyLabel = quiz.difficulty ||
        (questionCount === 0 ? 'Chưa có câu hỏi' : 'Chưa xác định');
      difficultyBadge.textContent = difficultyLabel;
      difficultyBadge.setAttribute(
        'aria-label',
        questionCount > 0 ? `Độ khó trung bình: ${difficultyLabel}` : 'Đề chưa có câu hỏi'
      );
      difficultyCell.appendChild(difficultyBadge);
      tr.append(
        topicCell,
        difficultyCell,
        createAdminTableCell(`${quiz.timeLimit ?? '—'} phút`),
        createAdminTableCell(`${questionCount} câu`, '', 'admin-table-cell--bold admin-table-cell--ai')
      );

      const actionsCell = document.createElement('td');
      actionsCell.className = 'admin-table-actions';
      [
        ['btn-manage-quiz-qs', 'Quản Lý Câu Hỏi', 'list-checks', 'admin-action-button--ai'],
        ['btn-edit-quiz-info', 'Sửa', 'edit', 'admin-action-button--primary'],
        ['btn-delete-quiz', 'Xóa', 'trash-2', 'admin-action-button--danger']
      ].forEach(([className, label, iconName, actionClassName]) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = `btn btn-outline admin-action-button ${actionClassName} ${className}`;
        button.dataset.id = String(quiz.id ?? '');
        const icon = document.createElement('i');
        icon.setAttribute('data-lucide', iconName);
        icon.setAttribute('aria-hidden', 'true');
        button.append(icon, document.createTextNode(` ${label}`));
        actionsCell.appendChild(button);
      });
      tr.appendChild(actionsCell);
      tbody.appendChild(tr);
    });
  }

  renderListPagination('pagination-admin-quizzes', listView, (newPage) => {
    st.currentPage = newPage;
    renderAdminQuizzesTable();
  }, 'bài thi');

  if (typeof lucide !== 'undefined') lucide.createIcons();
}

function filterAdminQuizzes(quizzes, { searchText = '', topic = 'ALL', difficulty = 'ALL' } = {}) {
  const normalizedSearch = String(searchText).toLocaleLowerCase();
  const normalizedTopic = String(topic).toLocaleLowerCase();
  const normalizedDifficulty = String(difficulty).toLocaleLowerCase();
  return quizzes.filter(quiz => {
    const title = String(quiz.title || '').toLocaleLowerCase();
    const quizTopic = String(quiz.topic || '').toLocaleLowerCase();
    const quizDifficulty = String(quiz.difficulty || '').toLocaleLowerCase();
    return (!normalizedSearch || title.includes(normalizedSearch) || quizTopic.includes(normalizedSearch)) &&
      (topic === 'ALL' || quizTopic === normalizedTopic) &&
      (difficulty === 'ALL' || quizDifficulty === normalizedDifficulty);
  });
}

function renderSelectedQuizQuestions(quizId) {
  const quiz = window.AppState.allQuizzes.find(q => q.id === quizId);
  if (!quiz) return;

  window.AppState.selectedQuizIdForAdmin = quizId;
  document.getElementById('selected-quiz-title-display').textContent = String(quiz.title || '');
  document.getElementById('selected-quiz-id-display').textContent = String(quiz.id || '');
  document.getElementById('modal-manage-questions')?.classList.remove('hidden');

  const tbody = document.getElementById('admin-quiz-questions-tbody');
  if (!tbody) return;
  tbody.replaceChildren();

  const st = window.AppState.listsState.quizQuestions;
  st.searchText = document.getElementById('search-quiz-questions')?.value.trim().toLowerCase() || '';
  st.sort = document.getElementById('sort-quiz-questions')?.value || 'DATE_DESC';
  st.pageSize = document.getElementById('pagesize-quiz-questions')?.value || '10';

  const listView = processListRecords(quiz.questions || [], {
    searchText: st.searchText,
    searchableText: ['question'],
    sortRecords: records => {
      if (st.sort === 'TITLE_ASC' || st.sort === 'TITLE_DESC') {
        const direction = st.sort === 'TITLE_ASC' ? 1 : -1;
        return records
          .map((record, index) => ({ record, index }))
          .sort((left, right) => direction * String(left.record.question || '').localeCompare(String(right.record.question || ''), 'vi') || left.index - right.index)
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
    renderAdminEmptyRow(tbody, 4, 'Bài thi này chưa có câu hỏi nào khớp bộ lọc.');
  } else {
    pagedData.forEach((q, idx) => {
      const tr = document.createElement('tr');
      const pageSize = Number.parseInt(st.pageSize, 10) || 10;
      const rowNumber = st.pageSize === 'ALL' ? idx + 1 : (st.currentPage - 1) * pageSize + idx + 1;
      tr.append(
        createAdminTableCell(rowNumber),
        createAdminTableCell(q.question, '', 'admin-bank-question-cell')
      );

      const answerCell = document.createElement('td');
      answerCell.className = 'admin-table-cell--success';
      appendCorrectAnswerBadges(answerCell, q);
      tr.appendChild(answerCell);

      const actionsCell = document.createElement('td');
      actionsCell.className = 'admin-table-actions';
      [
        ['btn-edit-q-in-quiz', 'Sửa', 'edit', 'admin-action-button--primary'],
        ['btn-remove-q-from-quiz', 'Gỡ', 'trash-2', 'admin-action-button--danger']
      ].forEach(([className, label, iconName, actionClassName]) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = `btn btn-outline admin-action-button ${actionClassName} ${className}`;
        button.dataset.qid = String(q.id ?? '');
        const icon = document.createElement('i');
        icon.setAttribute('data-lucide', iconName);
        icon.setAttribute('aria-hidden', 'true');
        button.append(icon, document.createTextNode(` ${label}`));
        actionsCell.appendChild(button);
      });
      tr.appendChild(actionsCell);
      tbody.appendChild(tr);
    });
  }

  renderListPagination('pagination-quiz-questions', listView, (newPage) => {
    st.currentPage = newPage;
    renderSelectedQuizQuestions(quizId);
  }, 'câu hỏi');

  if (typeof lucide !== 'undefined') lucide.createIcons();
}