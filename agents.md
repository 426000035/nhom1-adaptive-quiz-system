# 🤖 AI Vibe Coding Guidelines (agents.md)

> **Mục đích:** File quy tắc ngữ cảnh (Prompt Context Rules) dành riêng cho các AI Assistant / Vibe Coding Agent (Cursor, Claude Dev, Copilot, Windsurf) khi tham gia phát triển dự án **Adaptive Quiz System**.

---

## 🛠️ 1. Ràng buộc Công nghệ & Thư viện (Tech Stack Boundaries)

- **Ngôn ngữ cốt lõi:** Bắt buộc duy nhất 3 ngôn ngữ: HTML5, CSS3, JavaScript Pure (ES6+).
- **Môi trường:** Client-side 100% (Không chạy Node.js server, không dùng Build Tool như Vite/Webpack).
- **Thư viện được phép (sử dụng qua CDN):**
  - **Chart.js:** Vẽ biểu đồ phân tích kỹ năng yếu ở Trang Kết quả.
  - **SweetAlert2:** Hiển thị thông báo, popup xác nhận nộp bài.
  - **Lucide Icons:** Bộ icon giao diện modern.
  - **Canvas-Confetti:** Hiệu ứng ăn mừng khi điểm cao.
  - **Prism.js:** Highlight syntax cho các câu hỏi chứa code.

---

## 🏗️ 2. Kiến trúc & Nguyên tắc Lập trình (Architectural Rules)

1. **Single Page Application (SPA):**
   - Chỉ dùng **1 file index.html** duy nhất chứa các section: `#view-login`, `#view-register`, `#view-list`, `#view-quiz`, `#view-result`.
   - Chuyển view bằng JavaScript: Thay đổi trạng thái hiển thị qua class `.hidden` hoặc `display: none / block`.

2. **Quản lý Trạng thái Tập trung (AppState):**
   - Object AppState lưu các biến toàn cục: `currentUser`, `currentQuiz`, `answers`, `timer`, `timeRemaining`, `aiQuestions`.

3. **Nguyên tắc Viết Code JS (ES6+ Clean Code):**
   - Tách biệt rõ ràng 3 file logic: `auth.js` (Đăng nhập/Đăng ký), `quiz-engine.js` (Chấm điểm/Đếm ngược), `ai-service.js` (Gọi Gemini API).
   - Không được ghi cứng (hardcode) dữ liệu câu hỏi trong code JS, phải đọc từ `data/questions.json`.
   - Sử dụng `localStorage` để lưu phiên làm việc và lịch sử thi.

---

## 🤖 3. Quy chuẩn Prompt cho Gemini 1.5 Flash (AI Service Rules)

Khi viết hàm trong `js/ai-service.js`, AI Agent phải tuân thủ đúng định dạng Prompt sau:

- Yêu cầu AI đóng vai chuyên gia ra đề trắc nghiệm Web.
- Truyền danh sách các câu hỏi học viên làm sai dưới dạng JSON.
- Ép AI trả về DUY NHẤT một mảng JSON (Array of Objects), không có markdown hay văn bản thừa.
- Cấu trúc JSON câu hỏi bắt buộc chứa: `id`, `topic`, `subTopic`, `difficulty`, `type`, `question`, `options`, `correctAnswer`, `explanation`.

---

## 🎯 4. Quy trình làm việc cho AI Coding Assistant (Vibe Coding Workflow)

1. **Khi được yêu cầu viết HTML/CSS:** 
   - Giữ giao diện theo phong cách **Dark Mode / Modern Glassmorphism**.
   - Thiết kế Responsive hoàn chỉnh trên Desktop và Mobile.
2. **Khi được yêu cầu viết JS Logic:**
   - Kiểm tra điều kiện đầu vào (Edge Cases): Hết giờ làm bài, chưa chọn câu hỏi, chọn thiếu ô checkbox.
   - Thêm hiệu ứng SweetAlert2 cho tất cả các thông báo thay cho `alert()` mặc định.
3. **Bắt lỗi (Error Handling):**
   - Nếu gọi Gemini API lỗi -> Fallback lấy câu hỏi từ `questions.json`.