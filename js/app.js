/* ==========================================================================
   Adaptive Quiz System - SPA Router & App Central Manager (js/app.js)
   ========================================================================== */

window.AppState = {
  currentUser: null,
  allQuizzes: [],
  allQuestions: [],
  currentQuiz: null,
  currentQuestions: [],
  currentQuestionIndex: 0,
  answers: {},
  timerInterval: null,
  timeRemaining: 0,
  quizResults: null,
  aiQuestions: null,
  selectedQuizIdForAdmin: null,
  
  settings: {
    topics: ["HTML5 Basic", "HTML5 Semantic", "CSS3 Selectors", "CSS3 Flexbox", "CSS3 Grid", "JS Basics", "JS DOM Manipulation"],
    difficulties: ["Easy", "Medium", "Hard"]
  }
};

document.addEventListener('DOMContentLoaded', async () => {
  loadAdminSettings();
  await window.Auth.init();
  await loadQuestionsData();

  const user = window.Auth.getCurrentUser();
  updateNavUI(user);

  if (user) {
    if (user.role === 'admin') {
      renderAdminDashboard();
      navigateTo('view-admin');
    } else {
      navigateTo('view-list');
    }
  } else {
    navigateTo('view-auth');
  }

  bindEvents();
});

function loadAdminSettings() {
  const savedSettings = localStorage.getItem('adaptive_quiz_settings');
  if (savedSettings) {
    window.AppState.settings = JSON.parse(savedSettings);
  } else {
    localStorage.setItem('adaptive_quiz_settings', JSON.stringify(window.AppState.settings));
  }
  updateFilterOptionsUI();
}

function saveAdminSettings() {
  localStorage.setItem('adaptive_quiz_settings', JSON.stringify(window.AppState.settings));
  updateFilterOptionsUI();
}

function updateFilterOptionsUI() {
  const topicSelect = document.getElementById('filter-topic');
  if (topicSelect) {
    topicSelect.innerHTML = `<option value="ALL">Tất cả Chủ đề</option>`;
    window.AppState.settings.topics.forEach(t => {
      topicSelect.innerHTML += `<option value="${t}">${t}</option>`;
    });
  }

  const diffSelect = document.getElementById('filter-difficulty');
  if (diffSelect) {
    diffSelect.innerHTML = `<option value="ALL">Tất cả Độ khó</option>`;
    window.AppState.settings.difficulties.forEach(d => {
      diffSelect.innerHTML += `<option value="${d}">${d}</option>`;
    });
  }
}

async function loadQuestionsData() {
  try {
    const savedQuizzes = localStorage.getItem('adaptive_quizzes');
    if (savedQuizzes) {
      window.AppState.allQuizzes = JSON.parse(savedQuizzes);
    } else {
      const response = await fetch('data/questions.json');
      if (response.ok) {
        window.AppState.allQuestions = await response.json();
        groupQuestionsIntoQuizzes();
      }
    }
    extractGlobalQuestions();
    renderQuizCatalog(window.AppState.allQuizzes);
  } catch (err) {
    console.error("Lỗi khi tải dữ liệu bài thi:", err);
  }
}

function extractGlobalQuestions() {
  let questionsMap = new Map();
  window.AppState.allQuizzes.forEach(quiz => {
    if (quiz.questions) {
      quiz.questions.forEach(q => {
        if (!questionsMap.has(q.id)) {
          questionsMap.set(q.id, q);
        }
      });
    }
  });
  window.AppState.allQuestions = Array.from(questionsMap.values());
}

function groupQuestionsIntoQuizzes() {
  const groups = {};
  window.AppState.allQuestions.forEach(q => {
    const key = q.subTopic || `${q.topic}_${q.difficulty}`;
    if (!groups[key]) {
      groups[key] = {
        id: `quiz_${q.topic.toLowerCase().replace(/\s+/g, '_')}_${q.id.split('_')[2] || Date.now()}`,
        title: q.subTopic || `Bài kiểm tra ${q.topic}`,
        topic: q.topic,
        difficulty: q.difficulty,
        timeLimit: 10,
        questions: []
      };
    }
    groups[key].questions.push(q);
  });

  window.AppState.allQuizzes = Object.values(groups);
  localStorage.setItem('adaptive_quizzes', JSON.stringify(window.AppState.allQuizzes));
}

