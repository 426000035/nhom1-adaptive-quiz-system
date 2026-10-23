/* ==========================================================================
   Adaptive Quiz System - Student Personal Dashboard Module (js/features/student/student-dashboard.js)
   ========================================================================== */

/**
 * 1. Hàm chính: Tải HTML view từ views/student/dashboard.html và render dữ liệu
 */
async function renderStudentDashboard({ viewingStudentId = null } = {}) {
  const container = viewingStudentId
    ? document.getElementById('admin-student-profile-content')
    : document.getElementById('student-view-content') || document.getElementById('view-list');
  if (!container) {
    if (viewingStudentId) {
      throw new Error('Không tìm thấy vùng hiển thị hồ sơ học viên trong trang quản trị.');
    }
    return;
  }

  try {
    window.AppState.viewingStudentId = viewingStudentId;
    const response = await fetch('views/student/dashboard.html');
    if (!response.ok) throw new Error('Không tìm thấy views/student/dashboard.html');
    container.innerHTML = await response.text();

    const catalogResponse = await fetch('views/student/catalog.html');
    if (!catalogResponse.ok) throw new Error('Không tìm thấy views/student/catalog.html');
    const catalogMount = document.getElementById('student-catalog-mount-point');
    if (!catalogMount) throw new Error('Không tìm thấy vùng hiển thị danh sách bài thi');
    catalogMount.innerHTML = await catalogResponse.text();

    if (typeof updateFilterOptionsUI === 'function') {
      updateFilterOptionsUI();
    }
    if (typeof bindStudentCatalogEvents === 'function') {
      bindStudentCatalogEvents();
    }

    updateStudentStatsData();

    if (typeof window.filterAndRenderQuizzes === 'function') {
      window.filterAndRenderQuizzes();
    } else if (typeof filterAndRenderQuizzes === 'function') {
      filterAndRenderQuizzes();
    }

    bindDashboardButtons();
    bindStudentTabs();
    bindStudentProfileForm();
    bindStudentPasswordForm();
    renderStudentProfile();
    if (viewingStudentId) {
      document.querySelector('.student-dashboard')?.classList.add('is-admin-student-profile');
      const studentNav = document.querySelector('.student-tabs-nav');
      if (studentNav) studentNav.hidden = true;
      const adminToolbar = document.querySelector('.student-profile-admin-toolbar');
      const returnButton = document.getElementById('btn-return-admin-profile');
      if (window.Auth?.getCurrentUser()?.role === 'admin' && adminToolbar && returnButton) {
        adminToolbar.hidden = false;
        returnButton.addEventListener('click', () => {
          document.getElementById('admin-tab-users')?.click();
          window.requestAnimationFrame(() => window.scrollTo(0, 0));
        });
      }
      switchStudentSubTab('subtab-profile');
    }
    if (typeof lucide !== 'undefined') lucide.createIcons();

  } catch (err) {
    console.error('❌ Lỗi khi nạp giao diện Dashboard:', err);
    throw err;
  }
}

/**
 * 2. Cập nhật dữ liệu Streak, Điểm số & Gamification vào DOM
 */
