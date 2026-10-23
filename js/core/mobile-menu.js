/* ==========================================================================
   Adaptive Quiz System - Mobile Module Navigation
   ========================================================================== */

let mobileModuleMenuController = null;

function initMobileModuleMenu() {
  if (mobileModuleMenuController) return;

  const toggle = document.getElementById('mobile-menu-toggle');
  const backdrop = document.getElementById('mobile-menu-backdrop');
  if (!toggle || !backdrop) return;

  const mobileQuery = window.matchMedia('(max-width: 850px)');
  let activeNav = null;

  function getActiveNav() {
    const activeView = document.querySelector('.view-section:not(.hidden)');
    if (activeView?.id === 'view-admin') return document.getElementById('admin-tabs');
    if (activeView?.id === 'view-list') return document.getElementById('student-tabs-nav');
    return null;
  }

  function close(restoreFocus = false) {
    const nav = activeNav;
    activeNav = null;
    toggle.setAttribute('aria-expanded', 'false');
    backdrop.hidden = true;
    document.body.classList.remove('mobile-module-menu-open');

    if (nav) {
      nav.classList.remove('is-mobile-menu-open');
      nav.inert = mobileQuery.matches;
      nav.setAttribute('aria-hidden', String(mobileQuery.matches));
    }

    if (restoreFocus && !toggle.hidden) toggle.focus();
  }

  function sync() {
    const nav = getActiveNav();
    const shouldShow = mobileQuery.matches && Boolean(nav);

    if (activeNav && activeNav !== nav) close();
    toggle.hidden = !shouldShow;

    if (!shouldShow) {
      close();
      if (nav) {
        nav.inert = false;
        nav.setAttribute('aria-hidden', 'false');
      }
      return;
    }

    if (nav !== activeNav) {
      nav.inert = true;
      nav.setAttribute('aria-hidden', 'true');
      nav.classList.remove('is-mobile-menu-open');
    }
  }

  function open() {
    const nav = getActiveNav();
    if (!mobileQuery.matches || !nav) return;

    activeNav = nav;
    nav.inert = false;
    nav.setAttribute('aria-hidden', 'false');
    nav.classList.add('is-mobile-menu-open');
    backdrop.hidden = false;
    toggle.setAttribute('aria-expanded', 'true');
    document.body.classList.add('mobile-module-menu-open');
    nav.querySelector('[role="tab"][aria-selected="true"]')?.focus();
  }

  toggle.addEventListener('click', () => {
    if (activeNav) close();
    else open();
  });
  backdrop.addEventListener('click', () => close(true));
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && activeNav) close(true);
  });
  document.addEventListener('click', event => {
    if (activeNav && event.target.closest('.admin-tab-btn, .student-tab-btn')) close(true);
  });
  mobileQuery.addEventListener?.('change', sync);

  mobileModuleMenuController = { close, sync };
  sync();
}

function syncMobileModuleMenu() {
  mobileModuleMenuController?.sync();
}

function closeMobileModuleMenu() {
  mobileModuleMenuController?.close();
}