function saveQuizzesAndQuestionsToStorage() {
  extractGlobalQuestions();
  localStorage.setItem('adaptive_quizzes', JSON.stringify(window.AppState.allQuizzes));
  renderQuizCatalog(window.AppState.allQuizzes);
}

function navigateTo(viewId) {
  document.querySelectorAll('.view-section').forEach(sec => sec.classList.add('hidden'));
  const targetView = document.getElementById(viewId);
  if (targetView) targetView.classList.remove('hidden');
  else document.getElementById('view-list')?.classList.remove('hidden');
}

function updateNavUI(user) {
  const navGuest = document.getElementById('nav-guest');
  const navUser = document.getElementById('nav-user');
  const userFullname = document.getElementById('user-fullname');
  const userRoleBadge = document.getElementById('user-role-badge');

  if (user) {
    navGuest?.classList.add('hidden');
    navUser?.classList.remove('hidden');
    if (userFullname) userFullname.textContent = user.fullName;
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

function filterAndRenderQuizzes() {
  const searchText = document.getElementById('input-search-quiz')?.value.trim().toLowerCase() || '';
  const selectedTopic = document.getElementById('filter-topic')?.value || 'ALL';
  const selectedDifficulty = document.getElementById('filter-difficulty')?.value || 'ALL';

  const filteredQuizzes = window.AppState.allQuizzes.filter(quiz => {
    const matchesSearch = searchText === '' || quiz.title.toLowerCase().includes(searchText) || quiz.topic.toLowerCase().includes(searchText);
    const matchesTopic = (selectedTopic === 'ALL') || quiz.topic.toLowerCase().includes(selectedTopic.toLowerCase());
    const matchesDifficulty = (selectedDifficulty === 'ALL') || (quiz.difficulty.toLowerCase() === selectedDifficulty.toLowerCase());
    return matchesSearch && matchesTopic && matchesDifficulty;
  });

  renderQuizCatalog(filteredQuizzes);
}

function renderQuizCatalog(quizzes) {
  const container = document.getElementById('quiz-grid-container');
  const countBadge = document.getElementById('quiz-count-badge');
  if (!container) return;
  container.innerHTML = '';
  
  if (countBadge) countBadge.textContent = `${quizzes.length} đề thi`;

  if (quizzes.length === 0) {
    container.innerHTML = `<div style="grid-column: 1/-1; text-align: center; padding: 3rem 1rem; color: var(--text-muted);"><p>Không tìm thấy bài kiểm tra nào!</p></div>`;
    return;
  }

  quizzes.forEach(quiz => {
    const card = document.createElement('div');
    card.className = 'quiz-card';
    card.innerHTML = `
      <div>
        <div class="quiz-card-header">
          <span class="tag tag-topic">${quiz.topic}</span>
          <span class="badge badge-student">${quiz.difficulty}</span>
        </div>
        <h4 class="quiz-card-title">${quiz.title}</h4>
        <div class="quiz-card-meta">
          <span><i data-lucide="help-circle"></i> ${quiz.questions ? quiz.questions.length : 0} câu</span>
          <span><i data-lucide="clock"></i> ${quiz.timeLimit} phút</span>
        </div>
      </div>
      <button class="btn btn-primary btn-block btn-start-quiz" data-quiz-id="${quiz.id}">Bắt Đầu Làm Bài</button>
    `;
    container.appendChild(card);
  });

  if (typeof lucide !== 'undefined') lucide.createIcons();
}

function renderAdminDashboard() {
  const topicsContainer = document.getElementById('admin-topics-list');
  if (topicsContainer) {
    topicsContainer.innerHTML = '';
    window.AppState.settings.topics.forEach(t => {
      topicsContainer.innerHTML += `
        <div class="tag tag-topic" style="display: inline-flex; align-items: center; gap: 0.5rem;">
          <span>${t}</span>
          <i data-lucide="x" class="btn-delete-topic" data-name="${t}" style="cursor: pointer; width: 0.9rem; height: 0.9rem; color: var(--danger);"></i>
        </div>`;
    });
  }

  const diffsContainer = document.getElementById('admin-difficulties-list');
  if (diffsContainer) {
    diffsContainer.innerHTML = '';
    window.AppState.settings.difficulties.forEach(d => {
      diffsContainer.innerHTML += `
        <div class="badge badge-student" style="display: inline-flex; align-items: center; gap: 0.5rem;">
          <span>${d}</span>
          <i data-lucide="x" class="btn-delete-difficulty" data-name="${d}" style="cursor: pointer; width: 0.9rem; height: 0.9rem; color: var(--danger);"></i>
        </div>`;
    });
  }

  renderAdminQuizzesTable();
  if (typeof lucide !== 'undefined') lucide.createIcons();
}

function renderAdminQuizzesTable() {
  const tbody = document.getElementById('admin-quizzes-tbody');
  if (!tbody) return;
  tbody.innerHTML = '';

  window.AppState.allQuizzes.forEach(quiz => {
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
        <button class="btn btn-outline btn-manage-quiz-qs" data-id="${quiz.id}" style="padding: 0.25rem 0.5rem; font-size: 0.8rem; margin-right: 0.35rem; color: var(--accent-ai);">
          <i data-lucide="list-checks"></i> Quản Lý Câu Hỏi
        </button>
        <button class="btn btn-outline btn-edit-quiz-info" data-id="${quiz.id}" style="padding: 0.25rem 0.5rem; font-size: 0.8rem; margin-right: 0.35rem; color: var(--primary);">
          <i data-lucide="edit"></i> Sửa
        </button>
        <button class="btn btn-outline btn-delete-quiz" data-id="${quiz.id}" style="padding: 0.25rem 0.5rem; font-size: 0.8rem; color: var(--danger);">
          <i data-lucide="trash-2"></i> Xóa
        </button>
      </td>
    `;
    tbody.appendChild(tr);
  });

  if (typeof lucide !== 'undefined') lucide.createIcons();
}

function renderGlobalQuestionBank() {
  const tbody = document.getElementById('admin-global-questions-tbody');
  if (!tbody) return;
  tbody.innerHTML = '';

  extractGlobalQuestions();

  if (window.AppState.allQuestions.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; padding: 1.5rem; color: var(--text-muted);">Ngân hàng chưa có câu hỏi nào.</td></tr>`;
    return;
  }

  window.AppState.allQuestions.forEach(q => {
    const tr = document.createElement('tr');
    tr.style.borderBottom = '1px solid var(--border-color)';
    tr.innerHTML = `
      <td style="padding: 0.75rem; font-family: var(--font-family-mono); color: var(--text-muted);">${q.id}</td>
      <td style="padding: 0.75rem;"><span class="tag tag-topic">${q.topic}</span></td>
      <td style="padding: 0.75rem;"><span class="badge badge-student">${q.difficulty}</span></td>
      <td style="padding: 0.75rem;">${q.question}</td>
      <td style="padding: 0.75rem; color: var(--success); font-weight: 600;">${q.options[q.correctAnswer[0]] || 'N/A'}</td>
    `;
    tbody.appendChild(tr);
  });
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

  if (!quiz.questions || quiz.questions.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; padding: 1.5rem; color: var(--text-muted);">Bài thi này chưa có câu hỏi. Hãy thêm mới hoặc chọn từ ngân hàng.</td></tr>`;
    return;
  }

  quiz.questions.forEach((q, idx) => {
    const tr = document.createElement('tr');
    tr.style.borderBottom = '1px solid var(--border-color)';
    tr.innerHTML = `
      <td style="padding: 0.75rem;">${idx + 1}</td>
      <td style="padding: 0.75rem; font-family: var(--font-family-mono); color: var(--text-muted);">${q.id}</td>
      <td style="padding: 0.75rem;">${q.question}</td>
      <td style="padding: 0.75rem; color: var(--success); font-weight: 600;">${q.options[q.correctAnswer[0]] || 'N/A'}</td>
      <td style="padding: 0.75rem; text-align: center; white-space: nowrap;">
        <button class="btn btn-outline btn-edit-q-in-quiz" data-qid="${q.id}" style="padding: 0.25rem 0.5rem; font-size: 0.8rem; margin-right: 0.35rem; color: var(--primary);">
          <i data-lucide="edit"></i> Sửa
        </button>
        <button class="btn btn-outline btn-remove-q-from-quiz" data-qid="${q.id}" style="padding: 0.25rem 0.5rem; font-size: 0.8rem; color: var(--danger);">
          <i data-lucide="trash-2"></i> Gỡ
        </button>
      </td>
    `;
    tbody.appendChild(tr);
  });

  if (typeof lucide !== 'undefined') lucide.createIcons();
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

  if (availableBankQs.length === 0) {
    tbody.innerHTML = `<tr><td colspan="4" style="text-align: center; padding: 1.5rem; color: var(--text-muted);">Tất cả câu hỏi trong ngân hàng đều đã có trong bài thi này.</td></tr>`;
  } else {
    availableBankQs.forEach(q => {
      const tr = document.createElement('tr');
      tr.style.borderBottom = '1px solid var(--border-color)';
      tr.innerHTML = `
        <td style="padding: 0.75rem; text-align: center;">
          <input type="checkbox" class="chk-bank-q" value="${q.id}">
        </td>
        <td style="padding: 0.75rem; font-family: var(--font-family-mono); color: var(--text-muted);">${q.id}</td>
        <td style="padding: 0.75rem;">${q.question}</td>
        <td style="padding: 0.75rem;"><span class="tag tag-topic">${q.topic}</span></td>
      `;
      tbody.appendChild(tr);
    });
  }

  document.getElementById('modal-select-from-bank')?.classList.remove('hidden');
}

function setupAdminTabs() {
  const tabBtns = document.querySelectorAll('.admin-tab-btn');
  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      tabBtns.forEach(b => {
        b.classList.remove('active', 'btn-primary');
        b.classList.add('btn-outline');
      });
      btn.classList.add('active', 'btn-primary');
      btn.classList.remove('btn-outline');

      const targetTab = btn.getAttribute('data-tab');
      document.querySelectorAll('.admin-tab-content').forEach(tab => tab.classList.add('hidden'));
      document.getElementById(targetTab)?.classList.remove('hidden');

      if (targetTab === 'tab-question-bank') renderGlobalQuestionBank();
      if (targetTab === 'tab-users') renderAdminUsersTable();
      if (targetTab === 'tab-reports') renderAdminReports();
      if (targetTab === 'tab-tools') populateRandomQuizForm();
    });
  });
}