function updateStudentStatsData() {
  const viewedStudent = getViewedStudentProfile();
  const database = viewedStudent ? window.LocalStorageDB.read() : null;
  const progress = viewedStudent
    ? database.studentProgress.find(item => item.userId === viewedStudent.userId)
    : null;
  const gData = viewedStudent
    ? { treeStage: progress?.treeStage || 1, currentExp: progress?.currentExp || 0, streakCount: progress?.streakCount || 0 }
    : window.GamificationEngine ? window.GamificationEngine.getData() : { treeStage: 1, currentExp: 0, streakCount: 1 };
  const streak = viewedStudent
    ? gData.streakCount
    : window.GamificationEngine ? window.GamificationEngine.checkAndUpdateStreak() : 1;
  const stageInfo = window.GamificationEngine?.STAGES[gData.treeStage] || { name: 'Hạt Mầm', icon: '🌱', maxExp: 100, desc: 'Cây vừa mới nhú mầm!' };
  const mascotData = viewedStudent
    ? { fullBucketCount: progress?.fullBucketCount || 0 }
    : window.MascotEngine ? window.MascotEngine.getData() : { fullBucketCount: 0 };

  // Lịch sử bài thi
  const historyAll = viewedStudent && typeof window.getQuizHistoryForUser === 'function'
    ? window.getQuizHistoryForUser(viewedStudent)
    : typeof window.getQuizHistoryForCurrentUser === 'function'
      ? window.getQuizHistoryForCurrentUser()
    : [];
  const totalCompleted = historyAll.length;
  const quizScores = window.QuizEngine?.aggregateQuizScores
    ? window.QuizEngine.aggregateQuizScores(historyAll)
    : [];
  const avgScore = quizScores.length > 0
    ? (quizScores.reduce((sum, quiz) => sum + quiz.aggregateScore, 0) / quizScores.length).toFixed(1)
    : '0.0';

  const expPercent = Math.min(100, Math.round((gData.currentExp / stageInfo.maxExp) * 100));
  const gardenScene = document.getElementById('tree-garden-scene');
  if (gardenScene) gardenScene.dataset.treeStage = String(gData.treeStage);

  // Gắn dữ liệu an toàn vào thẻ HTML
  const setTxt = (id, val) => { 
    const el = document.getElementById(id); 
    if (el) el.textContent = val; 
  };

  setTxt('dash-streak-count', `${streak} Ngày Liên Tiếp`);
  setTxt('dash-completed-count', `${totalCompleted} Bài`);
  setTxt('dash-avg-score', `${avgScore} / 10`);
  setTxt('dash-tree-icon', stageInfo.icon);
  setTxt('dash-tree-title', `${stageInfo.name} (Cấp ${gData.treeStage})`);
  setTxt('dash-tree-exp-badge', `EXP: ${gData.currentExp}/${stageInfo.maxExp}`);
  setTxt('dash-tree-desc', stageInfo.desc);
  setTxt('dash-water-count', `${mascotData.fullBucketCount} 🪣`);
  setTxt('dash-tree-exp-label', `${gData.currentExp} / ${stageInfo.maxExp} EXP`);

  const expBar = document.getElementById('dash-tree-exp-bar');
  if (expBar) {
    expBar.value = expPercent;
  }
  renderStudentLearningProgress(historyAll);
}

function getViewedStudentProfile() {
  const userId = window.AppState?.viewingStudentId;
  if (!userId || window.Auth?.getCurrentUser()?.role !== 'admin') return null;
  const student = window.LocalStorageDB.read().users.find(user =>
    user.userId === userId && user.role === 'student'
  );
  if (!student) throw new Error('Không tìm thấy hồ sơ học viên đang xem.');
  return student;
}

function renderStudentLearningProgress(history) {
  const container = document.getElementById('student-learning-progress');
  if (!container || !window.QuizEngine?.aggregateSkillStats) return;
  container.replaceChildren();

  const subjects = Object.values(window.QuizEngine.aggregateSkillStats(history));
  if (subjects.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'skill-analysis-empty';
    empty.textContent = 'Sau khi hoàn thành bài làm có câu hỏi gắn kỹ năng, kết quả theo môn và kỹ năng sẽ hiển thị tại đây.';
    container.appendChild(empty);
    return;
  }

  subjects.sort((left, right) => left.subjectName.localeCompare(right.subjectName, 'vi'));
  subjects.forEach(subject => {
    const card = document.createElement('article');
    card.className = 'skill-subject-card';
    const title = document.createElement('h4');
    title.className = 'skill-subject-title';
    title.textContent = subject.subjectName;

    const accuracy = subject.total ? Math.round((subject.correct / subject.total) * 100) : 0;
    const summary = document.createElement('p');
    summary.className = 'skill-subject-summary';
    summary.textContent = `Tổng quan: ${subject.correct}/${subject.total} câu đúng · ${accuracy}%`;
    card.append(title, summary);

    Object.values(subject.skills)
      .sort((left, right) => left.skillName.localeCompare(right.skillName, 'vi'))
      .forEach(skill => {
        const skillAccuracy = skill.total ? Math.round((skill.correct / skill.total) * 100) : 0;
        const isWeak = skillAccuracy < window.QuizEngine.WEAK_SKILL_THRESHOLD;
        const row = document.createElement('div');
        row.className = 'skill-analysis-row';

        const name = document.createElement('span');
        name.className = 'skill-analysis-name';
        name.textContent = skill.skillName;

        const progress = document.createElement('progress');
        progress.className = `skill-analysis-progress${isWeak ? ' is-weak' : ''}`;
        progress.max = 100;
        progress.value = skillAccuracy;
        progress.setAttribute('aria-label', `${skill.skillName}: ${skillAccuracy}%`);

        const value = document.createElement('span');
        value.className = `skill-analysis-value${isWeak ? ' is-weak' : ''}`;
        value.textContent = `${skill.correct}/${skill.total} · ${skillAccuracy}%${isWeak ? ' · Cần củng cố' : ''}`;
        row.append(name, progress, value);
        card.appendChild(row);
      });
    container.appendChild(card);
  });
}

