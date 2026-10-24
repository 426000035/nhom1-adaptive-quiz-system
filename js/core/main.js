/* ==========================================================================
   Adaptive Quiz System - Main Entry Point (js/core/main.js)
   ========================================================================== */

// CHỈ ĐĂNG KÝ MỘT LẦN DUY NHẤT (trước đây bị lặp 2 khối -> mọi sự kiện bị bind đôi)
document.addEventListener('DOMContentLoaded', async () => {
  try {
    console.log("🚀 Đang khởi chạy hệ thống Adaptive Quiz System...");

    // 1. Nạp toàn bộ các giao diện HTML thành phần
    if (typeof initAllComponents === 'function') {
      await initAllComponents();
    }
    initMobileModuleMenu();

    try {
      const result = await window.LocalStorageDB.initializeFromJson();
      if (result.initialized) {
        console.info('Đã khởi tạo database demo từ các tệp JSON mẫu.');
      }
      try {
        const sampleResult = await window.LocalStorageDB.importDemoSamplePack();
        if (sampleResult.imported) {
          console.info('Đã nhập bộ dữ liệu demo môn học, kỹ năng, câu hỏi, lớp học và tài khoản.');
        }
      } catch (error) {
        console.error('Không thể nhập bộ dữ liệu mẫu chi tiết:', error);
        if (typeof Swal !== 'undefined') {
          Swal.fire({
            icon: 'error',
            title: 'Không thể nạp dữ liệu mẫu chi tiết',
            text: error.message
          });
        }
      }
      try {
        window.sessionStorage.removeItem('adaptive_quiz_google_oauth_session');
      } catch (error) {
        console.error('Không thể xóa phiên Google legacy khỏi sessionStorage:', error);
      }
    } catch (error) {
      console.error('Không thể khởi tạo database demo từ JSON:', error);
      if (typeof Swal !== 'undefined') {
        Swal.fire({
          icon: 'error',
          title: 'Không thể nạp dữ liệu demo',
          text: error.message
        });
      }
    }

    // 2. Khởi tạo bắt sự kiện Auth sau khi DOM nạp xong
    if (typeof initAuthModule === 'function') {
      initAuthModule();
    } else if (window.Auth && typeof window.Auth.bindEvents === 'function') {
      window.Auth.bindEvents();
    }

    // 3. Tải cấu hình Cài đặt & Khởi tạo phiên Đăng nhập
    if (typeof loadAdminSettings === 'function') {
      loadAdminSettings();
    }
    if (window.AdminCatalogs && typeof window.AdminCatalogs.getActiveCatalogs === 'function') {
      try {
        await window.AdminCatalogs.getActiveCatalogs();
      } catch (error) {
        console.error('Không thể đồng bộ bộ lọc với danh mục demo:', error);
        if (typeof Swal !== 'undefined') {
          Swal.fire({
            icon: 'error',
            title: 'Không thể tải danh mục demo',
            text: error.message
          });
        }
      }
    }

    if (window.Auth && typeof window.Auth.init === 'function') {
      await window.Auth.init();
    }

    // 4. Nạp dữ liệu danh sách bài kiểm tra & Ngân hàng câu hỏi vào AppState
    await loadQuestionsData();

    // 5. Khởi tạo và lắng nghe sự kiện riêng cho các module
    if (typeof initStudentModule === 'function') initStudentModule();
    if (typeof initAdminCoreModule === 'function') initAdminCoreModule();
    if (typeof initAdminCatalogsModule === 'function') initAdminCatalogsModule();
    if (typeof initAdminQuizzesModule === 'function') initAdminQuizzesModule();
    if (typeof initAdminBankModule === 'function') initAdminBankModule();
    if (typeof initAdminUsersModule === 'function') initAdminUsersModule();
    if (typeof initAdminReportsModule === 'function') initAdminReportsModule();
    if (typeof initAdminToolsModule === 'function') initAdminToolsModule();

    // 6. Kiểm tra trạng thái đăng nhập người dùng & Điều hướng giao diện
    const currentUser = window.Auth ? window.Auth.getCurrentUser() : null;
    window.AppState.currentUser = currentUser;
    if (currentUser) {
      window.MascotEngine?.renderMascotUI();
      window.MascotEngine?.onSessionResume(currentUser);
    }

    if (typeof updateNavUI === 'function') {
      updateNavUI(currentUser);
    }

    if (currentUser) {
      if (currentUser.role === 'admin') {
        if (typeof renderAdminDashboard === 'function') renderAdminDashboard();
        navigateTo('view-admin');
      } else {
        if (typeof renderStudentDashboard === 'function') {
          await renderStudentDashboard();
        }
        navigateTo('view-list');
      }
    } else {
      navigateTo('view-auth');
      window.MascotEngine?.emit('loginScreen');
    }

    console.log("✅ Hệ thống đã sẵn sàng và khởi chạy thành công!");
  } catch (error) {
    console.error("❌ Lỗi khởi chạy ứng dụng tại js/core/main.js:", error);
  }
});