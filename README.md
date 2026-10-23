# Adaptive Quiz System

## 1. Tên dự án và thành viên

- **Tên nhóm:** [CẦN BỔ SUNG]
- **Tên dự án:** Adaptive Quiz System
- **Môn học/lớp:** [CẦN BỔ SUNG]
- **Giảng viên:** [CẦN BỔ SUNG]

| Thành viên | Vai trò | Nhiệm vụ |
|---|---|---|
| [CẦN BỔ SUNG] | Scrum Master | Theo dõi tiến độ, điều phối công việc và tổng hợp kết quả |
| [CẦN BỔ SUNG] | Dev Team | Phát triển giao diện và chức năng [ghi rõ phần phụ trách] |
| [CẦN BỔ SUNG] | Dev Team | Phát triển giao diện và chức năng [ghi rõ phần phụ trách] |
| [CẦN BỔ SUNG] | Dev Team | Kiểm thử, tài liệu hoặc chức năng [ghi rõ phần phụ trách] |

> Bổ sung hoặc xóa các dòng thành viên để khớp với danh sách thực tế của nhóm.

## 2. Mô tả dự án

Adaptive Quiz System là ứng dụng web hỗ trợ học viên làm các đề được giao, xem kết quả và theo dõi lịch sử, tiến độ học tập. Các đề được giao chạy ở chế độ thử thách có thời gian; học viên cũng có thể tạo bài ôn câu sai bằng AI. Giáo viên có thể quản lý đề thi, ngân hàng câu hỏi, danh mục môn/kỹ năng, tài khoản và lớp học, đồng thời xem báo cáo.

Dự án hướng đến việc giải quyết các vấn đề:
- Học viên khó tự đánh giá mức độ nắm vững kiến thức.
- Người học cần biết câu nào sai và hiểu lý do sai để ôn tập hiệu quả.
- Giáo viên cần một nơi quản lý đề, câu hỏi và theo dõi kết quả học tập.

### Liên hệ với 5 chủ đề được giao

> **[CẦN BỔ SUNG]** Tên chính xác của 5 chủ đề do giảng viên giao chưa được cung cấp. Hãy điền chủ đề và mô tả chức năng/giải pháp tương ứng; không nên tự suy đoán tên chủ đề.

| Chủ đề được giao | Vấn đề cần giải quyết | Phần chức năng liên quan |
|---|---|---|
| 1. [CẦN BỔ SUNG] | [CẦN BỔ SUNG] | [CẦN BỔ SUNG] |
| 2. [CẦN BỔ SUNG] | [CẦN BỔ SUNG] | [CẦN BỔ SUNG] |
| 3. [CẦN BỔ SUNG] | [CẦN BỔ SUNG] | [CẦN BỔ SUNG] |
| 4. [CẦN BỔ SUNG] | [CẦN BỔ SUNG] | [CẦN BỔ SUNG] |
| 5. [CẦN BỔ SUNG] | [CẦN BỔ SUNG] | [CẦN BỔ SUNG] |

## 3. Công nghệ và chức năng

- HTML5, CSS3 và JavaScript thuần.
- Ứng dụng SPA chạy phía trình duyệt, không cần backend để chạy các chức năng cơ bản.
- `localStorage` lưu database demo gồm tài khoản, đề thi, câu hỏi, lịch sử và tiến độ trên trình duyệt hiện tại; phiên đăng nhập cục bộ lưu ID tài khoản.
- Các thư viện giao diện được tải qua CDN: Lucide Icons, Chart.js, SweetAlert2, Canvas Confetti và Prism.js.
- Tích hợp Gemini để hỗ trợ tạo câu hỏi ôn tập từ câu sai. Khi các request thất bại, fallback hiện sao chép câu sai với ID mới; không lấy câu thay thế từ `data/questions.json`.
- Ứng dụng hiện chạy client-side, không có backend; API key Gemini được đặt trong JavaScript phía client và có thể bị lộ. Không dùng dữ liệu/mật khẩu thật hoặc triển khai công khai với cấu hình key hiện tại.

