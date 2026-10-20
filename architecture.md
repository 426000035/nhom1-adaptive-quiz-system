# 🏛️ System Architecture (`architecture.md`)

> **Adaptive Quiz System** - Single Page Application (SPA) Client-side Architecture

---

## 1. High-Level Architecture Overview

Hệ thống được thiết kế theo kiến trúc **Single Page Application (SPA)** thuần túy chạy hoàn toàn trên trình duyệt (Client-side 100%). Không yêu cầu môi trường Node.js hay server backend truyền thống.

```
+-----------------------------------------------------------------------+
|                            INDEX.HTML (SPA)                           |
|  +----------------+  +-----------------+  +------------------------+  |
|  | Auth View      |  | Test Catalog    |  | Quiz Engine View       |  |
|  | (#view-login)  |  | (#view-list)    |  | (#view-quiz)           |  |
|  +----------------+  +-----------------+  +------------------------+  |
|  +-----------------------------------------------------------------+  |
|  | Results & AI Remediation View (#view-result)                    |  |
|  +-----------------------------------------------------------------+  |
+-----------------------------------------------------------------------+
                                   |
                                   v
+-----------------------------------------------------------------------+
|                           JAVASCRIPT CORE                             |
|  +---------------+  +------------------+  +------------------------+  |
|  | auth.js       |  | quiz-engine.js   |  | ai-service.js          |  |
|  | (RBAC & Auth) |  | (Timer & Score)  |  | (Gemini 1.5 Flash API) |  |
|  +---------------+  +------------------+  +------------------------+  |
|  +-----------------------------------------------------------------+  |
|  | app.js (Central State Manager: AppState & Router)                |  |
|  +-----------------------------------------------------------------+  |
+-----------------------------------------------------------------------+
                 |                                     |
                 v                                     v
+---------------------------------+   +---------------------------------+
|      LOCAL STORAGE & JSON       |   |      CDN CLIENT LIBRARIES      |
|  - data/questions.json          |   |  - Chart.js (Radar/Pie)         |
|  - data/users.json              |   |  - SweetAlert2 (Popups)         |
|  - localStorage (Session&Hist)  |   |  - Lucide Icons & CanvasConfetti|
+---------------------------------+   +---------------------------------+
```

---

## 2. Centralized State Management (`AppState`)

Ứng dụng quản lý trạng thái tập trung thông qua Object `AppState` trong `app.js`:

```javascript
window.AppState = {
  currentUser: null,       // Thông tin User hiện tại (id, username, role, history)
  currentQuiz: null,       // Đề thi đang được chọn
  currentQuestions: [],    // Danh sách câu hỏi của bài thi hiện tại
  answers: {},             // Đáp án người dùng chọn { "q1": [0], "q2": [1, 3] }
  timerInterval: null,     // Reference của setInterval đếm ngược
  timeRemaining: 0,        // Thời gian còn lại (tính bằng giây)
  quizStartTime: null,     // Thời điểm bắt đầu làm bài
  quizResults: null,       // Kết quả sau khi chấm điểm
  aiQuestions: null        // Bộ câu hỏi sinh ra từ Gemini API
};
```

---

## 3. Data Flow & Routing Sequence

1. **Routing:** Dựa trên hàm `app.navigateTo(viewId)`. Hàm này sẽ ẩn tất cả các section `.view-section` và chỉ hiển thị section có ID tương ứng.
2. **Auth Flow:** `auth.js` xác thực với `data/users.json` hoặc dữ liệu lưu trong `localStorage`.
3. **Quiz Flow:** 
   - User chọn đề -> `quiz-engine.js` lọc câu hỏi từ `data/questions.json` -> Render UI & Bật Timer.
   - Khi nộp bài -> Dừng Timer -> So khớp đáp án -> Render Trang Kết quả & Báo điểm.
4. **AI Remediation Flow:**
   - User bấm "Luyện tập câu sai với AI" -> `ai-service.js` gom các câu trả lời sai -> Gửi POST Request đến Gemini API (`gemini-1.5-flash`).
   - Nhận mảng JSON câu hỏi mới -> Load ngược vào `AppState.currentQuestions` và kích hoạt lại Trang Làm bài.

---

## 4. External Integration: Gemini API (`gemini-1.5-flash`)

- **Endpoint:** `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent`
- **Request Format:** JSON Payload chứa Prompt yêu cầu trả về duy nhất mảng JSON.
- **Error Handling:** Sử dụng khối `try...catch`. Nếu mất mạng hoặc API Key hết lượt (Quota Exceeded), hệ thống sẽ tự động chuyển sang Fallback Mode (lấy câu hỏi dự phòng từ `questions.json`).
