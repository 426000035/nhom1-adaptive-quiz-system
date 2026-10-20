# 📖 User Stories - Adaptive Quiz System

> **Tài liệu Mô tả Yêu cầu Người dùng (User Stories)** dành cho phân hệ **Hệ thống Luyện tập & Kiểm tra Thích ứng**.

---

## 👤 1. Nhóm Chức năng Học viên (Student Persona)

### US-01: Đăng nhập & Đăng ký Tài khoản
* **Là một** Học viên,
* **Tôi muốn** đăng ký tài khoản mới và đăng nhập vào hệ thống,
* **Để** lưu trữ tiến trình học tập, lịch sử điểm số và cá nhân hóa trải nghiệm.
* **Tiêu chí chấp nhận (Acceptance Criteria):**
  * Form đăng nhập/đăng ký kiểm tra tính hợp lệ của đầu vào (Username, Password không được trống).
  * Lưu phiên đăng nhập người dùng vào `localStorage`.
  * Hiển thị thông tin cá nhân (Tên, Avatar) trên giao diện sau khi đăng nhập thành công.

### US-02: Duyệt & Lọc Danh sách Đề thi
* **Là một** Học viên,
* **Tôi muốn** tìm kiếm và lọc danh sách các đề thi theo chủ đề (HTML, CSS, JS) và độ khó (Dễ, Trung bình, Khó),
* **Để** lựa chọn bài kiểm tra phù hợp với trình độ hiện tại của mình.
* **Tiêu chí chấp nhận (Acceptance Criteria):**
  * Hiển thị danh sách đề thi dưới dạng thẻ (Card) gồm: Tên bài, Chủ đề, Độ khó, Số câu hỏi, Thời gian làm bài.
  * Lọc tức thì (Real-time filter) khi người dùng chọn Dropdown/Nút chọn chủ đề hoặc độ khó.

### US-03: Thực hiện Bài thi Trắc nghiệm
* **Là một** Học viên,
* **Tôi muốn** làm bài kiểm tra với giao diện câu hỏi trực quan (Radio/Checkbox), có đồng hồ đếm ngược và thanh tiến độ,
* **Để** theo dõi thời gian và tiến trình hoàn thành bài làm của mình.
* **Tiêu chí chấp nhận (Acceptance Criteria):**
  * Đồng hồ đếm ngược chạy từng giây và tự động nộp bài khi hết giờ (`00:00`).
  * Thanh tiến độ (Progress bar) tự động cập nhật `%` dựa trên số câu hỏi đã trả lời.
  * Hỗ trợ đúng loại ô chọn: `Radio` đối với câu hỏi chọn 1 đáp án, `Checkbox` đối với câu hỏi chọn nhiều đáp án.

### US-04: Xem Kết quả & Phân tích Điểm yếu
* **Là một** Học viên,
* **Tôi muốn** xem ngay điểm số, tỉ lệ làm đúng và danh sách các câu trả lời sai kèm lời giải chi tiết ngay sau khi nộp bài,
* **Để** hiểu rõ lý do vì sao mình làm sai và nắm được kiến thức bị hổng.
* **Tiêu chí chấp nhận (Acceptance Criteria):**
  * Thống kê tổng điểm, thời gian làm bài, và tỉ lệ làm đúng.
  * Liệt kê các câu làm sai: Hiển thị đáp án người dùng đã chọn (Màu đỏ), đáp án đúng (Màu xanh) và đoạn văn bản giải thích (`explanation`).

### US-05: Luyện tập lại Câu sai với AI (Gemini Feature)
* **Là một** Học viên,
* **Tôi muốn** bấm nút "Luyện tập lại câu sai với AI" tại Trang Kết quả,
* **Để** hệ thống tự động sinh bộ câu hỏi mới củng cố đúng các khái niệm mà tôi vừa làm sai.
* **Tiêu chí chấp nhận (Acceptance Criteria):**
  * Hiển thị Loading Spinner trong lúc AI xử lý (`gemini-1.5-flash`).
  * Render bài thi mới chứa các câu hỏi tương đương do AI sinh ra.
  * Tự động Fallback sang kho câu hỏi mặc định nếu không gọi được API Key/Mất mạng.

---

## 👨‍🏫 2. Nhóm Chức năng Quản trị / Giáo viên (Admin Persona)

### US-06: Phân quyền Quản trị (Role-Based Access)
* **Là một** Quản trị viên / Giáo viên,
* **Tôi muốn** đăng nhập bằng tài khoản có quyền `admin`,
* **Để** truy cập vào giao diện quản lý ngân hàng câu hỏi và thống kê tổng quan.
* **Tiêu chí chấp nhận (Acceptance Criteria):**
  * Hệ thống kiểm tra `role === "admin"` để hiển thị Menu Quản trị.
  * Chặn tài khoản `student` truy cập vào các trang/chức năng quản trị.

### US-07: Quản lý Ngân hàng Câu hỏi Tĩnh
* **Là một** Quản trị viên,
* **Tôi muốn** xem, thêm, sửa metadata của các câu hỏi trong ngân hàng dữ liệu,
* **Để** cập nhật nội dung kiến thức mới cho hệ thống.
* **Tiêu chí chấp nhận (Acceptance Criteria):**
  * Cho phép xem danh sách toàn bộ câu hỏi phân theo chủ đề và độ khó.
  * Cập nhật thông tin vào cấu trúc dữ liệu JSON/`localStorage`.

---

## ⚙️ 3. Nhóm Chức năng Hệ thống (System Persona)

### US-08: Điều hướng Trang Đơn (SPA Routing)
* **Là một** Hệ thống Web,
* **Tôi muốn** chuyển đổi qua lại giữa các màn hình (Đăng nhập, Danh sách, Làm bài, Kết quả) mà không cần tải lại toàn bộ trang (No Page Reload),
* **Để** tối ưu tốc độ phản hồi và giữ nguyên trạng thái ứng dụng.
* **Tiêu chí chấp nhận (Acceptance Criteria):**
  * Quản lý ẩn/hiện các `<section>` thông qua JavaScript State Manager.
  * Lưu giữ câu trả lời của người dùng trong bộ nhớ tạm mà không bị mất khi thao tác chuyển đổi giao diện.