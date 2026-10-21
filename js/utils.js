/* ==========================================================================
   Adaptive Quiz System - Common Utilities & Helpers (js/utils.js)
   ========================================================================== */

// 1. Quản lý trạng thái listsState toàn cục nếu chưa có
window.AppState = window.AppState || {
  allQuizzes: [],
  allQuestions: [],
  currentQuiz: null,
  currentQuestions: [],
  currentQuestionIndex: 0,
  answers: {},
  quizResults: null,
  selectedQuizIdForAdmin: null,
  settings: {
    topics: ["Lập trình Web", "Cơ sở dữ liệu", "Mạng máy tính", "Toán rời rạc"],
    difficulties: ["Easy", "Medium", "Hard"]
  },
  listsState: {
    catalog: { searchText: '', topic: 'ALL', difficulty: 'ALL', sort: 'DEFAULT', pageSize: '10', currentPage: 1 },
    adminQuizzes: { searchText: '', topic: 'ALL', sort: 'TITLE_ASC', pageSize: '10', currentPage: 1 },
    globalBank: { searchText: '', topic: 'ALL', sort: 'TITLE_ASC', pageSize: '10', currentPage: 1 },
    adminUsers: { searchText: '', role: 'ALL', sort: 'TITLE_ASC', pageSize: '10', currentPage: 1 },
    adminReports: { searchText: '', sort: 'TITLE_ASC', pageSize: '10', currentPage: 1 },
    quizQuestions: { searchText: '', sort: 'TITLE_ASC', pageSize: '10', currentPage: 1 },
    modalBank: { searchText: '', sort: 'TITLE_ASC', pageSize: '10', currentPage: 1 }
  }
};

// 2. Hàm gắn sự kiện tự động cho bộ lọc, tìm kiếm, sắp xếp và phân trang của danh sách
function bindListEvents(elementIds, listKey, callback) {
  elementIds.forEach((id, index) => {
    const el = document.getElementById(id);
    if (!el) return;

    if (index === 0) {
      // Ô tìm kiếm (Input real-time)
      el.addEventListener('input', () => {
        window.AppState.listsState[listKey].currentPage = 1;
        callback();
      });
    } else {
      // Các thẻ Select (Lọc, Sắp xếp, PageSize)
      el.addEventListener('change', () => {
        window.AppState.listsState[listKey].currentPage = 1;
        callback();
      });
    }
  });
}

// 3. Render thanh phân trang giao diện có dấu ...
function renderPaginationUI(containerId, totalPages, currentPage, onPageChange) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = '';

  if (totalPages <= 1) return;

  const createBtn = (text, pageNum, disabled = false, active = false) => {
    const btn = document.createElement('button');
    btn.className = `btn ${active ? 'btn-primary' : 'btn-outline'}`;
    btn.style.padding = '0.25rem 0.6rem';
    btn.style.fontSize = '0.85rem';
    btn.textContent = text;
    if (disabled) {
      btn.disabled = true;
      btn.style.opacity = '0.5';
    } else {
      btn.addEventListener('click', () => onPageChange(pageNum));
    }
    return btn;
  };

  // Nút Trang trước
  container.appendChild(createBtn('«', currentPage - 1, currentPage === 1));

  // Thuật toán hiển thị trang có dấu ...
  let pages = [];
  if (totalPages <= 7) {
    pages = Array.from({ length: totalPages }, (_, i) => i + 1);
  } else {
    if (currentPage <= 4) {
      pages = [1, 2, 3, 4, 5, '...', totalPages];
    } else if (currentPage >= totalPages - 3) {
      pages = [1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
    } else {
      pages = [1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages];
    }
  }

  pages.forEach(p => {
    if (p === '...') {
      const span = document.createElement('span');
      span.textContent = '...';
      span.style.padding = '0.25rem 0.5rem';
      span.style.color = 'var(--text-muted)';
      container.appendChild(span);
    } else {
      container.appendChild(createBtn(p, p, false, p === currentPage));
    }
  });

  // Nút Trang sau
  container.appendChild(createBtn('»', currentPage + 1, currentPage === totalPages));
}

// 4. Trích xuất toàn bộ câu hỏi từ các đề thi vào kho chung
function extractGlobalQuestions() {
  const map = new Map();
  if (window.AppState && window.AppState.allQuizzes) {
    window.AppState.allQuizzes.forEach(quiz => {
      if (quiz.questions && Array.isArray(quiz.questions)) {
        quiz.questions.forEach(q => {
          if (q && q.id) {
            map.set(q.id, {
              ...q,
              topic: q.topic || quiz.topic || 'Chung',
              difficulty: q.difficulty || quiz.difficulty || 'Medium'
            });
          }
        });
      }
    });
  }
  window.AppState.allQuestions = Array.from(map.values());
}

// 5. Lưu trữ Quizzes & Questions vào localStorage
function saveQuizzesAndQuestionsToStorage() {
  localStorage.setItem('all_quizzes_data', JSON.stringify(window.AppState.allQuizzes));
  extractGlobalQuestions();
}