/**
 * 3. Xử lý chuyển đổi tab danh sách, lịch sử và hồ sơ học viên
 */
function switchStudentSubTab(tabId) {
  const dashboard = document.querySelector('.student-dashboard');
  if (!dashboard) return;

  const target = document.getElementById(tabId);
  const selectedTab = dashboard.querySelector(`[data-tab-target="${tabId}"]`);
  if (!target || !selectedTab) return;

  dashboard.querySelectorAll('.student-subtab-content').forEach(panel => {
    panel.hidden = panel !== target;
  });
  dashboard.querySelectorAll('.student-tab-btn').forEach(button => {
    const isSelected = button === selectedTab;
    button.classList.toggle('active', isSelected);
    button.setAttribute('aria-selected', String(isSelected));
    button.tabIndex = isSelected ? 0 : -1;
  });

  // 5. Nạp/Cập nhật dữ liệu cho từng tab khi được click
  if (tabId === 'subtab-history') {
    if (typeof window.renderQuizHistoryView === 'function') {
      window.renderQuizHistoryView();
    }
  } else if (tabId === 'subtab-profile') {
    if (typeof window.updateStudentStatsData === 'function') {
      window.updateStudentStatsData();
    }
    renderStudentProfile();
  }
}

const STUDENT_AVATARS = {
  seedling: '🌱',
  sunflower: '🌻',
  book: '📚',
  star: '⭐',
  fox: '🦊'
};

const STUDENT_AVATAR_LABELS = {
  seedling: 'hạt mầm',
  sunflower: 'hướng dương',
  book: 'sách',
  star: 'ngôi sao',
  fox: 'cáo'
};

