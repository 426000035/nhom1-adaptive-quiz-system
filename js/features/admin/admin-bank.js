/* ==========================================================================
   Adaptive Quiz System - Admin Question Bank Module (js/features/admin/admin-bank.js)
   ========================================================================== */

let selectedBankQuestionIds = new Set();

function initAdminBankModule() {
  bindAdminBankEvents();
}

function questionMatchesQuizSubject(question, quiz) {
  if (!question || !quiz) return false;

  const questionSubjectId = String(question.subjectId || '').trim();
  const quizSubjectId = String(quiz.subjectId || '').trim();
  if (questionSubjectId && quizSubjectId) {
    return questionSubjectId === quizSubjectId;
  }

  const questionTopic = String(question.topic || '').trim().toLocaleLowerCase();
  const quizTopic = String(quiz.topic || '').trim().toLocaleLowerCase();
  return Boolean(questionTopic && quizTopic && questionTopic === quizTopic);
}

function bindAdminBankEvents() {
  // Lọc & Phân trang Ngân hàng chung
  bindListEvents(
    ['search-global-bank', 'filter-topic-global-bank', 'filter-difficulty-global-bank', 'sort-global-bank', 'pagesize-global-bank'], 
    'globalBank', 
    renderGlobalQuestionBank
  );

  // Lọc & Phân trang Modal chọn câu hỏi từ kho
  bindListEvents(['search-modal-bank', 'sort-modal-bank', 'pagesize-modal-bank'], 'modalBank', openSelectFromBankModal);

  // Mở modal Thêm câu hỏi mới từ Ngân hàng
  document.getElementById('btn-admin-add-global-question')?.addEventListener('click', openCreateGlobalQuestionModal);
  document.getElementById('q-form-add-option')?.addEventListener('click', () => {
    const formState = readQuestionOptionForm();
    formState.options.push('');
    renderQuestionFormOptions(formState.options, formState.correctAnswer);
    document.querySelector('#q-form-options [data-question-option]:last-of-type')?.focus();
  });
  document.getElementById('q-form-type')?.addEventListener('change', () => {
    const formState = readQuestionOptionForm();
    renderQuestionFormOptions(formState.options, formState.correctAnswer);
  });
  document.getElementById('q-form-options')?.addEventListener('click', event => {
    const removeButton = event.target.closest('[data-remove-question-option]');
    if (!removeButton) return;
    const formState = readQuestionOptionForm();
    const optionIndex = Number(removeButton.dataset.removeQuestionOption);
    if (formState.options.length <= 2 || !Number.isInteger(optionIndex)) return;
    formState.options.splice(optionIndex, 1);
    formState.correctAnswer = formState.correctAnswer
      .filter(index => index !== optionIndex)
      .map(index => index > optionIndex ? index - 1 : index);
    if (formState.correctAnswer.length === 0) formState.correctAnswer = [0];
    renderQuestionFormOptions(formState.options, formState.correctAnswer);
  });

  // Đóng Modal Câu hỏi
  document.getElementById('btn-close-q-modal')?.addEventListener('click', closeQuestionModal);
  document.getElementById('btn-cancel-q-form')?.addEventListener('click', closeQuestionModal);

  // Lắng nghe Submit Form Câu Hỏi
  const formQ = document.getElementById('form-manage-question');
  if (formQ) {
    formQ.onsubmit = async function (e) {
      e.preventDefault();
      await saveQuestionFromModal();
    };
  }

  // Mở & Hủy Modal chọn kho câu hỏi
  document.getElementById('btn-admin-import-from-bank')?.addEventListener('click', openSelectFromBankModal);
  document.getElementById('btn-cancel-bank-select')?.addEventListener('click', () => {
    selectedBankQuestionIds.clear();
    updateBankQuestionSelectionSummary();
    document.getElementById('modal-select-from-bank')?.classList.add('hidden');
  });

  // Checkbox chọn tất cả
  document.getElementById('chk-select-filtered-bank')?.addEventListener('change', event => {
    const quiz = getSelectedQuizForBankModal();
    if (!quiz) return;
    getFilteredBankQuestions(quiz).forEach(question => {
      const questionId = String(question.id ?? '');
      if (event.currentTarget.checked) selectedBankQuestionIds.add(questionId);
      else selectedBankQuestionIds.delete(questionId);
    });
    openSelectFromBankModal();
  });
  document.getElementById('bank-questions-select-tbody')?.addEventListener('change', event => {
    const checkbox = event.target.closest('.chk-bank-q');
    if (!checkbox) return;
    if (checkbox.checked) selectedBankQuestionIds.add(checkbox.value);
    else selectedBankQuestionIds.delete(checkbox.value);
    updateBankQuestionSelectionSummary();
    updateBankFilteredSelectionCheckbox();
  });

  // Xác nhận nạp câu hỏi từ Ngân hàng vào Bài thi
  document.getElementById('btn-confirm-bank-select')?.addEventListener('click', () => {
    const activeQuizId = window.AppState.selectedQuizIdForAdmin;
    const quiz = window.AppState.allQuizzes.find(q => q.id === activeQuizId);
    if (!quiz) return;

    if (selectedBankQuestionIds.size === 0) {
      if (typeof Swal !== 'undefined') Swal.fire({ icon: 'info', title: 'Vui lòng chọn ít nhất 1 câu hỏi!' });
      return;
    }

    if (!quiz.questions) quiz.questions = [];

    const selectedQuestions = Array.from(selectedBankQuestionIds)
      .map(questionId => window.AppState.allQuestions.find(question => String(question.id) === questionId))
      .filter(Boolean);
    const mismatch = selectedQuestions.some(question => !questionMatchesQuizSubject(question, quiz));
    if (mismatch) {
      if (typeof Swal !== 'undefined') Swal.fire({ icon: 'error', title: 'Môn học không khớp', text: 'Chỉ có thể thêm câu hỏi cùng môn học với đề thi.' });
      return;
    }

    selectedQuestions.forEach(bankQuestion => {
      quiz.questions.push(JSON.parse(JSON.stringify(bankQuestion)));
    });

    updateQuizGenerationSpec(quiz);
    saveQuizzesAndQuestionsToStorage();
    selectedBankQuestionIds.clear();
    document.getElementById('modal-select-from-bank')?.classList.add('hidden');
    
    if (typeof renderSelectedQuizQuestions === 'function') renderSelectedQuizQuestions(activeQuizId);
    if (typeof renderAdminQuizzesTable === 'function') renderAdminQuizzesTable();
    
    if (typeof Swal !== 'undefined') Swal.fire({ icon: 'success', title: 'Đã thêm các câu hỏi được chọn vào bài thi!' });
  });

  // Sửa & Xóa trực tiếp ở Bảng Ngân Hàng Câu Hỏi Chung
  document.getElementById('admin-global-questions-tbody')?.addEventListener('click', (e) => {
    const btnEdit = e.target.closest('.btn-edit-global-q');
    const btnDelete = e.target.closest('.btn-delete-global-q');

    if (btnEdit) openEditGlobalQuestionModal(btnEdit.getAttribute('data-qid'));
    if (btnDelete) deleteQuestionFromGlobalBank(btnDelete.getAttribute('data-qid'));
  });
}

