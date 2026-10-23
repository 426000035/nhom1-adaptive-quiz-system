/* ==========================================================================
   Adaptive Quiz System - Admin Core & Navigation Module (js/features/admin/admin-core.js)
   ========================================================================== */

function initAdminCoreModule() {
  setupAdminTabs();
  setupAdminModalAccessibility();
}

function createAdminTableCell(value, className = '', cellClassName = '') {
  const cell = document.createElement('td');
  cell.className = [className, cellClassName].filter(Boolean).join(' ');
  cell.textContent = String(value ?? '');
  return cell;
}

function renderAdminEmptyRow(tbody, columnCount, message, className = 'admin-empty-state') {
  const row = document.createElement('tr');
  const cell = document.createElement('td');
  cell.colSpan = columnCount;
  cell.className = className;
  cell.textContent = String(message);
  row.appendChild(cell);
  tbody.appendChild(row);
}

function setupAdminModalAccessibility() {
  const modals = Array.from(document.querySelectorAll('.admin-modal'));
  if (modals.length === 0 || typeof MutationObserver === 'undefined') return;

  const modalCloseButtons = {
    'modal-manage-questions': 'btn-close-questions-modal',
    'modal-select-from-bank': 'btn-cancel-bank-select',
    'modal-quiz-form': 'btn-cancel-quiz-form',
    'modal-quiz-assignment': 'btn-cancel-quiz-assignment',
    'modal-user-classes': 'btn-cancel-user-classes',
    'modal-create-student': 'btn-cancel-create-student',
    'modal-question-form': 'btn-cancel-q-form'
  };
  const openerByModal = new WeakMap();
  const openStateByModal = new WeakMap();
  const focusableSelector = [
    'a[href]',
    'button:not([disabled])',
    'input:not([disabled]):not([type="hidden"])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    '[tabindex]:not([tabindex="-1"])'
  ].join(',');

  const getVisibleModals = () => modals.filter(modal =>
    !modal.classList.contains('hidden') && !modal.hidden
  ).sort((left, right) => {
    const leftZIndex = Number.parseInt(window.getComputedStyle(left).zIndex, 10) || 0;
    const rightZIndex = Number.parseInt(window.getComputedStyle(right).zIndex, 10) || 0;
    return leftZIndex - rightZIndex;
  });
  const getFocusableElements = modal => Array.from(modal.querySelectorAll(focusableSelector))
    .filter(element => !element.closest('[hidden], .hidden, [aria-hidden="true"]'));
  const focusModal = modal => {
    const dialog = modal.querySelector('[role="dialog"]');
    if (!dialog) return;
    const focusableElements = getFocusableElements(modal);
    (focusableElements[0] || dialog).focus();
  };
  const isAvailable = element => {
    if (!element || !element.isConnected) return false;
    return !element.closest('[hidden], .hidden, [aria-hidden="true"]');
  };
  const isSweetAlertTarget = target => Boolean(target?.closest?.('.swal2-container'));

  modals.forEach(modal => {
    const isOpen = !modal.classList.contains('hidden');
    modal.hidden = !isOpen;
    modal.setAttribute('aria-hidden', String(!isOpen));
    openStateByModal.set(modal, isOpen);
  });

  const observer = new MutationObserver(records => {
    records.forEach(record => {
      const modal = record.target;
      const isOpen = !modal.classList.contains('hidden');
      if (openStateByModal.get(modal) === isOpen) return;
      openStateByModal.set(modal, isOpen);
      modal.hidden = !isOpen;
      modal.setAttribute('aria-hidden', String(!isOpen));

      if (isOpen) {
        const activeElement = document.activeElement;
        if (!modal.contains(activeElement)) openerByModal.set(modal, activeElement);
        focusModal(modal);
        return;
      }

      const opener = openerByModal.get(modal);
      openerByModal.delete(modal);
      if (isAvailable(opener)) opener.focus();
      else {
        const visibleModals = getVisibleModals();
        const activeModal = visibleModals[visibleModals.length - 1];
        if (activeModal) focusModal(activeModal);
      }
    });
  });

  modals.forEach(modal => observer.observe(modal, { attributes: true, attributeFilter: ['class'] }));

  document.addEventListener('keydown', event => {
    if (isSweetAlertTarget(event.target)) return;
    const visibleModals = getVisibleModals();
    const modal = visibleModals[visibleModals.length - 1];
    if (!modal) return;

    if (event.key === 'Escape') {
      const closeButton = document.getElementById(modalCloseButtons[modal.id]);
      if (closeButton) {
        event.preventDefault();
        closeButton.click();
      }
      return;
    }

    if (event.key !== 'Tab') return;
    const focusableElements = getFocusableElements(modal);
    if (focusableElements.length === 0) {
      event.preventDefault();
      modal.querySelector('[role="dialog"]')?.focus();
      return;
    }

    const first = focusableElements[0];
    const last = focusableElements[focusableElements.length - 1];
    if (!modal.contains(document.activeElement)) {
      event.preventDefault();
      first.focus();
    } else if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  });

  document.addEventListener('focusin', event => {
    if (isSweetAlertTarget(event.target)) return;
    const visibleModals = getVisibleModals();
    const modal = visibleModals[visibleModals.length - 1];
    if (modal && !modal.contains(event.target)) focusModal(modal);
  });
}

