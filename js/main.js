/* ==========================================================================
   Adaptive Quiz System - Main Entry Point (js/main.js)
   ========================================================================== */

document.addEventListener('DOMContentLoaded', async () => {
  try {
    console.log("🚀 Đang khởi chạy hệ thống Adaptive Quiz System...");

    // 1. Nạp toàn bộ các giao diện HTML thành phần
    if (typeof initAllComponents === 'function') {
      await initAllComponents();
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
    
    if (window.Auth && typeof window.Auth.init === 'function') {
      await window.Auth.init();
    }

    // 4. Nạp dữ liệu danh sách bài kiểm tra & Ngân hàng câu hỏi vào AppState
    if (typeof loadQuestionsData === 'function') {
      await loadQuestionsData();
    }

    // 5. Khởi tạo và lắng nghe sự kiện riêng cho các module
    if (typeof initStudentModule === 'function') initStudentModule();
    if (typeof initAdminCoreModule === 'function') initAdminCoreModule();
    if (typeof initAdminQuizzesModule === 'function') initAdminQuizzesModule();
    if (typeof initAdminBankModule === 'function') initAdminBankModule();
    if (typeof initAdminUsersModule === 'function') initAdminUsersModule();
    if (typeof initAdminReportsModule === 'function') initAdminReportsModule();
    if (typeof initAdminToolsModule === 'function') initAdminToolsModule();

    // 6. Kiểm tra trạng thái đăng nhập người dùng & Điều hướng giao diện
    const currentUser = window.Auth ? window.Auth.getCurrentUser() : null;
    
    if (typeof updateNavUI === 'function') {
      updateNavUI(currentUser);
    }

    if (currentUser) {
      if (currentUser.role === 'admin') {
        if (typeof renderAdminDashboard === 'function') renderAdminDashboard();
        navigateTo('view-admin');
      } else {
        // Render danh sách đề thi cho Student trước khi chuyển View
        if (typeof filterAndRenderQuizzes === 'function') {
          filterAndRenderQuizzes();
        }
        navigateTo('view-list');
      }
    } else {
      navigateTo('view-auth');
    }

    console.log("✅ Hệ thống đã sẵn sàng và khởi chạy thành công!");
  } catch (error) {
    console.error("❌ Lỗi khởi chạy ứng dụng tại main.js:", error);
  }
});

/* ==========================================================================
   Adaptive Quiz System - Main Entry Point (js/main.js)
   ========================================================================== */

// Hàm nạp 1,000 câu hỏi từ file data/questions.json và tự động chia thành 100 đề thi
async function loadQuestionsData() {
  try {
    // Ưu tiên nạp từ LocalStorage nếu đã có sẵn
    const cachedQuizzes = localStorage.getItem('all_quizzes_data');
    const cachedQuestions = localStorage.getItem('all_questions_bank');

    if (cachedQuizzes && cachedQuestions) {
      window.AppState.allQuizzes = JSON.parse(cachedQuizzes);
      window.AppState.allQuestions = JSON.parse(cachedQuestions);
      console.log("⚡ Đã nạp dữ liệu từ LocalStorage Cache!");
      return;
    }

    // Nếu chưa có cache, tiến hành đọc từ file data/questions.json (do Node.js tạo)
    console.log("🔄 Đang tải dữ liệu từ data/questions.json...");
    const response = await fetch('./data/questions.json');
    if (!response.ok) throw new Error('Không tìm thấy file data/questions.json');

    const allQuestions = await response.json();

    // Tự động gom 1,000 câu hỏi thành 100 đề thi (Mỗi đề 10 câu)
    const quizzes = [];
    const quizCount = Math.floor(allQuestions.length / 10);

    for (let i = 0; i < quizCount; i++) {
      const quizQuestions = allQuestions.slice(i * 10, (i + 1) * 10);
      if (quizQuestions.length > 0) {
        const firstQ = quizQuestions[0];
        quizzes.push({
          id: `quiz_${i + 1}`,
          title: firstQ.subTopic || `Đề thi ${firstQ.topic} #${i + 1}`,
          topic: firstQ.topic || 'Lập trình Web',
          difficulty: firstQ.difficulty || 'Medium',
          timeLimit: 15, // 15 phút
          questions: quizQuestions
        });
      }
    }

    // Cập nhật State toàn cục
    window.AppState.allQuestions = allQuestions;
    window.AppState.allQuizzes = quizzes;

    // Lưu vào LocalStorage
    localStorage.setItem('all_questions_bank', JSON.stringify(allQuestions));
    localStorage.setItem('all_quizzes_data', JSON.stringify(quizzes));

    console.log(`✅ Đã nạp thành công ${allQuestions.length} câu hỏi và ${quizzes.length} đề thi!`);
  } catch (error) {
    console.warn("⚠️ Chưa thể nạp data/questions.json qua fetch:", error);
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  try {
    console.log("🚀 Đang khởi chạy hệ thống Adaptive Quiz System...");

    // 1. Nạp toàn bộ các giao diện HTML thành phần
    if (typeof initAllComponents === 'function') {
      await initAllComponents();
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
    
    if (window.Auth && typeof window.Auth.init === 'function') {
      await window.Auth.init();
    }

    // 4. Nạp dữ liệu danh sách bài kiểm tra & Ngân hàng câu hỏi vào AppState
    await loadQuestionsData();

    // 5. Khởi tạo và lắng nghe sự kiện riêng cho các module
    if (typeof initStudentModule === 'function') initStudentModule();
    if (typeof initAdminCoreModule === 'function') initAdminCoreModule();
    if (typeof initAdminQuizzesModule === 'function') initAdminQuizzesModule();
    if (typeof initAdminBankModule === 'function') initAdminBankModule();
    if (typeof initAdminUsersModule === 'function') initAdminUsersModule();
    if (typeof initAdminReportsModule === 'function') initAdminReportsModule();
    if (typeof initAdminToolsModule === 'function') initAdminToolsModule();

    // 6. Kiểm tra trạng thái đăng nhập người dùng & Điều hướng giao diện
    const currentUser = window.Auth ? window.Auth.getCurrentUser() : null;
    
    if (typeof updateNavUI === 'function') {
      updateNavUI(currentUser);
    }

    if (currentUser) {
      if (currentUser.role === 'admin') {
        if (typeof renderAdminDashboard === 'function') renderAdminDashboard();
        navigateTo('view-admin');
      } else {
        // Render danh sách đề thi cho Student trước khi chuyển View
        if (typeof filterAndRenderQuizzes === 'function') {
          filterAndRenderQuizzes();
        }
        navigateTo('view-list');
      }
    } else {
      navigateTo('view-auth');
    }

    console.log("✅ Hệ thống đã sẵn sàng và khởi chạy thành công!");
  } catch (error) {
    console.error("❌ Lỗi khởi chạy ứng dụng tại main.js:", error);
  }
});