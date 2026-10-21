/* ==========================================================================
   Adaptive Quiz System - Admin Question Bank Module (js/admin/admin-bank.js)
   ========================================================================== */

function initAdminBankModule() {
  bindAdminBankEvents();
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

  // Đóng Modal Câu hỏi
  document.getElementById('btn-close-q-modal')?.addEventListener('click', closeQuestionModal);
  document.getElementById('btn-cancel-q-form')?.addEventListener('click', closeQuestionModal);

  // Lắng nghe Submit Form Câu Hỏi
  const formQ = document.getElementById('form-manage-question');
  if (formQ) {
    formQ.onsubmit = function (e) {
      e.preventDefault();
      saveQuestionFromModal();
    };
  }

  // Mở & Hủy Modal chọn kho câu hỏi
  document.getElementById('btn-admin-import-from-bank')?.addEventListener('click', openSelectFromBankModal);
  document.getElementById('btn-cancel-bank-select')?.addEventListener('click', () => {
    document.getElementById('modal-select-from-bank')?.classList.add('hidden');
  });

  // Checkbox chọn tất cả
  document.getElementById('chk-select-all-bank')?.addEventListener('change', (e) => {
    document.querySelectorAll('.chk-bank-q').forEach(chk => chk.checked = e.target.checked);
  });

  // Xác nhận nạp câu hỏi từ Ngân hàng vào Bài thi
  document.getElementById('btn-confirm-bank-select')?.addEventListener('click', () => {
    const activeQuizId = window.AppState.selectedQuizIdForAdmin;
    const quiz = window.AppState.allQuizzes.find(q => q.id === activeQuizId);
    if (!quiz) return;

    const selectedCheckboxes = document.querySelectorAll('.chk-bank-q:checked');
    if (selectedCheckboxes.length === 0) {
      if (typeof Swal !== 'undefined') Swal.fire({ icon: 'info', title: 'Vui lòng chọn ít nhất 1 câu hỏi!' });
      return;
    }

    if (!quiz.questions) quiz.questions = [];

    selectedCheckboxes.forEach(chk => {
      const bankQ = window.AppState.allQuestions.find(q => q.id === chk.value);
      if (bankQ) quiz.questions.push(JSON.parse(JSON.stringify(bankQ)));
    });

    saveQuizzesAndQuestionsToStorage();
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

/**
 * Định dạng hiển thị cột Đáp án đúng dạng Badge (A, B, C, D)
 */
function formatCorrectAnswerText(q) {
  if (!q || !q.options || !Array.isArray(q.correctAnswer) || q.correctAnswer.length === 0) {
    return '<span style="color: var(--text-muted);">N/A</span>';
  }

  const letters = ['A', 'B', 'C', 'D', 'E', 'F'];

  return q.correctAnswer.map(idx => {
    const letter = letters[idx] || `Lựa chọn ${idx + 1}`;
    const optionText = q.options[idx] !== undefined ? q.options[idx] : '';

    return `<span class="badge" style="display: inline-block; margin: 2px; padding: 0.2rem 0.5rem; font-size: 0.8rem; background-color: rgba(16, 185, 129, 0.15); color: #10b981; border: 1px solid rgba(16, 185, 129, 0.3); border-radius: 4px;">
              <strong>${letter}:</strong> ${optionText}
            </span>`;
  }).join(' ');
}

function renderGlobalQuestionBank() {
  const tbody = document.getElementById('admin-global-questions-tbody');
  if (!tbody) return;
  tbody.innerHTML = '';

  extractGlobalQuestions();

  const st = window.AppState.listsState.globalBank;
  st.searchText = document.getElementById('search-global-bank')?.value.trim().toLowerCase() || '';
  st.topic = document.getElementById('filter-topic-global-bank')?.value || 'ALL';
  st.difficulty = document.getElementById('filter-difficulty-global-bank')?.value || 'ALL';
  st.sort = document.getElementById('sort-global-bank')?.value || 'TITLE_ASC';
  st.pageSize = document.getElementById('pagesize-global-bank')?.value || '10';

  let filtered = window.AppState.allQuestions.filter(q => {
    const textMatches = !st.searchText || (q.question && q.question.toLowerCase().includes(st.searchText));
    const topicMatches = (st.topic === 'ALL') || (q.topic && q.topic.toLowerCase() === st.topic.toLowerCase());
    const difficultyMatches = (st.difficulty === 'ALL') || (q.difficulty && q.difficulty.toLowerCase() === st.difficulty.toLowerCase());
    return textMatches && topicMatches && difficultyMatches;
  });

  if (st.sort === 'TITLE_ASC') filtered.sort((a, b) => (a.question || '').localeCompare(b.question || ''));
  else if (st.sort === 'TITLE_DESC') filtered.sort((a, b) => (b.question || '').localeCompare(a.question || ''));

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
    tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; padding: 1.5rem; color: var(--text-muted);">Ngân hàng chưa có câu hỏi nào phù hợp.</td></tr>`;
  } else {
    pagedData.forEach(q => {
      const tr = document.createElement('tr');
      tr.style.borderBottom = '1px solid var(--border-color)';
      tr.innerHTML = `
        <td style="padding: 0.75rem; font-family: var(--font-family-mono); color: var(--text-muted);">${q.id}</td>
        <td style="padding: 0.75rem;"><span class="tag tag-topic">${q.topic || 'Chung'}</span></td>
        <td style="padding: 0.75rem;"><span class="badge badge-student">${q.difficulty || 'Medium'}</span></td>
        <td style="padding: 0.75rem;">${q.question}</td>
        <td style="padding: 0.75rem;">${formatCorrectAnswerText(q)}</td>
        <td style="padding: 0.75rem; text-align: center; white-space: nowrap;">
          <button class="btn btn-outline btn-edit-global-q" data-qid="${q.id}" style="padding: 0.25rem 0.5rem; font-size: 0.8rem; margin-right: 0.35rem; color: var(--primary);"><i data-lucide="edit"></i> Sửa</button>
          <button class="btn btn-outline btn-delete-global-q" data-qid="${q.id}" style="padding: 0.25rem 0.5rem; font-size: 0.8rem; color: var(--danger);"><i data-lucide="trash-2"></i> Xóa</button>
        </td>
      `;
      tbody.appendChild(tr);
    });
  }

  renderPaginationUI('pagination-global-bank', totalPages, st.currentPage, (newPage) => {
    st.currentPage = newPage;
    renderGlobalQuestionBank();
  });

  if (typeof lucide !== 'undefined') lucide.createIcons();
}

/**
 * Mở Modal Thêm mới câu hỏi
 */
function openCreateGlobalQuestionModal() {
  const setVal = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.value = val;
  };

  setVal('q-form-id', '');
  setVal('q-form-text', '');
  setVal('q-form-opt0', '');
  setVal('q-form-opt1', '');
  setVal('q-form-opt2', '');
  setVal('q-form-opt3', '');
  setVal('q-form-correct', '0');
  setVal('q-form-explanation', '');
  setVal('q-form-topic', 'Lập trình Web');
  setVal('q-form-difficulty', 'Medium');

  const titleEl = document.getElementById('modal-question-title');
  if (titleEl) titleEl.textContent = 'Thêm Câu Hỏi Mới Vào Ngân Hàng';

  document.getElementById('modal-question-form')?.classList.remove('hidden');
}

/**
 * Mở Modal Chỉnh sửa câu hỏi
 */
function openEditGlobalQuestionModal(qId) {
  extractGlobalQuestions();
  const targetQ = window.AppState.allQuestions.find(q => q.id === qId);
  if (!targetQ) return;

  const setVal = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.value = val;
  };

  setVal('q-form-id', targetQ.id);
  setVal('q-form-text', targetQ.question);
  setVal('q-form-opt0', targetQ.options[0] || '');
  setVal('q-form-opt1', targetQ.options[1] || '');
  setVal('q-form-opt2', targetQ.options[2] || '');
  setVal('q-form-opt3', targetQ.options[3] || '');
  setVal('q-form-correct', Array.isArray(targetQ.correctAnswer) ? targetQ.correctAnswer[0] : 0);
  setVal('q-form-explanation', targetQ.explanation || '');
  setVal('q-form-topic', targetQ.topic || 'Lập trình Web');
  setVal('q-form-difficulty', targetQ.difficulty || 'Medium');

  const titleEl = document.getElementById('modal-question-title');
  if (titleEl) titleEl.textContent = 'Chỉnh Sửa Câu Hỏi Trong Ngân Hàng';

  document.getElementById('modal-question-form')?.classList.remove('hidden');
}

