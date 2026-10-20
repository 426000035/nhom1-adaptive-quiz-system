# 📑 Data Contracts & Schemas - Adaptive Quiz System

> **Tài liệu Hợp đồng Dữ liệu (Data Contract Document)** quy định chi tiết cấu trúc dữ liệu JSON, kiểu dữ liệu (data types), các trường bắt buộc/tùy chọn và dữ liệu mẫu (mock data) được trao đổi giữa Frontend, Client Storage (`localStorage`) và Google Gemini API (`gemini-1.5-flash`).

---

## 1. Dữ liệu Ngân hàng Câu hỏi (`data/questions.json`)

### Schema Specification
Mỗi câu hỏi trong hệ thống phải tuân thủ nghiêm ngặt JSON Schema sau:

| Trường (Field) | Kiểu dữ liệu | Bắt buộc | Mô tả |
| :--- | :--- | :--- | :--- |
| `id` | `String` | Có | Định danh duy nhất của câu hỏi (VD: `"q_js_01"`). |
| `topic` | `String` | Có | Chủ đề chính (`"HTML5"`, `"CSS3"`, `"JavaScript"`). |
| `subTopic` | `String` | Có | Khái niệm cụ thể (VD: `"DOM Manipulation"`, `"Flexbox"`, `"Promises"`). |
| `difficulty` | `String` | Có | Mức độ khó: `"Easy"`, `"Medium"`, `"Hard"`. |
| `type` | `String` | Có | Loại câu hỏi: `"single"` (chọn 1) hoặc `"multiple"` (chọn nhiều). |
| `question` | `String` | Có | Nội dung văn bản câu hỏi. |
| `options` | `Array<String>`| Có | Mảng chứa danh sách các phương án trả lời. |
| `correctAnswer` | `Array<Number>`| Có | Mảng chứa chỉ số (index bắt đầu từ 0) của đáp án đúng. |
| `explanation` | `String` | Có | Lời giải thích chi tiết vì sao đáp án đúng. |
| `remediation` | `Object` | Không | Thông tin bổ trợ củng cố kiến thức (Khái niệm & Tài liệu đọc thêm). |

### Example Data Block
```json
[
  {
    "id": "q_html_01",
    "topic": "HTML5",
    "subTopic": "Form Attributes",
    "difficulty": "Easy",
    "type": "single",
    "question": "Thuộc tính nào trong HTML5 được dùng để buộc người dùng phải điền thông tin trước khi nộp form?",
    "options": [
      "validate",
      "required",
      "important",
      "mandatory"
    ],
    "correctAnswer": [1],
    "explanation": "Thuộc tính 'required' là thuộc tính boolean trong HTML5 ngăn không cho nộp form nếu ô input bị trống.",
    "remediation": {
      "concept": "Ràng buộc dữ liệu Form HTML5",
      "suggestedRead": "Tham khảo tài liệu MDN về HTML5 Form Validation"
    }
  },
  {
    "id": "q_css_01",
    "topic": "CSS3",
    "subTopic": "Flexbox Alignment",
    "difficulty": "Medium",
    "type": "multiple",
    "question": "Những thuộc tính nào sau đây được dùng để căn chỉnh các phần tử con theo trục chính (Main Axis) và trục phụ (Cross Axis) trong Flexbox?",
    "options": [
      "justify-content",
      "grid-template-columns",
      "align-items",
      "float"
    ],
    "correctAnswer": [0, 2],
    "explanation": "'justify-content' căn chỉnh theo trục chính (Main Axis), còn 'align-items' căn chỉnh theo trục phụ (Cross Axis).",
    "remediation": {
      "concept": "Sắp xếp phần tử với Flexbox",
      "suggestedRead": "A Complete Guide to Flexbox (CSS-Tricks)"
    }
  }
]
```

---

## 2. Dữ liệu Người dùng & Phân quyền (`data/users.json`)

### Schema Specification

| Trường (Field) | Kiểu dữ liệu | Bắt buộc | Mô tả |
| :--- | :--- | :--- | :--- |
| `id` | `String` | Có | Định danh người dùng (VD: `"usr_01"`). |
| `username` | `String` | Có | Tên tài khoản đăng nhập. |
| `password` | `String` | Có | Mật khẩu tài khoản. |
| `fullName` | `String` | Có | Họ và tên hiển thị. |
| `role` | `String` | Có | Vai trò: `"student"` (Học viên) hoặc `"admin"` (Quản trị viên). |
| `history` | `Array<Object>`| Có | Danh sách lưu vết lịch sử các lần thi trắc nghiệm. |

### History Item Schema

| Trường (Field) | Kiểu dữ liệu | Mô tả |
| :--- | :--- | :--- |
| `quizId` | `String` | ID của bài thi đã làm. |
| `score` | `Number` | Điểm số đạt được (Thang điểm 10). |
| `totalQuestions` | `Number` | Tổng số câu hỏi trong bài thi. |
| `correctCount` | `Number` | Số câu làm đúng. |
| `timeSpentSeconds`| `Number` | Thời gian hoàn thành bài thi (tính bằng giây). |
| `completedAt` | `String` | Thời gian hoàn thành (Định dạng ISO 8601 UTC). |

### Example Data Block
```json
[
  {
    "id": "usr_01",
    "username": "student1",
    "password": "123",
    "fullName": "Phan Thị Ngọc Duyên",
    "role": "student",
    "history": [
      {
        "quizId": "quiz_js_basic",
        "score": 8,
        "totalQuestions": 10,
        "correctCount": 8,
        "timeSpentSeconds": 420,
        "completedAt": "2026-10-19T10:30:00Z"
      }
    ]
  },
  {
    "id": "usr_02",
    "username": "admin",
    "password": "adminpassword",
    "fullName": "Administrator",
    "role": "admin",
    "history": []
  }
]
```

---

## 3. Hợp đồng API Sinh Câu hỏi với Gemini (`gemini-1.5-flash`)

### 3.1. Request Structure (Prompt Payload)
Đoạn bối cảnh (Context) thu thập các câu hỏi bị làm sai từ `AppState.lastResult.wrongQuestions` gửi sang Gemini API:

```json
{
  "contents": [
    {
      "parts": [
        {
          "text": "Bạn là hệ thống tạo câu hỏi trắc nghiệm tự động. Dưới đây là danh sách các câu làm SAI:\n[...Array of Missed Questions...]\n\nHãy tạo 3 câu hỏi trắc nghiệm MỚI củng cố đúng các lỗ hổng kiến thức trên. Trả về DUY NHẤT một chuỗi JSON thuần tuân thủ đúng Schema."
        }
      ]
    }
  ],
  "generationConfig": {
    "responseMimeType": "application/json",
    "temperature": 0.7
  }
}
```

### 3.2. Response Structure (Expected Output)
Gemini API bắt buộc phải trả về một mảng JSON tuân theo đúng cấu trúc của **Question Schema (Section 1)**:

```json
[
  {
    "id": "ai_gen_101",
    "topic": "JavaScript",
    "subTopic": "DOM Manipulation",
    "difficulty": "Easy",
    "type": "single",
    "question": "Phương thức nào trong JavaScript được dùng để chọn một phần tử HTML bằng ID của nó?",
    "options": [
      "document.getElementById()",
      "document.querySelectorID()",
      "document.getElementByClass()",
      "document.findId()"
    ],
    "correctAnswer": [0],
    "explanation": "'document.getElementById()' trả về phần tử HTML có thuộc tính id tương ứng.",
    "remediation": {
      "concept": "Truy vấn phần tử DOM trong JS",
      "suggestedRead": "MDN Document.getElementById"
    }
  }
]
```