function getSelectedQuizForBankModal() {
  const activeQuizId = window.AppState.selectedQuizIdForAdmin;
  return window.AppState.allQuizzes.find(quiz => quiz.id === activeQuizId) || null;
}

function getFilteredBankQuestions(quiz) {
  const existingQuestionIds = new Set((quiz.questions || []).map(question => String(question.id)));
  const availableQuestions = window.AppState.allQuestions.filter(question =>
    !existingQuestionIds.has(String(question.id)) && questionMatchesQuizSubject(question, quiz)
  );
  const state = window.AppState.listsState.modalBank;
  state.searchText = document.getElementById('search-modal-bank')?.value.trim().toLowerCase() || '';
  state.sort = document.getElementById('sort-modal-bank')?.value || 'DATE_DESC';
  return processListRecords(availableQuestions, {
    searchText: state.searchText,
    searchableText: ['question'],
    sortRecords: records => {
      if (state.sort === 'TITLE_ASC' || state.sort === 'TITLE_DESC') {
        const direction = state.sort === 'TITLE_ASC' ? 1 : -1;
        return records
          .map((record, index) => ({ record, index }))
          .sort((left, right) => direction * String(left.record.question || '').localeCompare(String(right.record.question || ''), 'vi') || left.index - right.index)
          .map(entry => entry.record);
      }
      return sortListByDate(records, state.sort);
    },
    pageSize: 'ALL'
  }).records;
}