function setupAdminTabs() {
  const tabBtns = Array.from(document.querySelectorAll('.admin-tab-btn'));
  if (tabBtns.length === 0) return;

  const tabList = document.querySelector('[role="tablist"]');
  const mobileQuery = window.matchMedia?.('(max-width: 850px)');
  const isDesktop = () => !mobileQuery?.matches;
  const syncTabOrientation = () => {
    if (tabList) {
      tabList.setAttribute('aria-orientation', isDesktop() ? 'vertical' : 'horizontal');
    }
  };
  syncTabOrientation();
  mobileQuery?.addEventListener?.('change', syncTabOrientation);

  const initialTab = tabBtns.find(btn => btn.classList.contains('active')) || tabBtns[0];
  updateAdminTabState(initialTab);

  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      activateAdminTab(btn);
    });

    btn.addEventListener('keydown', event => {
      const currentIndex = tabBtns.indexOf(btn);
      let nextIndex;
      const isVertical = tabList?.getAttribute('aria-orientation') === 'vertical';
      if (event.key === (isVertical ? 'ArrowDown' : 'ArrowRight')) nextIndex = (currentIndex + 1) % tabBtns.length;
      else if (event.key === (isVertical ? 'ArrowUp' : 'ArrowLeft')) nextIndex = (currentIndex - 1 + tabBtns.length) % tabBtns.length;
      else if (event.key === 'Home') nextIndex = 0;
      else if (event.key === 'End') nextIndex = tabBtns.length - 1;
      else return;

      event.preventDefault();
      activateAdminTab(tabBtns[nextIndex], true);
    });
  });
}

function activateAdminTab(button, focus = false) {
  const targetTab = button.getAttribute('data-tab');
  const targetPanel = document.getElementById(targetTab);
  if (!targetPanel || !targetPanel.classList.contains('admin-tab-content')) return;

  const studentProfile = document.getElementById('admin-student-profile-content');
  if (studentProfile && !studentProfile.hidden) {
    studentProfile.hidden = true;
    window.AppState.viewingStudentId = null;
  }
  updateAdminTabState(button);
  if (focus) button.focus();

  if (targetTab === 'tab-question-bank' && typeof renderGlobalQuestionBank === 'function') renderGlobalQuestionBank();
  if (targetTab === 'tab-catalogs' && typeof renderAdminCatalogs === 'function') renderAdminCatalogs();
  if (targetTab === 'tab-users' && typeof renderAdminUsersTable === 'function') renderAdminUsersTable();
  if (targetTab === 'tab-reports' && typeof renderAdminReports === 'function') renderAdminReports();
  if (targetTab === 'tab-tools' && typeof populateRandomQuizForm === 'function') populateRandomQuizForm();
}

function showAdminStudentProfile() {
  const profile = document.getElementById('admin-student-profile-content');
  if (!profile) throw new Error('Không tìm thấy vùng hiển thị hồ sơ học viên trong trang quản trị.');

  document.querySelectorAll('#admin-tab-container .admin-tab-content').forEach(panel => {
    panel.classList.add('hidden');
    panel.hidden = true;
    panel.setAttribute('aria-hidden', 'true');
  });
  profile.hidden = false;
}

function updateAdminTabState(activeButton) {
  const tabBtns = document.querySelectorAll('.admin-tab-btn');
  const tabPanels = document.querySelectorAll('#admin-tab-container .admin-tab-content');

  tabBtns.forEach(button => {
    const isActive = button === activeButton;
    button.classList.toggle('active', isActive);
    button.classList.toggle('btn-primary', isActive);
    button.classList.toggle('btn-outline', !isActive);
    button.setAttribute('aria-selected', String(isActive));
    button.tabIndex = isActive ? 0 : -1;
  });

  tabPanels.forEach(panel => {
    const isActive = panel.id === activeButton.getAttribute('data-tab');
    panel.classList.toggle('hidden', !isActive);
    panel.hidden = !isActive;
    panel.setAttribute('aria-hidden', String(!isActive));
  });
}

function renderAdminDashboard() {
  if (typeof renderAdminQuizzesTable === 'function') renderAdminQuizzesTable();
  if (typeof lucide !== 'undefined') lucide.createIcons();
}

async function populateQuizModalSelects(selectedSubjectId = '', fallbackTopic = '') {
  const tSelect = document.getElementById('quiz-form-topic-select');
  if (tSelect) {
    tSelect.replaceChildren();
    const { subjects } = await window.AdminCatalogs.getActiveCatalogs();
    subjects.forEach(subject => {
      const option = document.createElement('option');
      option.value = subject.subjectId;
      option.textContent = subject.name;
      tSelect.appendChild(option);
    });
    const selected = subjects.find(subject =>
      String(subject.subjectId) === String(selectedSubjectId) ||
      (!selectedSubjectId && fallbackTopic && subject.name === fallbackTopic)
    );
    if (selected) tSelect.value = selected.subjectId;
    if (subjects.length === 0) throw new Error('Chưa có môn học đang hoạt động. Hãy thêm môn trong mục Môn Học & Kỹ Năng trước.');
  }

}