function renderStudentProfile() {
  const user = getViewedStudentProfile() || window.Auth?.getCurrentUser();
  const isReadOnly = Boolean(window.AppState?.viewingStudentId) &&
    window.Auth?.getCurrentUser()?.role === 'admin';
  const name = document.getElementById('student-profile-name');
  const username = document.getElementById('student-profile-username');
  const nickname = document.getElementById('student-profile-nickname');
  const phone = document.getElementById('student-profile-phone');
  const phoneInput = document.getElementById('student-profile-phone-input');
  const avatar = document.getElementById('student-profile-avatar');
  const nicknameDisplay = document.getElementById('student-profile-nickname-display');
  const birthDate = document.getElementById('student-profile-birth-date');
  const birthDateInput = document.getElementById('student-profile-birth-date-input');
  const classList = document.getElementById('student-profile-classes');
  if (!user || (user.role !== 'student' && !isReadOnly) || !name || !username || !nickname ||
      !phone || !phoneInput || !avatar ||
      !nicknameDisplay || !birthDate || !birthDateInput || !classList) return;

  name.textContent = user.fullName;
  username.textContent = user.username;
  nickname.value = user.nickname || '';
  phone.textContent = user.phone || 'Chưa cập nhật';
  phoneInput.value = user.phone || '';
  nicknameDisplay.textContent = user.nickname || 'Chưa đặt biệt danh';
  birthDate.textContent = user.birthDate || 'Chưa cập nhật';
  if (user.birthDate) {
    birthDate.textContent = new Date(`${user.birthDate}T00:00:00`).toLocaleDateString('vi-VN');
  }
  birthDateInput.value = user.birthDate || '';
  const today = new Date();
  birthDateInput.max = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  const avatarId = STUDENT_AVATARS[user.avatar] ? user.avatar : 'seedling';
  avatar.textContent = STUDENT_AVATARS[avatarId];
  avatar.disabled = isReadOnly;
  avatar.setAttribute('aria-label', isReadOnly
    ? `Avatar học viên: ${STUDENT_AVATAR_LABELS[avatarId]}`
    : `Đổi avatar, hiện tại là ${STUDENT_AVATAR_LABELS[avatarId]}`);
  const editButton = document.getElementById('btn-edit-student-profile');
  const passwordButton = document.getElementById('btn-open-student-password');
  if (editButton) editButton.disabled = isReadOnly;
  if (passwordButton) passwordButton.disabled = isReadOnly;
  const avatarPicker = document.getElementById('student-avatar-picker');
  if (avatarPicker && isReadOnly) avatarPicker.hidden = true;
  const avatarHint = document.querySelector('.student-profile-avatar-hint');
  if (avatarHint) avatarHint.hidden = isReadOnly;
  document.querySelector('.student-profile-footer')?.classList.toggle('hidden', isReadOnly);
  const waterButton = document.getElementById('btn-water-tree');
  if (waterButton) waterButton.disabled = isReadOnly;
  const classesById = new Map(window.LocalStorageDB.read().classes.map(item => [item.classId, item.name]));
  const classNames = (user.classIds || []).map(classId => classesById.get(classId)).filter(Boolean);
  classList.textContent = classNames.length ? classNames.join(', ') : 'Chưa được xếp lớp';
  document.querySelectorAll('.student-avatar-option').forEach(option => {
    const isSelected = option.dataset.avatar === avatarId;
    option.classList.toggle('is-selected', isSelected);
    option.setAttribute('aria-pressed', String(isSelected));
  });
  if (!isReadOnly && typeof updateNavUI === 'function') updateNavUI(user);
}

function bindStudentProfileForm() {
  const form = document.getElementById('form-student-profile');
  const dialog = document.getElementById('student-profile-edit-dialog');
  const avatarButton = document.getElementById('student-profile-avatar');
  const avatarPicker = document.getElementById('student-avatar-picker');
  const avatarStatus = document.getElementById('student-avatar-status');
  const editButton = document.getElementById('btn-edit-student-profile');
  const status = document.getElementById('student-profile-status');
  if (!form || !dialog || !avatarButton || !avatarPicker || !avatarStatus || !editButton || !status) return;

  avatarButton.addEventListener('click', () => {
    if (isViewingStudentAsAdmin()) return;
    const isExpanded = avatarButton.getAttribute('aria-expanded') === 'true';
    avatarButton.setAttribute('aria-expanded', String(!isExpanded));
    avatarPicker.hidden = isExpanded;
    if (!isExpanded) avatarPicker.querySelector('[data-avatar].is-selected')?.focus();
  });
  avatarPicker.addEventListener('click', event => {
    if (isViewingStudentAsAdmin()) return;
    const option = event.target.closest('[data-avatar]');
    if (!option || !avatarPicker.contains(option)) return;
    avatarStatus.textContent = 'Đang lưu avatar...';
    try {
      window.Auth.updateOwnProfile({ avatar: option.dataset.avatar });
      renderStudentProfile();
      avatarPicker.hidden = true;
      avatarButton.setAttribute('aria-expanded', 'false');
      avatarStatus.textContent = 'Avatar đã được cập nhật.';
    } catch (error) {
      avatarStatus.textContent = error.message;
      console.error('Không thể cập nhật avatar học viên:', error);
    }
  });

  editButton.addEventListener('click', () => {
    if (isViewingStudentAsAdmin()) return;
    renderStudentProfile();
    status.textContent = '';
    dialog.showModal();
    document.getElementById('student-profile-nickname').focus();
  });
  form.addEventListener('submit', event => {
    event.preventDefault();
    if (isViewingStudentAsAdmin()) return;
    const saveButton = document.getElementById('btn-save-student-profile');
    saveButton.disabled = true;
    status.textContent = 'Đang lưu hồ sơ...';
    try {
      window.Auth.updateOwnProfile({
        nickname: document.getElementById('student-profile-nickname').value,
        birthDate: document.getElementById('student-profile-birth-date-input').value,
        phone: document.getElementById('student-profile-phone-input').value
      });
      renderStudentProfile();
      dialog.close();
      status.textContent = 'Đã lưu hồ sơ cá nhân.';
    } catch (error) {
      status.textContent = error.message;
      console.error('Không thể lưu hồ sơ học viên:', error);
    } finally {
      saveButton.disabled = false;
    }
  });

  document.getElementById('btn-profile-logout')?.addEventListener('click', () => {
    if (isViewingStudentAsAdmin()) return;
    window.Auth.logout();
    if (typeof updateNavUI === 'function') updateNavUI(null);
    if (typeof navigateTo === 'function') navigateTo('view-auth');
  });

  document.querySelectorAll('[data-close-dialog="student-profile-edit-dialog"]').forEach(button => {
    button.addEventListener('click', () => dialog.close());
  });
}