Các chức năng chính:
- Đăng nhập demo bằng username/mật khẩu; giáo viên có thể tạo tài khoản học viên. Không có tự đăng ký.
- Tìm kiếm, lọc danh sách đề thi.
- Làm đề được giao có tính giờ; xem lại bài đã làm và ôn tập câu sai với AI.
- Chấm điểm, xem giải thích và lưu lịch sử làm bài.
- Học viên theo dõi tiến độ; quản trị viên quản lý đề thi, ngân hàng câu hỏi, người dùng và báo cáo.

## 4. Hướng dẫn chạy

### Chạy trên máy cá nhân

Ứng dụng dùng `fetch()` để tải HTML và JSON, vì vậy cần chạy qua static web server; không mở trực tiếp bằng `file://`. Không cần cài Node.js, bundler hay framework để chạy ứng dụng.

1. Mở thư mục dự án trong VS Code.
2. Cài và khởi chạy extension **Live Server** từ tệp `index.html`.
3. Truy cập địa chỉ local mà Live Server cung cấp.

### Live Demo

- **GitHub Pages/Vercel:** [CẦN BỔ SUNG URL SAU KHI DEPLOY]
- **Kho mã nguồn:** [CẦN BỔ SUNG URL REPOSITORY]

> Ứng dụng lưu dữ liệu trong `localStorage` của trình duyệt, nên dữ liệu demo không tự đồng bộ giữa các thiết bị.

## 5. Prompt nổi bật đã dùng

> **Lưu ý:** Các nội dung dưới đây là prompt mẫu dựa trên chức năng của dự án, không phải lịch sử prompt đã được xác nhận. Hãy thay bằng 3–5 prompt nguyên văn hoặc gần nguyên văn mà nhóm thực sự đã dùng để điều khiển AI.

1. **Thiết kế luồng làm bài**
   > “Hãy xây dựng luồng làm bài trắc nghiệm bằng JavaScript thuần: hỗ trợ câu hỏi chọn một/chọn nhiều, lưu đáp án vào AppState, cập nhật thanh tiến độ và tự động nộp bài khi hết giờ. Kiểm tra các trường hợp chưa chọn đáp án và đề thi không có câu hỏi.”

2. **Chấm điểm và giải thích kết quả**
   > “Hãy triển khai logic chấm điểm từ danh sách câu trả lời và `correctAnswer`. Sau khi nộp, hiển thị điểm, câu đúng/sai, đáp án đã chọn và lời giải thích. Không thay đổi cấu trúc dữ liệu câu hỏi hiện có.”

3. **Lưu và khôi phục lịch sử**
   > “Hãy lưu mỗi lượt làm bài vào `localStorage` kèm snapshot câu hỏi và câu trả lời để học viên có thể mở lại kết quả sau này. Đảm bảo lịch sử của học viên được lọc theo tài khoản đang đăng nhập và không làm hỏng dữ liệu cũ.”

4. **Tạo câu hỏi ôn tập bằng AI**
   > “Hãy tạo service gọi Gemini dựa trên danh sách câu trả lời sai. Yêu cầu kết quả là mảng JSON đúng schema câu hỏi của ứng dụng; xử lý lỗi mạng, phản hồi sai định dạng và cơ chế fallback rõ ràng.”

5. **Rà soát đường dẫn sau khi sắp xếp thư mục**
   > “Hãy rà tất cả đường dẫn script, CSS, JSON và HTML được tải bằng `fetch()` sau khi thay đổi cấu trúc thư mục. Cập nhật tham chiếu, giữ đúng thứ tự nạp JavaScript và kiểm tra không còn đường dẫn cũ.”

## 6. Cấu trúc dự án

```text
adaptive-quiz-system/
├── .ai/
│   └── skills.md
├── agents.md
├── docs/
│   ├── architecture.md
│   ├── data-contracts.md
│   └── user_stories.md
├── README.md
├── generate-questions.js
├── index.html
├── css/
├── data/
│   ├── demo-sample-pack.json
│   ├── questions.json
│   └── users.json
├── js/
│   ├── core/
│   ├── features/
│   │   ├── student/
│   │   └── admin/
│   └── services/
└── views/
    ├── auth/
    ├── shared/
    ├── student/
    └── admin/
```
