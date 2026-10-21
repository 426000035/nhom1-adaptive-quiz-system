/* ==========================================================================
   Adaptive Quiz System - State Management Module (js/state.js)
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
  
  // Trạng thái Tìm kiếm, Lọc, Sắp xếp & Phân trang riêng cho 7 Danh Sách
  listsState: {
    catalog: { searchText: '', topic: 'ALL', difficulty: 'ALL', sort: 'DEFAULT', currentPage: 1, pageSize: 10 },
    adminQuizzes: { searchText: '', topic: 'ALL', sort: 'TITLE_ASC', currentPage: 1, pageSize: 10 },
    globalBank: { searchText: '', topic: 'ALL', sort: 'TITLE_ASC', currentPage: 1, pageSize: 10 },
    adminUsers: { searchText: '', role: 'ALL', sort: 'TITLE_ASC', currentPage: 1, pageSize: 10 },
    adminReports: { searchText: '', sort: 'TITLE_ASC', currentPage: 1, pageSize: 10 },
    quizQuestions: { searchText: '', sort: 'TITLE_ASC', currentPage: 1, pageSize: 10 },
    modalBank: { searchText: '', sort: 'TITLE_ASC', currentPage: 1, pageSize: 10 }
  },

  settings: {
    topics: ["HTML5 Basic", "HTML5 Semantic", "CSS3 Selectors", "CSS3 Flexbox", "CSS3 Grid", "JS Basics", "JS DOM Manipulation"],
    difficulties: ["Easy", "Medium", "Hard"]
  }
};

/**
 * Tải danh mục Cài đặt Chủ đề & Độ khó từ localStorage
 */
function loadAdminSettings() {
  const savedSettings = localStorage.getItem('adaptive_quiz_settings');
  if (savedSettings) {
    window.AppState.settings = JSON.parse(savedSettings);
  } else {
    localStorage.setItem('adaptive_quiz_settings', JSON.stringify(window.AppState.settings));
  }
  updateFilterOptionsUI();
}

/**
 * Lưu danh mục Cài đặt Chủ đề & Độ khó vào localStorage
 */
function saveAdminSettings() {
  localStorage.setItem('adaptive_quiz_settings', JSON.stringify(window.AppState.settings));
  updateFilterOptionsUI();
}

/**
 * Cập nhật động danh sách Options Chủ đề & Độ khó cho tất cả các thẻ Select Lọc
 */
function updateFilterOptionsUI() {
  const topicSelects = [
    document.getElementById('filter-topic'),
    document.getElementById('filter-topic-admin-quizzes'),
    document.getElementById('filter-topic-global-bank')
  ];

  topicSelects.forEach(sel => {
    if (sel) {
      const currentVal = sel.value || 'ALL';
      let html = `<option value="ALL">Tất cả Chủ đề</option>`;
      if (window.AppState.settings && window.AppState.settings.topics) {
        window.AppState.settings.topics.forEach(t => {
          html += `<option value="${t}">${t}</option>`;
        });
      }
      sel.innerHTML = html;
      sel.value = currentVal;
    }
  });

  const diffSelect = document.getElementById('filter-difficulty');
  if (diffSelect) {
    const currentVal = diffSelect.value || 'ALL';
    let html = `<option value="ALL">Tất cả Độ khó</option>`;
    if (window.AppState.settings && window.AppState.settings.difficulties) {
      window.AppState.settings.difficulties.forEach(d => {
        html += `<option value="${d}">${d}</option>`;
      });
    }
    diffSelect.innerHTML = html;
    diffSelect.value = currentVal;
  }
}

/**
 * Tải dữ liệu bài thi & câu hỏi từ localStorage hoặc file JSON
 */
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
    
    if (typeof filterAndRenderQuizzes === 'function') {
      filterAndRenderQuizzes();
    }
  } catch (err) {
    console.error("Lỗi khi tải dữ liệu bài thi:", err);
  }
}

/**
 * Trích xuất câu hỏi duy nhất từ các bài thi vào Ngân hàng chung
 */
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

/**
 * Gom nhóm câu hỏi thành các đề thi mặc định
 */
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

/**
 * Đồng bộ lưu trạng thái bài thi và câu hỏi
 */
function saveQuizzesAndQuestionsToStorage() {
  extractGlobalQuestions();
  localStorage.setItem('adaptive_quizzes', JSON.stringify(window.AppState.allQuizzes));
  if (typeof filterAndRenderQuizzes === 'function') {
    filterAndRenderQuizzes();
  }
}

/**
 * Hàm Trợ Giúp Phân Trang Dùng Chung Cho Tất Cả Các Danh Sách
 */
/**
 * Hàm Render Phân Trang Tối Ưu (Rút gọn bằng dấu ...)
 */
function renderPaginationUI(containerId, totalPages, currentPage, onPageChange) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = '';

  if (totalPages <= 1) return;

  // CSS đảm bảo không bị tràn dòng & căn giữa
  container.style.display = 'flex';
  container.style.justifyContent = 'center';
  container.style.alignItems = 'center';
  container.style.flexWrap = 'wrap';
  container.style.gap = '0.35rem';

  // 1. Nút Trang Trước (Prev)
  const prevBtn = document.createElement('button');
  prevBtn.className = `btn btn-outline ${currentPage === 1 ? 'disabled' : ''}`;
  prevBtn.style.padding = '0.25rem 0.5rem';
  prevBtn.innerHTML = `<i data-lucide="chevron-left"></i>`;
  prevBtn.disabled = (currentPage === 1);
  prevBtn.onclick = () => onPageChange(currentPage - 1);
  container.appendChild(prevBtn);

  // 2. Thuật toán tính toán mảng các số trang cần hiển thị
  const pages = [];
  const delta = 1; // Số lượng trang hiển thị bên cạnh trang hiện tại

  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || (i >= currentPage - delta && i <= currentPage + delta)) {
      pages.push(i);
    } else if (pages[pages.length - 1] !== '...') {
      pages.push('...');
    }
  }

  // 3. Render các nút trang & dấu ...
  pages.forEach(p => {
    if (p === '...') {
      const dots = document.createElement('span');
      dots.style.padding = '0 0.35rem';
      dots.style.color = 'var(--text-muted)';
      dots.style.userSelect = 'none';
      dots.textContent = '...';
      container.appendChild(dots);
    } else {
      const pageBtn = document.createElement('button');
      pageBtn.className = `btn ${p === currentPage ? 'btn-primary' : 'btn-outline'}`;
      pageBtn.style.padding = '0.25rem 0.6rem';
      pageBtn.style.minWidth = '2rem';
      pageBtn.textContent = p;
      pageBtn.onclick = () => onPageChange(p);
      container.appendChild(pageBtn);
    }
  });

  // 4. Nút Trang Sau (Next)
  const nextBtn = document.createElement('button');
  nextBtn.className = `btn btn-outline ${currentPage === totalPages ? 'disabled' : ''}`;
  nextBtn.style.padding = '0.25rem 0.5rem';
  nextBtn.innerHTML = `<i data-lucide="chevron-right"></i>`;
  nextBtn.disabled = (currentPage === totalPages);
  nextBtn.onclick = () => onPageChange(currentPage + 1);
  container.appendChild(nextBtn);

  if (typeof lucide !== 'undefined') lucide.createIcons();
}