function renderAdminUsersTable() {
  const tbody = document.getElementById('admin-users-tbody');
  if (!tbody) return;
  tbody.innerHTML = '';

  const users = window.Auth ? window.Auth.getUsers() : JSON.parse(localStorage.getItem('app_users') || '[]');

  users.forEach(u => {
    const tr = document.createElement('tr');
    tr.style.borderBottom = '1px solid var(--border-color)';
    const isLocked = u.status === 'locked';

    tr.innerHTML = `
      <td style="padding: 0.75rem; font-family: var(--font-family-mono); font-weight: 600;">${u.username}</td>
      <td style="padding: 0.75rem;">${u.fullName}</td>
      <td style="padding: 0.75rem;">
        <span class="badge ${u.role === 'admin' ? 'badge-admin' : 'badge-student'}">${u.role.toUpperCase()}</span>
      </td>
      <td style="padding: 0.75rem;">
        <span style="color: ${isLocked ? 'var(--danger)' : 'var(--success)'}; font-weight: 600;">
          ${isLocked ? 'Đã khóa' : 'Hoạt động'}
        </span>
      </td>
      <td style="padding: 0.75rem; text-align: center; white-space: nowrap;">
        <button class="btn btn-outline btn-toggle-role" data-username="${u.username}" style="padding: 0.25rem 0.5rem; font-size: 0.8rem; margin-right: 0.35rem; color: var(--accent-ai);">
          <i data-lucide="shield"></i> Đổi Role
        </button>
        <button class="btn btn-outline btn-toggle-status" data-username="${u.username}" style="padding: 0.25rem 0.5rem; font-size: 0.8rem; color: ${isLocked ? 'var(--success)' : 'var(--danger)'};">
          <i data-lucide="${isLocked ? 'unlock' : 'lock'}"></i> ${isLocked ? 'Mở Khóa' : 'Khóa'}
        </button>
      </td>
    `;
    tbody.appendChild(tr);
  });

  if (typeof lucide !== 'undefined') lucide.createIcons();
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
  }

  if (!historyTbody) return;
  historyTbody.innerHTML = '';

  if (history.length === 0) {
    historyTbody.innerHTML = `<tr><td colspan="5" style="text-align: center; padding: 1.5rem; color: var(--text-muted);">Chưa có lượt nộp bài nào.</td></tr>`;
    return;
  }

  history.forEach(item => {
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

function populateRandomQuizForm() {
  const select = document.getElementById('random-topic-select');
  if (select) {
    select.innerHTML = '';
    window.AppState.settings.topics.forEach(t => {
      select.innerHTML += `<option value="${t}">${t}</option>`;
    });
  }
}

function populateQuizModalSelects() {
  const tSelect = document.getElementById('quiz-form-topic-select');
  if (tSelect) {
    tSelect.innerHTML = '';
    window.AppState.settings.topics.forEach(t => {
      tSelect.innerHTML += `<option value="${t}">${t}</option>`;
    });
  }

  const dSelect = document.getElementById('quiz-form-diff-select');
  if (dSelect) {
    dSelect.innerHTML = '';
    window.AppState.settings.difficulties.forEach(d => {
      dSelect.innerHTML += `<option value="${d}">${d}</option>`;
    });
  }
}

function bindEvents() {
  setupAdminTabs();

  document.getElementById('link-to-register')?.addEventListener('click', (e) => {
    e.preventDefault();
    document.getElementById('form-login-box')?.classList.add('hidden');
    document.getElementById('form-register-box')?.classList.remove('hidden');
  });

  document.getElementById('link-to-login')?.addEventListener('click', (e) => {
    e.preventDefault();
    document.getElementById('form-register-box')?.classList.add('hidden');
    document.getElementById('form-login-box')?.classList.remove('hidden');
  });

  document.getElementById('form-login')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const u = document.getElementById('login-username').value;
    const p = document.getElementById('login-password').value;
    const user = window.Auth.login(u, p);

    if (user) {
      updateNavUI(user);
      if (user.role === 'admin') {
        renderAdminDashboard();
        navigateTo('view-admin');
      } else {
        navigateTo('view-list');
      }
      Swal.fire({ icon: 'success', title: 'Đăng nhập thành công!', timer: 1200, showConfirmButton: false });
    } else {
      Swal.fire({ icon: 'error', title: 'Thất bại', text: 'Sai tên đăng nhập hoặc mật khẩu!' });
    }
  });

  document.getElementById('form-register')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const fn = document.getElementById('reg-fullname').value;
    const u = document.getElementById('reg-username').value;
    const p = document.getElementById('reg-password').value;
    
    const res = window.Auth.register(fn, u, p);
    if (res.success) {
      Swal.fire({ icon: 'success', title: 'Thành công', text: res.message });
      document.getElementById('form-register-box')?.classList.add('hidden');
      document.getElementById('form-login-box')?.classList.remove('hidden');
    } else {
      Swal.fire({ icon: 'error', title: 'Lỗi', text: res.message });
    }
  });

  document.getElementById('btn-logout')?.addEventListener('click', () => {
    window.Auth.logout();
    updateNavUI(null);
    navigateTo('view-auth');
  });

  document.getElementById('input-search-quiz')?.addEventListener('input', filterAndRenderQuizzes);
  document.getElementById('filter-topic')?.addEventListener('change', filterAndRenderQuizzes);
  document.getElementById('filter-difficulty')?.addEventListener('change', filterAndRenderQuizzes);

  document.getElementById('btn-admin-import-from-bank')?.addEventListener('click', openSelectFromBankModal);
  
  document.getElementById('btn-cancel-bank-select')?.addEventListener('click', () => {
    document.getElementById('modal-select-from-bank')?.classList.add('hidden');
  });

  document.getElementById('chk-select-all-bank')?.addEventListener('change', (e) => {
    const isChecked = e.target.checked;
    document.querySelectorAll('.chk-bank-q').forEach(chk => chk.checked = isChecked);
  });

  document.getElementById('btn-confirm-bank-select')?.addEventListener('click', () => {
    const activeQuizId = window.AppState.selectedQuizIdForAdmin;
    const quiz = window.AppState.allQuizzes.find(q => q.id === activeQuizId);
    if (!quiz) return;

    const selectedCheckboxes = document.querySelectorAll('.chk-bank-q:checked');
    if (selectedCheckboxes.length === 0) {
      Swal.fire({ icon: 'info', title: 'Vui lòng chọn ít nhất 1 câu hỏi!' });
      return;
    }

    if (!quiz.questions) quiz.questions = [];

    selectedCheckboxes.forEach(chk => {
      const qid = chk.value;
      const bankQ = window.AppState.allQuestions.find(q => q.id === qid);
      if (bankQ) {
        quiz.questions.push(JSON.parse(JSON.stringify(bankQ)));
      }
    });

    saveQuizzesAndQuestionsToStorage();
    document.getElementById('modal-select-from-bank')?.classList.add('hidden');
    renderSelectedQuizQuestions(activeQuizId);
    renderAdminQuizzesTable();
    Swal.fire({ icon: 'success', title: 'Đã thêm các câu hỏi được chọn vào bài thi!' });
  });

  document.getElementById('admin-topics-list')?.addEventListener('click', (e) => {
    const btn = e.target.closest('.btn-delete-topic');
    if (btn) {
      const topicName = btn.getAttribute('data-name');
      window.AppState.settings.topics = window.AppState.settings.topics.filter(t => t !== topicName);
      saveAdminSettings();
      renderAdminDashboard();
    }
  });

  document.getElementById('admin-difficulties-list')?.addEventListener('click', (e) => {
    const btn = e.target.closest('.btn-delete-difficulty');
    if (btn) {
      const diffName = btn.getAttribute('data-name');
      window.AppState.settings.difficulties = window.AppState.settings.difficulties.filter(d => d !== diffName);
      saveAdminSettings();
      renderAdminDashboard();
    }
  });

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
      const newQuiz = {
        id: `quiz_${Date.now()}`,
        title: title,
        topic: topic,
        difficulty: difficulty,
        timeLimit: timeLimit,
        questions: []
      };
      window.AppState.allQuizzes.unshift(newQuiz);
    }

    saveQuizzesAndQuestionsToStorage();
    document.getElementById('modal-quiz-form')?.classList.add('hidden');
    renderAdminQuizzesTable();
    Swal.fire({ icon: 'success', title: 'Thành công', text: qId ? 'Đã cập nhật bài thi!' : 'Đã tạo bài thi mới!' });
  });

  document.getElementById('admin-quizzes-tbody')?.addEventListener('click', (e) => {
    const btnManage = e.target.closest('.btn-manage-quiz-qs');
    const btnEdit = e.target.closest('.btn-edit-quiz-info');
    const btnDelete = e.target.closest('.btn-delete-quiz');

    if (btnManage) {
      const quizId = btnManage.getAttribute('data-id');
      renderSelectedQuizQuestions(quizId);
    }

    if (btnEdit) {
      const quizId = btnEdit.getAttribute('data-id');
      const quiz = window.AppState.allQuizzes.find(q => q.id === quizId);
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

  document.getElementById('form-manage-question')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const activeQuizId = window.AppState.selectedQuizIdForAdmin;
    const quiz = window.AppState.allQuizzes.find(q => q.id === activeQuizId);
    if (!quiz) return;

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
      const targetQ = quiz.questions.find(q => q.id === qId);
      if (targetQ) {
        targetQ.question = qText;
        targetQ.options = opts;
        targetQ.correctAnswer = correct;
        targetQ.explanation = explanation;
      }
    } else {
      const newQuestion = {
        id: `q_${Date.now()}`,
        topic: quiz.topic,
        subTopic: quiz.title,
        difficulty: quiz.difficulty,
        type: "single",
        question: qText,
        options: opts,
        correctAnswer: correct,
        explanation: explanation
      };
      if (!quiz.questions) quiz.questions = [];
      quiz.questions.push(newQuestion);
    }

    saveQuizzesAndQuestionsToStorage();
    document.getElementById('modal-question-form')?.classList.add('hidden');
    renderSelectedQuizQuestions(activeQuizId);
    renderAdminQuizzesTable();
    Swal.fire({ icon: 'success', title: 'Thành công', text: 'Đã cập nhật câu hỏi!' });
  });

  document.getElementById('admin-quiz-questions-tbody')?.addEventListener('click', (e) => {
    const btnEdit = e.target.closest('.btn-edit-q-in-quiz');
    const btnRemove = e.target.closest('.btn-remove-q-from-quiz');
    const activeQuizId = window.AppState.selectedQuizIdForAdmin;
    const quiz = window.AppState.allQuizzes.find(q => q.id === activeQuizId);
    if (!quiz) return;

    if (btnEdit) {
      const qid = btnEdit.getAttribute('data-qid');
      const q = quiz.questions.find(item => item.id === qid);
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

  document.getElementById('quiz-grid-container')?.addEventListener('click', (e) => {
    const btn = e.target.closest('.btn-start-quiz');
    if (btn) {
      const qId = btn.getAttribute('data-quiz-id');
      startQuizExecution(qId);
    }
  });

  document.getElementById('btn-prev-question')?.addEventListener('click', () => {
    if (window.AppState.currentQuestionIndex > 0) {
      window.AppState.currentQuestionIndex--;
      renderCurrentQuestion();
    }
  });

  document.getElementById('btn-next-question')?.addEventListener('click', () => {
    if (window.AppState.currentQuestionIndex < window.AppState.currentQuestions.length - 1) {
      window.AppState.currentQuestionIndex++;
      renderCurrentQuestion();
    }
  });

  document.getElementById('btn-submit-quiz')?.addEventListener('click', () => {
    finishAndEvaluateQuiz();
  });

  document.getElementById('btn-trigger-ai')?.addEventListener('click', async () => {
    const wrongQs = window.AppState.quizResults?.wrongQuestions || [];
    if (wrongQs.length === 0) {
      Swal.fire({ icon: 'info', title: 'Tuyệt vời!', text: 'Bạn không làm sai câu nào.' });
      return;
    }

    document.getElementById('ai-loading-modal')?.classList.remove('hidden');
    const aiQuestions = await window.AIService.generateRemediationQuiz(wrongQs);
    document.getElementById('ai-loading-modal')?.classList.add('hidden');

    if (aiQuestions && aiQuestions.length > 0) {
      window.AppState.currentQuestions = aiQuestions;
      window.AppState.currentQuestionIndex = 0;
      window.AppState.answers = {};
      navigateTo('view-quiz');
      renderCurrentQuestion();
      window.QuizEngine.startTimer(aiQuestions.length * 60, (timeStr) => { 
        document.getElementById('countdown-timer').textContent = timeStr; 
      }, () => { finishAndEvaluateQuiz(); });
    }
  });

  document.getElementById('btn-return-catalog')?.addEventListener('click', () => {
    navigateTo('view-list');
  });
}

function startQuizExecution(quizId) {
  const quiz = window.AppState.allQuizzes.find(q => q.id === quizId);
  if (!quiz) return;

  window.AppState.currentQuiz = quiz;
  window.AppState.currentQuestions = quiz.questions;
  window.AppState.currentQuestionIndex = 0;
  window.AppState.answers = {};

  const titleEl = document.getElementById('current-quiz-title');
  if (titleEl) titleEl.textContent = quiz.title;
  
  navigateTo('view-quiz');
  renderCurrentQuestion();

  window.QuizEngine.startTimer(quiz.timeLimit * 60, (timeStr) => { 
    document.getElementById('countdown-timer').textContent = timeStr; 
  }, () => { finishAndEvaluateQuiz(); });
}

function renderCurrentQuestion() {
  const qList = window.AppState.currentQuestions;
  const idx = window.AppState.currentQuestionIndex;
  const q = qList[idx];

  if (!q) return;

  const trackerEl = document.getElementById('question-tracker');
  if (trackerEl) trackerEl.textContent = `Câu ${idx + 1} / ${qList.length}`;
  
  const progressPercent = Math.round(((idx + 1) / qList.length) * 100);
  const progressBar = document.getElementById('quiz-progress-bar');
  if (progressBar) progressBar.style.width = `${progressPercent}%`;

  document.getElementById('question-topic-tag').textContent = q.topic;
  document.getElementById('question-type-tag').textContent = q.type === 'single' ? 'Radio (Chọn 1)' : 'Checkbox (Chọn nhiều)';
  document.getElementById('question-text').textContent = q.question;

  const container = document.getElementById('options-container');
  if (!container) return;
  container.innerHTML = '';
  
  const currentSavedAnswers = window.AppState.answers[q.id] || [];

  q.options.forEach((optText, optIdx) => {
    const item = document.createElement('label');
    item.className = 'option-item';
    const isChecked = currentSavedAnswers.includes(optIdx);
    if (isChecked) item.classList.add('selected');

    const inputType = q.type === 'single' ? 'radio' : 'checkbox';
    item.innerHTML = `
      <input type="${inputType}" name="q_options" value="${optIdx}" ${isChecked ? 'checked' : ''}>
      <span>${optText}</span>
    `;

    item.addEventListener('change', () => {
      const inputs = container.querySelectorAll('input:checked');
      const selectedIndices = Array.from(inputs).map(inp => parseInt(inp.value));
      window.QuizEngine.recordAnswer(q.id, selectedIndices);
      
      container.querySelectorAll('.option-item').forEach(el => el.classList.remove('selected'));
      container.querySelectorAll('input:checked').forEach(inp => inp.closest('.option-item')?.classList.add('selected'));
    });

    container.appendChild(item);
  });

  document.getElementById('btn-prev-question').disabled = (idx === 0);
  document.getElementById('btn-next-question').disabled = (idx === qList.length - 1);
}

function finishAndEvaluateQuiz() {
  window.QuizEngine.stopTimer();
  const results = window.QuizEngine.evaluateQuiz(window.AppState.currentQuestions, window.AppState.answers);

  document.getElementById('result-score-number').textContent = results.score;
  document.getElementById('result-quiz-name').textContent = `Chủ đề: ${window.AppState.currentQuiz?.title || 'Luyện tập AI'}`;

  window.QuizEngine.renderChart('skills-chart', results.topicStats);
  renderWrongQuestionsReview(results.wrongQuestions);

  const historyAll = JSON.parse(localStorage.getItem('quiz_history_all') || '[]');
  const currentUser = window.Auth.getCurrentUser();
  historyAll.unshift({
    timestamp: new Date().toLocaleString('vi-VN'),
    username: currentUser ? currentUser.fullName : 'Học viên',
    quizTitle: window.AppState.currentQuiz?.title || 'Luyện tập AI',
    score: results.score,
    correctCount: results.correctCount
  });
  localStorage.setItem('quiz_history_all', JSON.stringify(historyAll));

  if (results.score >= 8.0 && typeof confetti === 'function') {
    confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
  }

  navigateTo('view-result');
}

function renderWrongQuestionsReview(wrongQs) {
  const container = document.getElementById('wrong-questions-container');
  if (!container) return;
  container.innerHTML = '';

  if (wrongQs.length === 0) {
    container.innerHTML = `<div class="question-card" style="border-left: 4px solid var(--success); text-align: center; padding: 1.5rem;"><h4 style="color: var(--success); margin: 0;">🎉 Bạn đã trả lời chính xác 100%!</h4></div>`;
    return;
  }

  wrongQs.forEach((q, idx) => {
    const card = document.createElement('div');
    card.className = 'question-card';
    card.style.borderLeft = '4px solid var(--danger)';
    card.style.marginBottom = '1rem';

    const userAnsText = (q.userSelection && q.userSelection.length > 0) ? q.userSelection.map(i => q.options[i]).join(', ') : 'Chưa chọn đáp án';
    const correctAnsText = (q.correctAnswer || []).map(i => q.options[i]).join(', ');

    card.innerHTML = `
      <h4 style="font-size: 1rem; font-weight: 600; color: var(--text-main); margin-bottom: 0.5rem;">Câu ${idx + 1}: ${q.question}</h4>
      <p style="color: var(--danger); font-size: 0.9rem; margin-top: 0.35rem;"><strong>❌ Lựa chọn của bạn:</strong> ${userAnsText}</p>
      <p style="color: var(--success); font-size: 0.9rem; margin-top: 0.25rem;"><strong>✅ Đáp án đúng:</strong> ${correctAnsText}</p>
      <div style="color: var(--text-muted); font-size: 0.875rem; margin-top: 0.65rem; background: rgba(0, 0, 0, 0.25); padding: 0.65rem 0.85rem; border-radius: 6px; border: 1px solid var(--border-color);">💡 <strong>Giải thích:</strong> ${q.explanation}</div>
    `;

    container.appendChild(card);
  });
}