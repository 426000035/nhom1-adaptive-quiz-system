# 🛠️ AI Vibe Coding Skills & Handlers Specification (skills.md)

> Adaptive Quiz System - Client-side Functionalities, State Handlers, and AI Execution Skills

---

## 1. System Core Skills (Chức năng Hệ thống Cốt lõi)

### 🔑 SKILL-01: Authentication & Session Skill (`js/auth.js`)
- Description: Xử lý đăng nhập, đăng ký, lưu giữ phiên làm việc và phân quyền người dùng (Role-Based Access Control).
- State Mutated: AppState.currentUser
- Executable Handlers:
  - auth.login(username, password): Xác thực thông tin người dùng từ users.json hoặc localStorage. Lưu phiên đăng nhập nếu thành công.
  - auth.register(userData): Kiểm tra username trùng lặp và tạo tài khoản mới với role mặc định là 'student'.
  - auth.checkSession(): Kiểm tra token/thông tin lưu trong localStorage khi ứng dụng vừa khởi chạy.
  - auth.logout(): Xóa dữ liệu phiên khỏi localStorage và chuyển hướng về view login.

### 📋 SKILL-02: Quiz Catalog & Routing Skill (`js/app.js`)
- Description: Điều phối hiển thị các View (SPA Router) và lọc danh sách đề thi theo điều kiện.
- State Mutated: AppState.currentQuiz, AppState.currentQuestions
- Executable Handlers:
  - app.navigateTo(viewId): Hidden tất cả các section `.view-section` và hiển thị section tương ứng (`#view-login`, `#view-list`, `#view-quiz`, `#view-result`).
  - app.filterQuizzes(topic, difficulty): Lọc dữ liệu đề thi theo chủ đề (HTML, CSS, JS) và độ khó (Easy, Medium, Hard).
  - app.renderQuizList(): Render thẻ danh sách bài thi kèm thông tin số câu và thời gian.

### ⏱️ SKILL-03: Quiz Engine & Timer Skill (`js/quiz-engine.js`)
- Description: Quản lý lượt làm bài, ghi nhận đáp án thời gian thực, chạy đồng hồ đếm ngược và tự động chấm điểm.
- State Mutated: AppState.answers, AppState.timeRemaining, AppState.timerInterval, AppState.quizResults
- Executable Handlers:
  - quizEngine.start(quizId): Tải câu hỏi vào AppState.currentQuestions, reset đáp án, bật đếm ngược.
  - quizEngine.recordAnswer(questionId, selectedOptions): Cập nhật mảng đáp án người dùng chọn vào AppState.answers.
  - quizEngine.updateProgressBar(): Tính tỷ lệ % số câu đã trả lời để cập nhật thanh tiến độ CSS.
  - quizEngine.startTimer(durationInSeconds): Chạy setInterval từng giây. Tự động gọi submit() khi timeRemaining <= 0.
  - quizEngine.submit(): Dừng timer, so khớp AppState.answers với correctAnswer, tính % điểm và trả về quizResults.

### 📊 SKILL-04: Analytics & Weakness Detection Skill (`js/quiz-engine.js`)
- Description: Phân tích các câu làm sai để trích xuất danh sách chủ đề/kỹ năng bị hổng.
- State Mutated: AppState.quizResults.weakConcepts
- Executable Handlers:
  - analytics.getWrongQuestions(): Trích xuất danh sách các câu hỏi người dùng trả lời chưa đúng.
  - analytics.extractWeakConcepts(wrongQuestions): Gom nhóm theo subTopic và khái niệm remediation.concept.
  - analytics.renderChart(canvasId, results): Dùng Chart.js vẽ biểu đồ Radar/Bar thể hiện tỷ lệ đúng theo từng chủ đề.

---

## 2. AI Agent Integration Skills (Phân hệ AI Bổ trợ)

### 🤖 SKILL-05: AI Remediation Question Generator (`js/ai-service.js`)
- Description: Tích hợp Google Gemini API (`gemini-1.5-flash`) để tự động tạo câu hỏi trắc nghiệm củng cố dựa trên danh sách câu làm sai.
- State Mutated: AppState.aiQuestions, AppState.currentQuestions
- Target Endpoint: https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent
- Executable Handlers:
  - aiService.generateRemediationQuiz(wrongQuestions):
    1. Trích xuất danh sách câu sai và bối cảnh kiến thức.
    2. Xây dựng Prompt kỹ thuật ép Gemini trả về duy nhất mảng JSON.
    3. Gửi fetch API đến Gemini Endpoint với responseMimeType: "application/json".
    4. Bóc tách JSON text và parse thành mảng câu hỏi mới.
  - aiService.fallbackToStaticBank(wrongQuestions): Kích hoạt tự động khi lỗi kết nối hoặc API Key hết hạn để lấy câu hỏi dự phòng từ questions.json.

---

## 3. Client-Side UI & Library Integration Skills

### 🎨 SKILL-06: Interactive UI Feedback Skill
- Description: Điều khiển các thư viện CDN để mang lại phản hồi giao diện sinh động.
- Integrated Libraries: SweetAlert2, Canvas-Confetti, Prism.js, Lucide Icons.
- Executable Handlers:
  - ui.showAlert(title, text, icon): Hiển thị popup thông báo bằng SweetAlert2.
  - ui.showConfirm(title, text, onConfirm): Popup xác nhận trước khi nộp bài sớm.
  - ui.triggerConfetti(): Bắn pháo hoa bằng canvas-confetti khi đạt điểm từ 80% trở lên.
  - ui.highlightCode(): Kích hoạt Prism.highlightAll() tô màu mã nguồn trong các câu hỏi code.
  - ui.refreshIcons(): Gọi lucide.createIcons() để render biểu tượng mới sau khi thay đổi DOM.