/**
 * Đóng Modal Câu hỏi
 */
function closeQuestionModal() {
  document.getElementById('modal-question-form')?.classList.add('hidden');
}

/**
 * Lưu Dữ liệu Câu Hỏi (Xử lý Thêm / Sửa)
 */
function saveQuestionFromModal() {
  const qId = document.getElementById('q-form-id')?.value;
  const questionText = document.getElementById('q-form-text')?.value.trim();
  const opt0 = document.getElementById('q-form-opt0')?.value.trim();
  const opt1 = document.getElementById('q-form-opt1')?.value.trim();
  const opt2 = document.getElementById('q-form-opt2')?.value.trim();
  const opt3 = document.getElementById('q-form-opt3')?.value.trim();
  const correctIdx = parseInt(document.getElementById('q-form-correct')?.value || '0');
  const explanation = document.getElementById('q-form-explanation')?.value.trim();
  const topic = document.getElementById('q-form-topic')?.value || 'Lập trình Web';
  const difficulty = document.getElementById('q-form-difficulty')?.value || 'Medium';

  if (!questionText || !opt0 || !opt1) {
    if (typeof Swal !== 'undefined') Swal.fire({ icon: 'warning', title: 'Vui lòng điền đầy đủ câu hỏi và ít nhất 2 phương án!' });
    return;
  }

  const qData = {
    id: qId || ('q_' + Date.now()),
    topic: topic,
    difficulty: difficulty,
    type: 'single',
    question: questionText,
    options: [opt0, opt1, opt2, opt3],
    correctAnswer: [correctIdx],
    explanation: explanation
  };

  if (qId) {
    // Cập nhật câu hỏi trong tất cả đề thi có chứa nó
    window.AppState.allQuizzes.forEach(quiz => {
      if (quiz.questions) {
        const idx = quiz.questions.findIndex(q => q.id === qId);
        if (idx !== -1) quiz.questions[idx] = { ...quiz.questions[idx], ...qData };
      }
    });
  } else {
    // Tạo mới: Thêm vào bài thi mặc định đầu tiên hoặc tạo bài thi chứa ngân hàng
    if (!window.AppState.allQuizzes || window.AppState.allQuizzes.length === 0) {
      window.AppState.allQuizzes = [{
        id: 'quiz_default',
        title: 'Kho câu hỏi chung',
        topic: topic,
        difficulty: difficulty,
        timeLimit: 15,
        questions: []
      }];
    }
    window.AppState.allQuizzes[0].questions.push(qData);
  }

  saveQuizzesAndQuestionsToStorage();
  closeQuestionModal();
  renderGlobalQuestionBank();

  if (typeof Swal !== 'undefined') {
    Swal.fire({ icon: 'success', title: qId ? 'Đã cập nhật câu hỏi!' : 'Thêm câu hỏi mới thành công!' });
  }
}