function bindStudentPasswordForm() {
  const form = document.getElementById('form-student-password');
  const dialog = document.getElementById('student-password-dialog');
  const status = document.getElementById('student-password-status');
  const currentPassword = document.getElementById('student-current-password');
  const newPassword = document.getElementById('student-new-password');
  const confirmPassword = document.getElementById('student-confirm-password');
  const saveButton = document.getElementById('btn-save-student-password');
  const openButton = document.getElementById('btn-open-student-password');
  if (!form || !dialog || !status || !currentPassword || !newPassword ||
      !confirmPassword || !saveButton || !openButton) return;

  openButton.addEventListener('click', () => {
    if (isViewingStudentAsAdmin()) return;
    status.textContent = '';
    form.reset();
    dialog.showModal();
    currentPassword.focus();
  });
  document.querySelectorAll('[data-close-dialog="student-password-dialog"]').forEach(button => {
    button.addEventListener('click', () => dialog.close());
  });

  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (isViewingStudentAsAdmin()) return;
    saveButton.disabled = true;
    let passwordChanged = false;
    try {
      if (newPassword.value !== confirmPassword.value) {
        throw new Error('Mật khẩu mới và xác nhận mật khẩu không khớp.');
      }
      if (!window.Swal || typeof window.Swal.fire !== 'function') {
        throw new Error('Không thể mở hộp thoại xác nhận đổi mật khẩu. Vui lòng tải lại trang.');
      }
      const confirmation = await window.Swal.fire({
        icon: 'warning',
        title: 'Bạn có chắc chắn đổi mật khẩu?',
        text: 'Mật khẩu hiện tại sẽ được thay bằng mật khẩu mới.',
        showCancelButton: true,
        confirmButtonText: 'Xác nhận đổi',
        cancelButtonText: 'Hủy'
      });
      if (!confirmation.isConfirmed) return;

      status.textContent = 'Đang cập nhật mật khẩu...';
      window.Auth.updateOwnPassword(currentPassword.value, newPassword.value);
      passwordChanged = true;
      form.reset();
      status.textContent = 'Đã đổi mật khẩu. Hãy dùng mật khẩu mới ở lần đăng nhập tiếp theo.';
      dialog.close();
    } catch (error) {
      status.textContent = error.message;
      console.error('Không thể đổi mật khẩu học viên:', error);
    } finally {
      saveButton.disabled = false;
    }
    if (passwordChanged) {
      try {
        await window.Swal.fire({
          icon: 'success',
          title: 'Đã đổi mật khẩu',
          text: 'Hãy dùng mật khẩu mới ở lần đăng nhập tiếp theo.',
          confirmButtonText: 'Đóng'
        });
      } catch (error) {
        console.error('Đã đổi mật khẩu nhưng không thể hiển thị thông báo xác nhận:', error);
      }
    }
  });
}