function updateBankQuestionSelectionSummary() {
  const summary = document.getElementById('bank-question-selection-count');
  if (summary) summary.textContent = `Đã chọn ${selectedBankQuestionIds.size} câu hỏi`;
}

function updateBankFilteredSelectionCheckbox(filteredQuestions = []) {
  const selectAll = document.getElementById('chk-select-filtered-bank');
  if (!selectAll) return;
  selectAll.checked = filteredQuestions.length > 0 &&
    filteredQuestions.every(question => selectedBankQuestionIds.has(String(question.id ?? '')));
  selectAll.disabled = filteredQuestions.length === 0;
}

/**
 * Định dạng hiển thị cột Đáp án đúng dạng Badge (A, B, C, D)
 */
function appendCorrectAnswerBadges(cell, question) {
  if (!question || !Array.isArray(question.options) ||
      !Array.isArray(question.correctAnswer) || question.correctAnswer.length === 0) {
    const unavailable = document.createElement('span');
    unavailable.className = 'text-muted';
    unavailable.textContent = 'N/A';
    cell.appendChild(unavailable);
    return;
  }

  question.correctAnswer.forEach(index => {
    const badge = document.createElement('span');
    badge.className = 'admin-answer-badge';
    const label = document.createElement('strong');
    label.textContent = `${getQuestionOptionLabel(index)}: `;
    badge.append(label, document.createTextNode(String(question.options[index] ?? '')));
    cell.appendChild(badge);
  });
}

function getQuestionOptionLabel(index) {
  if (index < 26) return String.fromCharCode(65 + index);
  return `Lựa chọn ${index + 1}`;
}

function readQuestionOptionForm() {
  const options = Array.from(document.querySelectorAll('#q-form-options [data-question-option]'))
    .map(input => input.value.trim());
  const correctAnswer = Array.from(document.querySelectorAll('#q-form-options [data-correct-answer]:checked'))
    .map(input => Number(input.value));
  return { options, correctAnswer };
}

function renderQuestionFormOptions(options, correctAnswer = [0]) {
  const container = document.getElementById('q-form-options');
  const typeSelect = document.getElementById('q-form-type');
  if (!container || !typeSelect) return;

  const selectedAnswers = new Set(correctAnswer);
  const isMultiple = typeSelect.value === 'multiple';
  container.replaceChildren();

  options.forEach((value, index) => {
    const row = document.createElement('div');
    row.className = 'question-option-row';

    const correctLabel = document.createElement('label');
    correctLabel.className = 'question-option-correct';
    const correctInput = document.createElement('input');
    correctInput.type = isMultiple ? 'checkbox' : 'radio';
    correctInput.name = 'q-form-correct';
    correctInput.value = String(index);
    correctInput.checked = selectedAnswers.has(index);
    correctInput.dataset.correctAnswer = '';
    correctInput.setAttribute('aria-label', `Đáp án đúng ${getQuestionOptionLabel(index)}`);
    const correctText = document.createElement('span');
    correctText.textContent = getQuestionOptionLabel(index);
    correctLabel.append(correctInput, correctText);

    const optionInput = document.createElement('input');
    optionInput.type = 'text';
    optionInput.className = 'select-control';
    optionInput.value = value;
    optionInput.placeholder = `Nội dung phương án ${getQuestionOptionLabel(index)}`;
    optionInput.required = true;
    optionInput.dataset.questionOption = '';
    optionInput.setAttribute('aria-label', `Nội dung phương án ${getQuestionOptionLabel(index)}`);

    const removeButton = document.createElement('button');
    removeButton.type = 'button';
    removeButton.className = 'btn btn-outline question-option-remove';
    removeButton.textContent = 'Xóa';
    removeButton.dataset.removeQuestionOption = String(index);
    removeButton.disabled = options.length <= 2;
    removeButton.setAttribute('aria-label', `Xóa phương án ${getQuestionOptionLabel(index)}`);

    row.append(correctLabel, optionInput, removeButton);
    container.appendChild(row);
  });
}