// 6. Tải dữ liệu câu hỏi khởi tạo ban đầu
async function loadQuestionsData() {
  const localData = localStorage.getItem('all_quizzes_data');
  if (localData) {
    try {
      window.AppState.allQuizzes = JSON.parse(localData);
    } catch (e) {
      window.AppState.allQuizzes = [];
    }
  } else {
    // Dữ liệu mẫu mặc định nếu chưa có
    window.AppState.allQuizzes = [
      {
        id: "quiz_sample_1",
        title: "Kiểm tra kiến thức Lập trình Web cơ bản",
        topic: "Lập trình Web",
        difficulty: "Easy",
        timeLimit: 15,
        questions: [
          {
            id: "q_101",
            topic: "Lập trình Web",
            difficulty: "Easy",
            type: "single",
            question: "Thẻ HTML nào dùng để tạo một siêu liên kết (hyperlink)?",
            options: ["<a>", "<link>", "<href>", "<url>"],
            correctAnswer: [0],
            explanation: "Thẻ <a> (anchor) được sử dụng để tạo liên kết chuyển hướng trang trong HTML."
          },
          {
            id: "q_102",
            topic: "Lập trình Web",
            difficulty: "Medium",
            type: "single",
            question: "Thuộc tính CSS nào dùng để thay đổi màu chữ?",
            options: ["text-color", "color", "font-color", "background-color"],
            correctAnswer: [1],
            explanation: "Thuộc tính 'color' trong CSS dùng để định dạng màu sắc cho văn bản."
          }
        ]
      }
    ];
    localStorage.setItem('all_quizzes_data', JSON.stringify(window.AppState.allQuizzes));
  }
  extractGlobalQuestions();
}

// 7. Tải cài đặt Admin từ localStorage
function loadAdminSettings() {
  const saved = localStorage.getItem('admin_settings');
  if (saved) {
    try {
      window.AppState.settings = JSON.parse(saved);
    } catch (e) {}
  }
}

function saveAdminSettings() {
  localStorage.setItem('admin_settings', JSON.stringify(window.AppState.settings));
}

/* ==========================================================================
   Adaptive Quiz System - Common Utilities & Helpers (js/utils.js)
   ========================================================================== */

// ... (Giữ nguyên các phần 1 đến 7 ở trên) ...

// 8. Điều hướng Views giao diện đơn trang (SPA Navigation) - ĐÃ SỬA CLASS SELECTOR
function navigateTo(viewId) {
  console.log("Đang chuyển sang View:", viewId);
  
  // Sửa từ .app-view thành .view-section cho đúng với index.html
  document.querySelectorAll('.view-section').forEach(v => {
    v.classList.add('hidden');
  });

  const target = document.getElementById(viewId);
  if (target) {
    target.classList.remove('hidden');
  } else {
    console.error(`Không tìm thấy view có ID: ${viewId}`);
  }
}

// 9. Cập nhật giao diện Header theo trạng thái đăng nhập - ĐÃ SỬA ID KHỚP HTML
function updateNavUI(user) {
  const navGuest = document.getElementById('nav-guest');
  const navUser = document.getElementById('nav-user');
  const userFullname = document.getElementById('user-fullname');
  const userRoleBadge = document.getElementById('user-role-badge');

  if (user) {
    if (navGuest) navGuest.classList.add('hidden');
    if (navUser) navUser.classList.remove('hidden');
    
    if (userFullname) userFullname.textContent = user.fullName || user.username;
    if (userRoleBadge) {
      userRoleBadge.textContent = user.role ? user.role.toUpperCase() : 'STUDENT';
      userRoleBadge.className = `badge ${user.role === 'admin' ? 'badge-admin' : 'badge-student'}`;
    }
  } else {
    if (navGuest) navGuest.classList.remove('hidden');
    if (navUser) navUser.classList.add('hidden');
  }
}

/* ==========================================================================
   Adaptive Quiz System - Dynamic Component Loader (Thêm vào cuối js/utils.js)
   ========================================================================== */

/**
 * Hàm nạp nội dung file HTML từ đường dẫn và chèn vào thẻ container tương ứng
 * @param {string} containerId - ID của thẻ HTML chứa nội dung
 * @param {string} filePath - Đường dẫn tới file component .html
 */
async function loadComponent(containerId, filePath) {
  try {
    const response = await fetch(filePath);
    if (!response.ok) {
      throw new Error(`Không thể tải file: ${filePath} (Status: ${response.status})`);
    }
    const htmlText = await response.text();
    const container = document.getElementById(containerId);
    if (container) {
      container.innerHTML = htmlText;
    } else {
      console.warn(`Không tìm thấy thẻ container có ID: ${containerId}`);
    }
  } catch (error) {
    console.error(`Lỗi khi nạp component [${filePath}]:`, error);
  }
}

/**
 * Khởi tạo và nạp toàn bộ các views & tab thành phần vào ứng dụng
 */
async function initAllComponents() {
  // 1. Nạp các màn hình View chính
  await Promise.all([
    loadComponent('view-auth', 'views/auth.html'),
    loadComponent('view-list', 'views/student-catalog.html'),
    loadComponent('view-quiz', 'views/student-quiz.html'),
    loadComponent('view-result', 'views/student-result.html'),
    loadComponent('view-admin', 'views/admin-dashboard.html'),
    loadComponent('modals-holder', 'views/modals.html')
  ]);

  // 2. Nạp 5 Tab con bên trong Admin Dashboard
  await Promise.all([
    loadComponent('holder-tab-quizzes', 'views/admin/tab-quizzes.html'),
    loadComponent('holder-tab-bank', 'views/admin/tab-bank.html'),
    loadComponent('holder-tab-users', 'views/admin/tab-users.html'),
    loadComponent('holder-tab-reports', 'views/admin/tab-reports.html'),
    loadComponent('holder-tab-tools', 'views/admin/tab-tools.html')
  ]);

  // 3. Khởi tạo lại biểu tượng Lucide sau khi toàn bộ HTML đã được render vào DOM
  if (typeof lucide !== 'undefined') {
    lucide.createIcons();
  }
}