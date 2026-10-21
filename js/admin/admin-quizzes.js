/* ==========================================================================
   Adaptive Quiz System - Admin Quizzes Management Module (js/admin/admin-quizzes.js)
   ========================================================================== */

function initAdminQuizzesModule() {
  bindAdminQuizzesEvents();
}

function bindAdminQuizzesEvents() {
  // Lọc & Phân trang Danh sách 2 (Bảng Bài thi)
  bindListEvents(['search-admin-quizzes', 'filter-topic-admin-quizzes', 'sort-admin-quizzes', 'pagesize-admin-quizzes'], 'adminQuizzes', renderAdminQuizzesTable);

  // Lọc & Phân trang Danh sách 6 (Câu hỏi trong Modal)
  bindListEvents(['search-quiz-questions', 'sort-quiz-questions', 'pagesize-quiz-questions'], 'quizQuestions', () => {
    renderSelectedQuizQuestions(window.AppState.selectedQuizIdForAdmin);
  });

  // Modal Đề thi: Tạo mới / Hủy / Submit
  document.getElementById('btn-admin-create-quiz')?.addEventListener('click', () => {
    document.getElementById('form-manage-quiz')?.reset();
    document.getElementById('quiz-form-id').value = '';
    document.getElementById('modal-quiz-title').textContent = 'Tạo Bài Thi Mới';
    populateQuizModalSelects();
    document.getElementById('modal-quiz-form')?.classList.remove('hidden');
  });

  document.getElementById('btn-cancel-quiz-form')?.addEventListener('click', () => {
    document.getElementById('modal-quiz-form')?.classList.add('hidden');
  });

  document.getElementById('form-manage-quiz')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const qId = document.getElementById('quiz-form-id').value;
    const title = document.getElementById('quiz-form-title-input').value;
    const topic = document.getElementById('quiz-form-topic-select').value;
    const difficulty = document.getElementById('quiz-form-diff-select').value;
    const timeLimit = parseInt(document.getElementById('quiz-form-time-input').value);

    if (qId) {
      const quiz = window.AppState.allQuizzes.find(q => q.id === qId);
      if (quiz) {
        quiz.title = title;
        quiz.topic = topic;
        quiz.difficulty = difficulty;
        quiz.timeLimit = timeLimit;
      }
    } else {
      window.AppState.allQuizzes.unshift({
        id: `quiz_${Date.now()}`,
        title, topic, difficulty, timeLimit, questions: []
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
      if (quiz) {
        populateQuizModalSelects();
        document.getElementById('quiz-form-id').value = quiz.id;
        document.getElementById('quiz-form-title-input').value = quiz.title;
        document.getElementById('quiz-form-topic-select').value = quiz.topic;
        document.getElementById('quiz-form-diff-select').value = quiz.difficulty;
        document.getElementById('quiz-form-time-input').value = quiz.timeLimit;
        document.getElementById('modal-quiz-title').textContent = 'Chỉnh Sửa Thông Tin Bài Thi';
        document.getElementById('modal-quiz-form')?.classList.remove('hidden');
      }
    }

    if (btnDelete) {
      const quizId = btnDelete.getAttribute('data-id');
      Swal.fire({
        title: 'Xác nhận xóa bài thi?',
        text: 'Thao tác này sẽ xóa bài thi khỏi hệ thống!',
        icon: 'warning',
        showCancelButton: true
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

  document.getElementById('btn-admin-add-q-to-quiz')?.addEventListener('click', () => {
    if (!window.AppState.selectedQuizIdForAdmin) return;
    document.getElementById('form-manage-question')?.reset();
    document.getElementById('q-form-id').value = '';
    document.getElementById('modal-question-title').textContent = 'Thêm Câu Hỏi Mới Vào Bài Thi';
    document.getElementById('modal-question-form')?.classList.remove('hidden');
  });

  document.getElementById('btn-cancel-q-form')?.addEventListener('click', () => {
    document.getElementById('modal-question-form')?.classList.add('hidden');
  });

  // Form Submit Câu hỏi (Chỉnh sửa chuẩn xác 100%)
  document.getElementById('form-manage-question')?.addEventListener('submit', (e) => {
    e.preventDefault();

    const qId = document.getElementById('q-form-id').value;
    const qText = document.getElementById('q-form-text').value;
    const opts = [
      document.getElementById('q-form-opt0').value,
      document.getElementById('q-form-opt1').value,
      document.getElementById('q-form-opt2').value,
      document.getElementById('q-form-opt3').value
    ];
    const correct = [parseInt(document.getElementById('q-form-correct').value)];
    const explanation = document.getElementById('q-form-explanation').value;

    if (qId) {
      window.AppState.allQuizzes.forEach(quiz => {
        if (quiz.questions) {
          quiz.questions.forEach(q => {
            if (q.id === qId) {
              q.question = qText;
              q.options = opts;
              q.correctAnswer = correct;
              q.explanation = explanation;
            }
          });
        }
      });
    } else {
      const activeQuizId = window.AppState.selectedQuizIdForAdmin;
      const quiz = window.AppState.allQuizzes.find(q => q.id === activeQuizId);
      if (quiz) {
        if (!quiz.questions) quiz.questions = [];
        quiz.questions.push({
          id: `q_${Date.now()}`,
          topic: quiz.topic,
          subTopic: quiz.title,
          difficulty: quiz.difficulty,
          type: "single",
          question: qText,
          options: opts,
          correctAnswer: correct,
          explanation: explanation
        });
      }
    }

    saveQuizzesAndQuestionsToStorage();
    document.getElementById('modal-question-form')?.classList.add('hidden');

    if (window.AppState.selectedQuizIdForAdmin) renderSelectedQuizQuestions(window.AppState.selectedQuizIdForAdmin);
    if (typeof renderGlobalQuestionBank === 'function') renderGlobalQuestionBank();
    renderAdminQuizzesTable();

    Swal.fire({ icon: 'success', title: 'Thành công', text: 'Đã lưu thông tin câu hỏi!' });
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
        document.getElementById('q-form-id').value = q.id;
        document.getElementById('q-form-text').value = q.question;
        document.getElementById('q-form-opt0').value = q.options[0] || '';
        document.getElementById('q-form-opt1').value = q.options[1] || '';
        document.getElementById('q-form-opt2').value = q.options[2] || '';
        document.getElementById('q-form-opt3').value = q.options[3] || '';
        document.getElementById('q-form-correct').value = q.correctAnswer[0] || 0;
        document.getElementById('q-form-explanation').value = q.explanation || '';
        document.getElementById('modal-question-title').textContent = 'Chỉnh Sửa Nội Dung Câu Hỏi';
        document.getElementById('modal-question-form')?.classList.remove('hidden');
      }
    }

    if (btnRemove) {
      const qid = btnRemove.getAttribute('data-qid');
      quiz.questions = quiz.questions.filter(q => q.id !== qid);
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
  tbody.innerHTML = '';

  const st = window.AppState.listsState.adminQuizzes;
  st.searchText = document.getElementById('search-admin-quizzes')?.value.trim().toLowerCase() || '';
  st.topic = document.getElementById('filter-topic-admin-quizzes')?.value || 'ALL';
  st.sort = document.getElementById('sort-admin-quizzes')?.value || 'TITLE_ASC';
  st.pageSize = document.getElementById('pagesize-admin-quizzes')?.value || '10';

  let filtered = window.AppState.allQuizzes.filter(quiz => {
    const title = (quiz.title || '').toLowerCase();
    const topic = (quiz.topic || '').toLowerCase();
    return (!st.searchText || title.includes(st.searchText) || topic.includes(st.searchText)) &&
           (st.topic === 'ALL' || (quiz.topic && quiz.topic.toLowerCase() === st.topic.toLowerCase()));
  });

  if (st.sort === 'TITLE_ASC') filtered.sort((a, b) => a.title.localeCompare(b.title));
  else if (st.sort === 'TITLE_DESC') filtered.sort((a, b) => b.title.localeCompare(a.title));

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
    tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; padding: 1.5rem; color: var(--text-muted);">Không tìm thấy bài thi phù hợp.</td></tr>`;
  } else {
    pagedData.forEach(quiz => {
      const tr = document.createElement('tr');
      tr.style.borderBottom = '1px solid var(--border-color)';
      tr.innerHTML = `
        <td style="padding: 0.75rem; font-family: var(--font-family-mono); color: var(--text-muted);">${quiz.id}</td>
        <td style="padding: 0.75rem; font-weight: 600;">${quiz.title}</td>
        <td style="padding: 0.75rem;"><span class="tag tag-topic">${quiz.topic}</span></td>
        <td style="padding: 0.75rem;"><span class="badge badge-student">${quiz.difficulty}</span></td>
        <td style="padding: 0.75rem;">${quiz.timeLimit} phút</td>
        <td style="padding: 0.75rem; font-weight: bold; color: var(--accent-ai);">${quiz.questions ? quiz.questions.length : 0} câu</td>
        <td style="padding: 0.75rem; text-align: center; white-space: nowrap;">
          <button class="btn btn-outline btn-manage-quiz-qs" data-id="${quiz.id}" style="padding: 0.25rem 0.5rem; font-size: 0.8rem; margin-right: 0.35rem; color: var(--accent-ai);"><i data-lucide="list-checks"></i> Quản Lý Câu Hỏi</button>
          <button class="btn btn-outline btn-edit-quiz-info" data-id="${quiz.id}" style="padding: 0.25rem 0.5rem; font-size: 0.8rem; margin-right: 0.35rem; color: var(--primary);"><i data-lucide="edit"></i> Sửa</button>
          <button class="btn btn-outline btn-delete-quiz" data-id="${quiz.id}" style="padding: 0.25rem 0.5rem; font-size: 0.8rem; color: var(--danger);"><i data-lucide="trash-2"></i> Xóa</button>
        </td>
      `;
      tbody.appendChild(tr);
    });
  }

  renderPaginationUI('pagination-admin-quizzes', totalPages, st.currentPage, (newPage) => {
    st.currentPage = newPage;
    renderAdminQuizzesTable();
  });

  if (typeof lucide !== 'undefined') lucide.createIcons();
}

function renderSelectedQuizQuestions(quizId) {
  const quiz = window.AppState.allQuizzes.find(q => q.id === quizId);
  if (!quiz) return;

  window.AppState.selectedQuizIdForAdmin = quizId;
  document.getElementById('selected-quiz-title-display').textContent = quiz.title;
  document.getElementById('selected-quiz-id-display').textContent = quiz.id;
  document.getElementById('modal-manage-questions')?.classList.remove('hidden');

  const tbody = document.getElementById('admin-quiz-questions-tbody');
  if (!tbody) return;
  tbody.innerHTML = '';

  const st = window.AppState.listsState.quizQuestions;
  st.searchText = document.getElementById('search-quiz-questions')?.value.trim().toLowerCase() || '';
  st.sort = document.getElementById('sort-quiz-questions')?.value || 'TITLE_ASC';
  st.pageSize = document.getElementById('pagesize-quiz-questions')?.value || '10';

  let filtered = (quiz.questions || []).filter(q => !st.searchText || q.question.toLowerCase().includes(st.searchText));

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
    tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; padding: 1.5rem; color: var(--text-muted);">Bài thi này chưa có câu hỏi nào khớp bộ lọc.</td></tr>`;
  } else {
    pagedData.forEach((q, idx) => {
      const tr = document.createElement('tr');
      tr.style.borderBottom = '1px solid var(--border-color)';
      tr.innerHTML = `
        <td style="padding: 0.75rem;">${((st.currentPage - 1) * (parseInt(st.pageSize) || 10)) + idx + 1}</td>
        <td style="padding: 0.75rem; font-family: var(--font-family-mono); color: var(--text-muted);">${q.id}</td>
        <td style="padding: 0.75rem;">${q.question}</td>
        <td style="padding: 0.75rem; color: var(--success); font-weight: 600;">${q.options[q.correctAnswer[0]] || 'N/A'}</td>
        <td style="padding: 0.75rem; text-align: center; white-space: nowrap;">
          <button class="btn btn-outline btn-edit-q-in-quiz" data-qid="${q.id}" style="padding: 0.25rem 0.5rem; font-size: 0.8rem; margin-right: 0.35rem; color: var(--primary);"><i data-lucide="edit"></i> Sửa</button>
          <button class="btn btn-outline btn-remove-q-from-quiz" data-qid="${q.id}" style="padding: 0.25rem 0.5rem; font-size: 0.8rem; color: var(--danger);"><i data-lucide="trash-2"></i> Gỡ</button>
        </td>
      `;
      tbody.appendChild(tr);
    });
  }

  renderPaginationUI('pagination-quiz-questions', totalPages, st.currentPage, (newPage) => {
    st.currentPage = newPage;
    renderSelectedQuizQuestions(quizId);
  });

  if (typeof lucide !== 'undefined') lucide.createIcons();
}