function openQuestionFormModal() {
  document.getElementById('modal-question-form')?.classList.remove('hidden');
  document.body.classList.add('question-form-open');
}

function setQuestionFormValues(question = null) {
  const setVal = (id, value) => {
    const field = document.getElementById(id);
    if (field) field.value = value;
  };
  setVal('q-form-id', question?.id || '');
  setVal('q-form-text', question?.question || '');
  setVal('q-form-explanation', question?.explanation || '');
  setVal('q-form-type', question?.type === 'multiple' ? 'multiple' : 'single');

  const originalOptions = Array.isArray(question?.options) ? question.options : ['', '', '', ''];
  const optionIndexMap = new Map();
  const options = [];
  originalOptions.forEach((option, index) => {
    if (typeof option !== 'string' || !option.trim()) return;
    optionIndexMap.set(index, options.length);
    options.push(option.trim());
  });
  while (options.length < 2) options.push('');

  const rawCorrectAnswers = Array.isArray(question?.correctAnswer)
    ? question.correctAnswer
    : question?.correctAnswer === undefined ? [0] : [question.correctAnswer];
  const correctAnswer = rawCorrectAnswers
    .map(index => optionIndexMap.get(index))
    .filter(index => index !== undefined);
  if (correctAnswer.length === 0) correctAnswer.push(0);
  renderQuestionFormOptions(options, correctAnswer);
}