function openSelectFromBankModal() {
  const activeQuizId = window.AppState.selectedQuizIdForAdmin;
  const quiz = window.AppState.allQuizzes.find(q => q.id === activeQuizId);
  if (!quiz) return;

  extractGlobalQuestions();

  const existingQIds = new Set((quiz.questions || []).map(q => q.id));
  const availableBankQs = window.AppState.allQuestions.filter(q => !existingQIds.has(q.id));

  const tbody = document.getElementById('bank-questions-select-tbody');
  if (!tbody) return;
  tbody.innerHTML = '';

  const st = window.AppState.listsState.modalBank;
  st.searchText = document.getElementById('search-modal-bank')?.value.trim().toLowerCase() || '';
  st.sort = document.getElementById('sort-modal-bank')?.value || 'TITLE_ASC';
  st.pageSize = document.getElementById('pagesize-modal-bank')?.value || '10';

  let filtered = availableBankQs.filter(q => !st.searchText || q.question.toLowerCase().includes(st.searchText));

  if (st.sort === 'TITLE_ASC') filtered.sort((a, b) => a.question.localeCompare(b.question));
  else if (st.sort === 'TITLE_DESC') filtered.sort((a, b) => b.question.localeCompare(a.question));

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
    tbody.innerHTML = `<tr><td colspan="4" style="text-align: center; padding: 1.5rem; color: var(--text-muted);">Không có câu hỏi nào khớp bộ lọc.</td></tr>`;
  } else {
    pagedData.forEach(q => {
      const tr = document.createElement('tr');
      tr.style.borderBottom = '1px solid var(--border-color)';
      tr.innerHTML = `
        <td style="padding: 0.75rem; text-align: center;"><input type="checkbox" class="chk-bank-q" value="${q.id}"></td>
        <td style="padding: 0.75rem; font-family: var(--font-family-mono); color: var(--text-muted);">${q.id}</td>
        <td style="padding: 0.75rem;">${q.question}</td>
        <td style="padding: 0.75rem;"><span class="tag tag-topic">${q.topic}</span></td>
      `;
      tbody.appendChild(tr);
    });
  }

  renderPaginationUI('pagination-modal-bank', totalPages, st.currentPage, (newPage) => {
    st.currentPage = newPage;
    openSelectFromBankModal();
  });

  document.getElementById('modal-select-from-bank')?.classList.remove('hidden');
}

function deleteQuestionFromGlobalBank(qId) {
  const performDelete = () => {
    window.AppState.allQuizzes.forEach(quiz => {
      if (quiz.questions) quiz.questions = quiz.questions.filter(q => q.id !== qId);
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