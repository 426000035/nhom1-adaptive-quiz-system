/* ==========================================================================
   Adaptive Quiz System - Admin Core & Navigation Module (js/admin/admin-core.js)
   ========================================================================== */

function initAdminCoreModule() {
  setupAdminTabs();
  bindAdminCoreEvents();
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

      if (targetTab === 'tab-question-bank' && typeof renderGlobalQuestionBank === 'function') renderGlobalQuestionBank();
      if (targetTab === 'tab-users' && typeof renderAdminUsersTable === 'function') renderAdminUsersTable();
      if (targetTab === 'tab-reports' && typeof renderAdminReports === 'function') renderAdminReports();
      if (targetTab === 'tab-tools' && typeof populateRandomQuizForm === 'function') populateRandomQuizForm();
    });
  });
}

function bindAdminCoreEvents() {
  // Thêm / Xóa Chủ đề
  document.getElementById('btn-admin-add-topic')?.addEventListener('click', () => {
    Swal.fire({
      title: 'Thêm Chủ Đề Mới',
      input: 'text',
      inputPlaceholder: 'Nhập tên chủ đề...',
      showCancelButton: true
    }).then((res) => {
      if (res.isConfirmed && res.value) {
        const newTopic = res.value.trim();
        if (!window.AppState.settings.topics.includes(newTopic)) {
          window.AppState.settings.topics.push(newTopic);
          saveAdminSettings();
          renderAdminDashboard();
        }
      }
    });
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

  // Thêm / Xóa Độ khó
  document.getElementById('btn-admin-add-difficulty')?.addEventListener('click', () => {
    Swal.fire({
      title: 'Thêm Độ Khó Mới',
      input: 'text',
      inputPlaceholder: 'Nhập độ khó...',
      showCancelButton: true
    }).then((res) => {
      if (res.isConfirmed && res.value) {
        const newDiff = res.value.trim();
        if (!window.AppState.settings.difficulties.includes(newDiff)) {
          window.AppState.settings.difficulties.push(newDiff);
          saveAdminSettings();
          renderAdminDashboard();
        }
      }
    });
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
}

function renderAdminDashboard() {
  const topicsContainer = document.getElementById('admin-topics-list');
  if (topicsContainer) {
    topicsContainer.innerHTML = '';
    window.AppState.settings.topics.forEach(t => {
      const chip = document.createElement('div');
      chip.className = 'tag tag-topic';
      chip.style.display = 'inline-flex';
      chip.style.alignItems = 'center';
      chip.style.gap = '0.5rem';
      chip.innerHTML = `<span>${t}</span><i data-lucide="x" class="btn-delete-topic" data-name="${t}" style="cursor: pointer; width: 0.9rem; height: 0.9rem; color: var(--danger);"></i>`;
      topicsContainer.appendChild(chip);
    });
  }

  const diffsContainer = document.getElementById('admin-difficulties-list');
  if (diffsContainer) {
    diffsContainer.innerHTML = '';
    window.AppState.settings.difficulties.forEach(d => {
      const chip = document.createElement('div');
      chip.className = 'badge badge-student';
      chip.style.display = 'inline-flex';
      chip.style.alignItems = 'center';
      chip.style.gap = '0.5rem';
      chip.innerHTML = `<span>${d}</span><i data-lucide="x" class="btn-delete-difficulty" data-name="${d}" style="cursor: pointer; width: 0.9rem; height: 0.9rem; color: var(--danger);"></i>`;
      diffsContainer.appendChild(chip);
    });
  }

  if (typeof renderAdminQuizzesTable === 'function') renderAdminQuizzesTable();
  if (typeof lucide !== 'undefined') lucide.createIcons();
}

function populateQuizModalSelects() {
  const tSelect = document.getElementById('quiz-form-topic-select');
  if (tSelect) {
    tSelect.innerHTML = '';
    window.AppState.settings.topics.forEach(t => tSelect.innerHTML += `<option value="${t}">${t}</option>`);
  }

  const dSelect = document.getElementById('quiz-form-diff-select');
  if (dSelect) {
    dSelect.innerHTML = '';
    window.AppState.settings.difficulties.forEach(d => dSelect.innerHTML += `<option value="${d}">${d}</option>`);
  }
}