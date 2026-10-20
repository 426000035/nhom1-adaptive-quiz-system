# 🎯 Adaptive Quiz System (Hệ thống Luyện tập & Kiểm tra Thích ứng)

> **Tổng quan hệ thống:** Hệ thống trắc nghiệm thích ứng trực tuyến xây dựng bằng HTML5, CSS3 và JavaScript thuần (ES6+). Tích hợp tính năng làm bài thời gian thực, phân tích điểm yếu và tự động sinh câu hỏi bổ trợ thông qua Google Gemini API (`gemini-1.5-flash`).

---

## 📐 1. Kiến trúc Hệ thống & Công nghệ

* **Frontend:** HTML5, CSS3 (Flexbox/Grid), JavaScript thuần (ES6+)
* **Kiến trúc:** Single Page Application (SPA) điều hướng giao diện theo trạng thái (State-driven)
* **API bên ngoài:** Google Gemini API (`gemini-1.5-flash`)
* **Lưu trữ dữ liệu:** Lưu trữ phía client (`localStorage`) và các file cấu hình JSON

### Cấu trúc thư mục dự án

```text
adaptive-quiz-system/
├── index.html              # Trang SPA chính (Chứa các giao diện Auth, List, Quiz, Result)
├── README.md               # Tài liệu hướng dẫn dự án
├── data/
│   ├── users.json          # Dữ liệu tài khoản mẫu & phân quyền
│   └── questions.json      # Ngân hàng câu hỏi tĩnh kèm metadata giải thích
├── css/
│   ├── main.css            # Biến CSS, reset style và khung layout chính
│   ├── components.css      # Style các thành phần (Card, Timer, Progress Bar, Modal)
│   └── responsive.css      # Tương thích màn hình Mobile/Tablet
└── js/
    ├── app.js              # SPA Router & Quản lý trạng thái ứng dụng
    ├── auth.js             # Đăng nhập, quản lý phiên & Phân quyền (RBAC)
    ├── quiz-engine.js      # Logic làm bài, đếm ngược, tính điểm & phân tích
    └── ai-service.js       # Gọi Gemini API để tự động sinh câu hỏi bổ trợ
```

---

## ✨ 2. Các Phân hệ Chức năng Chính

### 🔐 Xác thực & Phân quyền (`js/auth.js`)
* **Xác thực người dùng:** Đăng nhập, đăng ký và duy trì phiên đăng nhập qua `localStorage`.
* **Phân quyền người dùng (RBAC):**
  * **Student:** Làm bài kiểm tra, xem lịch sử làm bài, kích hoạt tính năng AI ôn tập câu sai.
  * **Admin:** Quản lý thông tin ngân hàng câu hỏi, xem thống kê tổng quan của học viên.

### 📋 Danh sách Đề thi & Bộ lọc (`js/app.js`)
* Phân loại đề thi theo **Chủ đề** (`HTML`, `CSS`, `JS`) và **Độ khó** (`Easy`, `Medium`, `Hard`).
* Tìm kiếm và lọc bài thi theo từ khóa thời gian thực.

### ⏱️ Trình làm bài Kiểm tra (`js/quiz-engine.js`)
* **Dạng câu hỏi:** Chọn 1 đáp án (`radio`) và chọn nhiều đáp án (`checkbox`).
* **Thành phần thời gian thực:** Đồng hồ đếm ngược tự động nộp bài khi hết giờ; Thanh tiến độ (Progress bar) cập nhật theo số câu đã làm.
* **Chấm điểm & Phân tích:** Tự động tính điểm, phần trăm chính xác, thời gian hoàn thành và thống kê kỹ năng yếu dựa trên các câu làm sai.

### 🤖 Engine AI Bổ trợ Kiến thức (`js/ai-service.js`)
* **Kích hoạt:** Bấm nút *"✨ Luyện tập lại câu sai với AI"* tại Trang Kết quả.
* **Luồng xử lý:** Trích xuất danh sách câu sai $\rightarrow$ Gửi Prompt tới Gemini API (`gemini-1.5-flash`) $\rightarrow$ Nhận kết quả định dạng JSON $\rightarrow$ Render bộ câu hỏi mới cho học viên làm lại.
* **Cơ chế Fallback:** Tự động chuyển về lấy câu hỏi từ kho lưu trữ nội bộ nếu mất mạng hoặc lỗi API Key.

---

## 📊 3. Cấu trúc Dữ liệu (Data Schemas)

### Cấu trúc Câu hỏi (`data/questions.json`)
```json
[
  {
    "id": "q_js_01",
    "topic": "JavaScript",
    "subTopic": "DOM Manipulation",
    "difficulty": "Medium",
    "type": "single",
    "question": "Thẻ nào được dùng để nhúng file JavaScript bên ngoài vào HTML?",
    "options": [
      "<script src='app.js'>",
      "<link rel='app.js'>",
      "<js file='app.js'>",
      "<import src='app.js'>"
    ],
    "correctAnswer": [0],
    "explanation": "Thẻ <script> với thuộc tính 'src' được dùng để nhúng file script.",
    "remediation": {
      "concept": "Cách nhúng JavaScript vào HTML",
      "suggestedRead": "Tham khảo tài liệu MDN về thẻ <script>"
    }
  }
]
```

### Cấu trúc Tài khoản (`data/users.json`)
```json
[
  {
    "id": "usr_01",
    "username": "student1",
    "password": "123",
    "fullName": "Phan Thị Ngọc Duyên",
    "role": "student",
    "history": []
  },
  {
    "id": "usr_02",
    "username": "admin",
    "password": "adminpassword",
    "fullName": "Administrator",
    "role": "admin"
  }
]
```

---

## 🚀 4. Hướng dẫn Cài đặt & Khởi chạy

1. **Clone repository về máy:**
   ```bash
   git clone https://github.com/your-username/adaptive-quiz-system.git
   cd adaptive-quiz-system
   ```

2. **Cấu hình Gemini API Key:**
   Mở file `js/ai-service.js` và điền API Key lấy từ Google AI Studio:
   ```javascript
   const GEMINI_API_KEY = "YOUR_GEMINI_API_KEY";
   ```

3. **Chạy ứng dụng:**
   Mở trực tiếp file `index.html` trên trình duyệt hoặc chạy bằng extension **Live Server** trong VS Code.

---

## 🗺️ 5. Lộ trình Phát triển

- [x] **Giai đoạn 1:** Dựng layout SPA và hệ thống CSS
- [x] **Giai đoạn 2:** Lập trình Quiz Engine, đồng hồ đếm ngược & logic chấm điểm
- [x] **Giai đoạn 3:** Phân hệ Đăng nhập & Điều hướng phân quyền
- [x] **Giai đoạn 4:** Tích hợp Gemini API sinh câu hỏi AI
- [ ] **Giai đoạn 5:** Chuyển đổi sang Backend API (Node.js/Express + Database)