function isViewingStudentAsAdmin() {
  return Boolean(window.AppState?.viewingStudentId) &&
    window.Auth?.getCurrentUser()?.role === 'admin';
}

function bindStudentTabs() {
  const tabList = document.querySelector('.student-tab-list');
  if (!tabList) return;

  tabList.addEventListener('click', event => {
    const tab = event.target.closest('[data-tab-target]');
    if (tab && tabList.contains(tab)) {
      switchStudentSubTab(tab.dataset.tabTarget);
    }
  });

  tabList.addEventListener('keydown', event => {
    const tabs = Array.from(tabList.querySelectorAll('[role="tab"]'));
    const currentIndex = tabs.indexOf(event.target);
    if (currentIndex < 0) return;

    let nextIndex;
    if (event.key === 'ArrowRight') nextIndex = (currentIndex + 1) % tabs.length;
    else if (event.key === 'ArrowLeft') nextIndex = (currentIndex - 1 + tabs.length) % tabs.length;
    else if (event.key === 'Home') nextIndex = 0;
    else if (event.key === 'End') nextIndex = tabs.length - 1;
    else return;

    event.preventDefault();
    const nextTab = tabs[nextIndex];
    switchStudentSubTab(nextTab.dataset.tabTarget);
    nextTab.focus();
  });
}

// Đăng ký toàn cục
window.switchStudentSubTab = switchStudentSubTab;

/**
 * 4. Tải view Lịch sử bài thi
 */
async function loadStudentHistorySubTab() {
  const mountPoint = document.getElementById('student-history-mount-point');
  if (!mountPoint) return;

  try {
    const res = await fetch('views/student/history.html');
    if (res.ok) {
      mountPoint.innerHTML = await res.text();
      
      if (typeof window.renderQuizHistoryView === 'function') {
        window.renderQuizHistoryView();
      }
    }
  } catch (err) {
    console.error('❌ Lỗi khi nạp views/student/history.html:', err);
  }
}

/**
 * 5. Gán sự kiện nút bấm trên Dashboard
 */
function bindDashboardButtons() {
  // Nút Tưới cây
  const btnWater = document.getElementById('btn-water-tree');
  if (btnWater) {
    btnWater.addEventListener('click', e => {
      e.preventDefault();
      if (isViewingStudentAsAdmin()) return;
      if (window.GamificationEngine && typeof window.GamificationEngine.waterTree === 'function') {
        const res = window.GamificationEngine.waterTree();
        animateTreeGarden(res);
        if (res.success) {
          updateStudentStatsData();
        }
      }
    });
  }

  // Nút Mở Lịch Sử
  const btnHistory = document.getElementById('btn-open-history');
  if (btnHistory) {
    btnHistory.addEventListener('click', e => {
      e.preventDefault();
      switchStudentSubTab('subtab-history');
    });
  }
}

function animateTreeGarden(result) {
  const scene = document.getElementById('tree-garden-scene');
  if (!scene) return;

  scene.classList.remove('is-watering', 'is-no-water', 'is-level-up');
  clearTimeout(window.treeGardenAnimationTimer);
  void scene.offsetWidth;

  if (!result.success) {
    scene.classList.add('is-no-water');
  } else {
    scene.classList.add('is-watering');
    if (result.levelUp) scene.classList.add('is-level-up');
  }

  window.treeGardenAnimationTimer = setTimeout(() => {
    scene.classList.remove('is-watering', 'is-no-water', 'is-level-up');
  }, 2600);
}

// Export các hàm toàn cục để dùng từ HTML / Router
window.renderStudentDashboard = renderStudentDashboard;
window.switchStudentSubTab = switchStudentSubTab;
window.updateStudentStatsData = updateStudentStatsData;