function renderGlobalQuestionBank() {
  const tbody = document.getElementById('admin-global-questions-tbody');
  if (!tbody) return;
  tbody.replaceChildren();

  extractGlobalQuestions();

  const st = window.AppState.listsState.globalBank;
  st.searchText = document.getElementById('search-global-bank')?.value.trim().toLowerCase() || '';
  st.topic = document.getElementById('filter-topic-global-bank')?.value || 'ALL';
  st.difficulty = document.getElementById('filter-difficulty-global-bank')?.value || 'ALL';
  st.sort = document.getElementById('sort-global-bank')?.value || 'DATE_DESC';
  st.pageSize = document.getElementById('pagesize-global-bank')?.value || '10';

  const listView = processListRecords(window.AppState.allQuestions, {
    searchText: st.searchText,
    searchableText: ['question'],
    filters: [
      question => st.topic === 'ALL' || String(question.topic || '').toLocaleLowerCase() === st.topic.toLocaleLowerCase(),
      question => st.difficulty === 'ALL' || String(question.difficulty || '').toLocaleLowerCase() === st.difficulty.toLocaleLowerCase()
    ],
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
    renderAdminEmptyRow(tbody, 5, 'Ngân hàng chưa có câu hỏi nào phù hợp.');
  } else {
    pagedData.forEach(q => {
      const tr = document.createElement('tr');
      const topicCell = document.createElement('td');
      topicCell.className = 'admin-bank-topic-cell';
      const topicTag = document.createElement('span');
      topicTag.className = 'tag tag-topic';
      topicTag.textContent = String(q.topic || 'Chung');
      topicCell.appendChild(topicTag);

      const difficultyCell = document.createElement('td');
      difficultyCell.className = 'admin-bank-difficulty-cell';
      const difficultyBadge = document.createElement('span');
      difficultyBadge.className = 'badge badge-student';
      difficultyBadge.textContent = String(q.difficulty || 'Medium');
      difficultyCell.appendChild(difficultyBadge);

      const answerCell = document.createElement('td');
      appendCorrectAnswerBadges(answerCell, q);

      const actionsCell = document.createElement('td');
      actionsCell.className = 'admin-table-actions';
      [
        ['btn-edit-global-q', 'Sửa', 'edit', 'admin-action-button--primary'],
        ['btn-delete-global-q', 'Xóa', 'trash-2', 'admin-action-button--danger']
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
      tr.append(
        topicCell,
        difficultyCell,
        createAdminTableCell(q.question, '', 'admin-bank-question-cell'),
        answerCell,
        actionsCell
      );
      tbody.appendChild(tr);
    });
  }

  renderListPagination('pagination-global-bank', listView, (newPage) => {
    st.currentPage = newPage;
    renderGlobalQuestionBank();
  }, 'câu hỏi');

  if (typeof lucide !== 'undefined') lucide.createIcons();
}

/**
 * Mở Modal Thêm mới câu hỏi
 */
async function openCreateGlobalQuestionModal() {
  setQuestionFormValues();
  document.getElementById('q-form-topic').disabled = false;
  try {
    await window.AdminCatalogs.populateQuestionCatalogFields();
  } catch (error) {
    if (typeof Swal !== 'undefined') Swal.fire({ icon: 'error', title: 'Không thể tạo câu hỏi', text: error.message });
    return;
  }

  const titleEl = document.getElementById('modal-question-title');
  if (titleEl) titleEl.textContent = 'Thêm Câu Hỏi Mới Vào Ngân Hàng';

  openQuestionFormModal();
}

/**
 * Mở Modal Chỉnh sửa câu hỏi
 */
async function openEditGlobalQuestionModal(qId) {
  extractGlobalQuestions();
  const targetQ = window.AppState.allQuestions.find(q => q.id === qId);
  if (!targetQ) return;

  setQuestionFormValues(targetQ);
  try {
    await window.AdminCatalogs.populateQuestionCatalogFields({
      subjectId: targetQ.subjectId,
      skillId: targetQ.skillId,
      topic: targetQ.topic,
      difficultyId: targetQ.difficultyId,
      difficulty: targetQ.difficulty
    });
  } catch (error) {
    if (typeof Swal !== 'undefined') Swal.fire({ icon: 'error', title: 'Không thể sửa câu hỏi', text: error.message });
    return;
  }
  document.getElementById('q-form-topic').disabled = false;

  const titleEl = document.getElementById('modal-question-title');
  if (titleEl) titleEl.textContent = 'Chỉnh Sửa Câu Hỏi Trong Ngân Hàng';

  openQuestionFormModal();
}

/**
 * Đóng Modal Câu hỏi
 */
function closeQuestionModal() {
  document.getElementById('modal-question-form')?.classList.add('hidden');
  document.body.classList.remove('question-form-open');
}

/**
 * Lưu Dữ liệu Câu Hỏi (Xử lý Thêm / Sửa)
 */
async function saveQuestionFromModal() {
  const qId = document.getElementById('q-form-id')?.value;
  const questionText = document.getElementById('q-form-text')?.value.trim();
  const { options, correctAnswer } = readQuestionOptionForm();
  const questionType = document.getElementById('q-form-type')?.value;
  const explanation = document.getElementById('q-form-explanation')?.value.trim();
  const subjectId = document.getElementById('q-form-topic')?.value;
  const skillId = document.getElementById('q-form-skill')?.value;
  const difficultyId = document.getElementById('q-form-difficulty')?.value;

  if (!questionText || !subjectId || !skillId || options.length < 2 || options.some(option => !option)) {
    if (typeof Swal !== 'undefined') Swal.fire({ icon: 'warning', title: 'Vui lòng chọn môn học, kỹ năng và điền câu hỏi cùng ít nhất 2 phương án!' });
    return;
  }
  if (!['single', 'multiple'].includes(questionType) ||
      correctAnswer.length === 0 ||
      (questionType === 'single' && correctAnswer.length !== 1)) {
    if (typeof Swal !== 'undefined') {
      Swal.fire({
        icon: 'warning',
        title: 'Đáp án đúng chưa hợp lệ',
        text: questionType === 'single'
          ? 'Câu hỏi chọn một cần đúng chính xác một đáp án.'
          : 'Hãy đánh dấu ít nhất một đáp án đúng.'
      });
    }
    return;
  }

  let subject;
  let skill;
  let difficulty;
  try {
    const catalogs = await window.AdminCatalogs.getActiveCatalogs();
    subject = catalogs.subjects.find(item => String(item.subjectId) === String(subjectId));
    skill = catalogs.skills.find(item => String(item.skillId) === String(skillId) && String(item.subjectId) === String(subjectId));
    difficulty = catalogs.difficulties.find(item => String(item.difficultyId) === String(difficultyId));
  } catch (error) {
    if (typeof Swal !== 'undefined') Swal.fire({ icon: 'error', title: 'Không thể tải danh mục', text: error.message });
    return;
  }
  if (!subject || !skill || !difficulty) {
    if (typeof Swal !== 'undefined') Swal.fire({ icon: 'error', title: 'Danh mục không còn hợp lệ', text: 'Hãy tải lại danh sách môn học và kỹ năng rồi thử lại.' });
    return;
  }

  const existingQuestion = qId
    ? window.AppState.allQuestions.find(question => question.id === qId) ||
      window.AppState.allQuizzes.flatMap(quiz => quiz.questions || []).find(question => question.id === qId)
    : null;
  const qData = {
    id: qId || ('q_' + Date.now()),
    subjectId: subject.subjectId,
    skillId: skill.skillId,
    topic: subject.name,
    subTopic: skill.name,
    difficulty: difficulty.label,
    difficultyId: difficulty.difficultyId,
    difficultyRank: Number(difficulty.rank),
    type: questionType,
    question: questionText,
    options,
    correctAnswer,
    explanation: explanation,
    ...(existingQuestion?.createdAt
      ? { createdAt: existingQuestion.createdAt }
      : qId ? {} : { createdAt: new Date().toISOString() })
  };

  if (qId) {
    // Cập nhật câu hỏi trong tất cả đề thi có chứa nó
    window.AppState.allQuizzes.forEach(quiz => {
      if (quiz.questions) {
        const idx = quiz.questions.findIndex(q => q.id === qId);
        if (idx !== -1) {
          quiz.questions[idx] = { ...quiz.questions[idx], ...qData };
          updateQuizGenerationSpec(quiz);
        }
      }
    });
  } else {
    const activeQuiz = window.AppState.allQuizzes.find(quiz => quiz.id === window.AppState.selectedQuizIdForAdmin);
    if (activeQuiz && activeQuiz.subjectId && String(activeQuiz.subjectId) !== String(subject.subjectId)) {
      if (typeof Swal !== 'undefined') Swal.fire({ icon: 'error', title: 'Môn học không khớp', text: 'Câu hỏi phải cùng môn học với đề thi.' });
      return;
    }
    if (activeQuiz && !activeQuiz.subjectId && activeQuiz.topic && activeQuiz.topic !== subject.name) {
      if (typeof Swal !== 'undefined') Swal.fire({ icon: 'error', title: 'Môn học không khớp', text: 'Câu hỏi phải cùng môn học với đề thi.' });
      return;
    }

    if (activeQuiz) {
      if (!activeQuiz.questions) activeQuiz.questions = [];
      activeQuiz.subjectId = activeQuiz.subjectId || subject.subjectId;
      activeQuiz.topic = activeQuiz.topic || subject.name;
      activeQuiz.questions.push({ ...qData, subTopic: activeQuiz.title });
      updateQuizGenerationSpec(activeQuiz);
    } else {
      const targetQuiz = window.AppState.allQuizzes.find(quiz =>
        String(quiz.subjectId || '') === String(subject.subjectId) ||
        (!quiz.subjectId && quiz.topic === subject.name)
      );
      if (targetQuiz) {
        if (!Array.isArray(targetQuiz.questions)) targetQuiz.questions = [];
        targetQuiz.questions.push(qData);
        updateQuizGenerationSpec(targetQuiz);
      } else {
        window.AppState.allQuizzes.unshift({
          id: `quiz_bank_${subject.subjectId}`,
          title: `Kho câu hỏi - ${subject.name}`,
          topic: subject.name,
          subjectId: subject.subjectId,
          difficulty: difficulty.label,
          timeLimit: 15,
          createdAt: new Date().toISOString(),
          questions: [qData]
        });
      }
    }
  }

  saveQuizzesAndQuestionsToStorage();
  closeQuestionModal();
  renderGlobalQuestionBank();
  if (window.AppState.selectedQuizIdForAdmin && typeof renderSelectedQuizQuestions === 'function') {
    renderSelectedQuizQuestions(window.AppState.selectedQuizIdForAdmin);
  }
  if (typeof renderAdminQuizzesTable === 'function') renderAdminQuizzesTable();

  if (typeof Swal !== 'undefined') {
    Swal.fire({ icon: 'success', title: qId ? 'Đã cập nhật câu hỏi!' : 'Thêm câu hỏi mới thành công!' });
  }
}

function openSelectFromBankModal() {
  const quiz = getSelectedQuizForBankModal();
  if (!quiz) return;

  extractGlobalQuestions();

  const tbody = document.getElementById('bank-questions-select-tbody');
  if (!tbody) return;
  tbody.replaceChildren();

  const st = window.AppState.listsState.modalBank;
  st.pageSize = document.getElementById('pagesize-modal-bank')?.value || '10';
  const filteredQuestions = getFilteredBankQuestions(quiz);
  const listView = processListRecords(filteredQuestions, {
    currentPage: st.currentPage,
    pageSize: st.pageSize
  });
  updateBankFilteredSelectionCheckbox(filteredQuestions);
  st.currentPage = listView.currentPage;
  const pagedData = listView.records;

  if (pagedData.length === 0) {
    renderAdminEmptyRow(tbody, 4, 'Không có câu hỏi thuộc môn học của đề này khớp bộ lọc.');
  } else {
    pagedData.forEach(q => {
      const tr = document.createElement('tr');
      const selectCell = document.createElement('td');
      selectCell.className = 'admin-table-cell--center';
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.className = 'chk-bank-q';
      checkbox.value = String(q.id ?? '');
      checkbox.checked = selectedBankQuestionIds.has(checkbox.value);
      checkbox.setAttribute('aria-label', `Chọn câu hỏi ${String(q.id ?? '')}`);
      selectCell.appendChild(checkbox);

      const topicCell = document.createElement('td');
      const topicTag = document.createElement('span');
      topicTag.className = 'tag tag-topic';
      topicTag.textContent = String(q.topic || 'Chung');
      topicCell.appendChild(topicTag);
      tr.append(
        selectCell,
        createAdminTableCell(q.id, '', 'admin-table-cell--mono admin-table-cell--muted'),
        createAdminTableCell(q.question),
        topicCell
      );
      tbody.appendChild(tr);
    });
  }

  renderListPagination('pagination-modal-bank', listView, (newPage) => {
    st.currentPage = newPage;
    openSelectFromBankModal();
  }, 'câu hỏi');

  updateBankQuestionSelectionSummary();
  document.getElementById('modal-select-from-bank')?.classList.remove('hidden');
}

function deleteQuestionFromGlobalBank(qId) {
  const performDelete = () => {
    window.AppState.allQuestions = window.AppState.allQuestions.filter(question => question.id !== qId);
    window.AppState.allQuizzes.forEach(quiz => {
      if (quiz.questions) {
        quiz.questions = quiz.questions.filter(q => q.id !== qId);
        updateQuizGenerationSpec(quiz);
      }
    });

    saveQuizzesAndQuestionsToStorage();
    renderGlobalQuestionBank();
    if (typeof Swal !== 'undefined') Swal.fire({ icon: 'success', title: 'Đã xóa câu hỏi khỏi toàn hệ thống!' });
  };

  if (typeof Swal !== 'undefined') {
    Swal.fire({
      title: 'Xác nhận xóa câu hỏi?',
      text: 'Thao tác này sẽ xóa vĩnh viễn câu hỏi khỏi ngân hàng và tất cả các bài thi chứa nó!',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Xóa',
      cancelButtonText: 'Hủy'
    }).then((res) => {
      if (res.isConfirmed) performDelete();
    });
  } else {
    if (confirm('Xóa vĩnh viễn câu hỏi này khỏi toàn hệ thống?')) performDelete();
  }
}