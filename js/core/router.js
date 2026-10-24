/* ==========================================================================
   Adaptive Quiz System - Router Module (js/core/router.js)
   ========================================================================== */

function navigateTo(viewId) {
  if (typeof document === 'undefined') return;

  const targetId = typeof viewId === 'string' && viewId ? viewId : 'view-list';
  const sections = Array.from(document.querySelectorAll('.view-section'));
  const target = document.getElementById(targetId) || document.getElementById('view-list') || sections[0];

  sections.forEach(section => {
    const isTarget = section === target;
    if (section.classList && typeof section.classList.toggle === 'function') {
      section.classList.toggle('hidden', !isTarget);
    } else {
      section.hidden = !isTarget;
    }
    if (typeof section.setAttribute === 'function') {
      section.setAttribute('aria-hidden', String(!isTarget));
    }
    section.hidden = !isTarget;
  });

  if (target) {
    if (target.classList && typeof target.classList.remove === 'function') {
      target.classList.remove('hidden');
    } else if (target.classList && typeof target.classList.toggle === 'function') {
      target.classList.toggle('hidden', false);
    }
    target.hidden = false;
    if (typeof target.setAttribute === 'function') {
      target.setAttribute('aria-hidden', 'false');
    }
    if (typeof target.focus === 'function') {
      target.focus();
    }
  }
}

function navigateHome() {
  const root = typeof window !== 'undefined' ? window : globalThis;
  const currentUser = root && root.Auth && typeof root.Auth.getCurrentUser === 'function'
    ? root.Auth.getCurrentUser()
    : null;

  const destination = currentUser && currentUser.role === 'admin' ? 'view-admin' : 'view-list';
  navigateTo(destination);

  if (destination === 'view-admin') {
    const adminHomeButton = document.getElementById('admin-tab-quizzes');
    if (adminHomeButton && typeof adminHomeButton.click === 'function') {
      adminHomeButton.click();
    }
    return;
  }

  const studentProfileTab = document.getElementById('tab-profile');
  if (studentProfileTab && typeof studentProfileTab.click === 'function') {
    studentProfileTab.click();
  }
}

function updateNavUI(user) {
  if (typeof document === 'undefined') return;

  const navUser = document.getElementById('nav-user');
  const userFullname = document.getElementById('user-fullname');
  const userRoleBadge = document.getElementById('user-role-badge');

  if (!navUser || !userFullname || !userRoleBadge) return;

  const root = typeof window !== 'undefined' ? window : globalThis;
  const currentUser = user || (root.AppState && root.AppState.currentUser) || null;
  const isLoggedIn = Boolean(currentUser && currentUser.role);

  if (navUser.classList && typeof navUser.classList.toggle === 'function') {
    navUser.classList.toggle('hidden', !isLoggedIn);
  } else {
    navUser.hidden = !isLoggedIn;
  }
  if (typeof navUser.setAttribute === 'function') {
    navUser.setAttribute('aria-hidden', String(!isLoggedIn));
  }

  if (!isLoggedIn) {
    userFullname.textContent = 'Học viên';
    userRoleBadge.textContent = 'Student';
    if (userRoleBadge.classList && typeof userRoleBadge.classList.remove === 'function') {
      userRoleBadge.classList.remove('badge-admin');
      userRoleBadge.classList.add('badge-student');
    }
    return;
  }

  const displayName = currentUser.nickname && currentUser.nickname.trim()
    ? currentUser.nickname.trim()
    : currentUser.fullName || currentUser.username || 'Học viên';
  userFullname.textContent = displayName;

  const isAdmin = String(currentUser.role).toLowerCase() === 'admin';
  userRoleBadge.textContent = isAdmin ? 'Teacher' : 'Student';
  if (userRoleBadge.classList && typeof userRoleBadge.classList.toggle === 'function') {
    userRoleBadge.classList.toggle('badge-admin', isAdmin);
    userRoleBadge.classList.toggle('badge-student', !isAdmin);
  }

  const body = document.body;
  if (body && body.classList && typeof body.classList.toggle === 'function') {
    body.classList.toggle('is-admin-role', isAdmin);
  }
}

const root = typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : {});
root.navigateTo = navigateTo;
root.navigateHome = navigateHome;
root.updateNavUI = updateNavUI;
