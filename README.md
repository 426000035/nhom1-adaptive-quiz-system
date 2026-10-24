# AdaptiveQuiz — Hệ thống Trắc nghiệm Thích ứng

## Nhóm dự án

- **Tên nhóm:** Nhóm 1 – AdaptiveQuiz
- **Học phần:** Thiết kế Web – Trường Đại học Lạc Hồng (LHU)
- **Leader / Scrum Master:** Phan Thị Ngọc Duyên
- **Member / Dev Team:** Tống Ngọc Minh Châu

## Mô tả dự án

AdaptiveQuiz là ứng dụng web hỗ trợ học viên làm đề được giao, kiểm tra kiến thức và theo dõi kết quả học tập. Giáo viên có thể quản lý đề thi, ngân hàng câu hỏi, danh mục, tài khoản học viên và lớp học; đồng thời theo dõi báo cáo kết quả.

Hệ thống giúp giải quyết các nhu cầu chính:

- Học viên cần luyện tập và đánh giá mức độ nắm kiến thức theo đề được giao.
- Người học cần biết câu trả lời đúng/sai, xem giải thích và nhận diện nội dung cần ôn thêm.
- Học viên cần xem lại lịch sử, tiến độ học tập và kết quả theo môn/kỹ năng.
- Giáo viên cần công cụ quản lý câu hỏi, đề thi, phân công học viên và theo dõi kết quả.
- Người học cần bài luyện tập bổ sung từ các câu đã trả lời sai; hệ thống có tích hợp AI cho mục đích này.

### Chức năng nổi bật

- Tìm kiếm, lọc và sắp xếp danh sách đề được giao.
- Làm bài ở chế độ EXAM có giới hạn thời gian hoặc PRACTICE không giới hạn thời gian khi chính sách đề cho phép.
- Chấm điểm, xem lại đáp án và giải thích; lưu lịch sử các lượt đã nộp.
- Tạo bài luyện tập từ câu sai bằng dịch vụ AI.
- Theo dõi tiến độ học tập và chăm sóc cây bằng phần thưởng nước.
- Quản lý đề, ngân hàng câu hỏi, tài khoản, lớp học và báo cáo dành cho giáo viên.

## Công nghệ và giới hạn hiện tại

- HTML5, CSS3 và JavaScript thuần; ứng dụng SPA chạy phía trình duyệt.
- Dữ liệu demo, tài khoản, lịch sử và tiến độ được lưu trong `localStorage` của trình duyệt; không đồng bộ giữa thiết bị.
- Sử dụng các thư viện giao diện qua CDN như Lucide, Chart.js, SweetAlert2 và Canvas Confetti.
- Tích hợp Gemini để hỗ trợ tạo câu hỏi ôn tập. Ứng dụng hiện không có backend; không dùng dữ liệu nhạy cảm hoặc xem cơ chế đăng nhập/lưu trữ phía client là bảo mật production.

## Hướng dẫn chạy

### Live Demo

- **Truy cập ứng dụng:** [AdaptiveQuiz trên GitHub Pages](https://426000035.github.io/nhom1-adaptive-quiz-system/)
- **Kho mã nguồn:** [426000035/nhom1-adaptive-quiz-system](https://github.com/426000035/nhom1-adaptive-quiz-system)

### Chạy trên máy cá nhân

Ứng dụng tải template HTML và dữ liệu JSON bằng `fetch()`, vì vậy cần chạy qua HTTP(S), không mở trực tiếp bằng `file://`.

1. Clone hoặc tải repository về máy.
2. Mở thư mục dự án trong VS Code.
3. Dùng extension **Live Server** để mở `index.html`.
4. Truy cập địa chỉ local do Live Server cung cấp.

Không cần cài Node.js, bundler hoặc framework để chạy ứng dụng.

## Prompt nhóm đã sử dụng

Các prompt dưới đây được trích nguyên văn theo nhật ký tại [`prompt_log`](./prompt_log).

1. **Khởi tạo dự án (Setup)**
   > “Một dự án thiết kế web sử dụng Vibe-code thì nên có những file markdown nào?”

2. **Đồng bộ ngữ cảnh (Context Setup)**
   > “Bạn đang đồng hành cùng dự án AdaptiveQuiz. Yêu cầu đọc agents.md, .ai/SKILLS.md, architecture.md, data-contract.md, user-stories.md, README.md. Ghi nhớ và tuân thủ các quy tắc được đề cập trong các file đó”

3. **Thiết kế dữ liệu (Data Design)**
   > “Liệt kê các quan hệ cần được chuẩn hóa dữ liệu đang có trong dự án, ví dụ như học sinh, đề thi, câu hỏi, môn...”

4. **Lập kế hoạch giao diện (UI Planning)**
   > “PROMPT — CHUẨN HÓA GIAO DIỆN MÀN HÌNH CON VÀ POPUP/MODAL ADAPTIVEQUIZ / Lập kế hoạch từng bước, thực hiện từng bước nhỏ, chỉ thực hiện khi nhận được lệnh”

5. **Chỉnh sửa các chi tiết**
   > “Role: Admin; Màn hình danh sách bài thi; button [Quản lý câu hỏi]; tại danh sách câu hỏi này, XÓA cột mã câu hỏi, cột Đáp án đúng yêu cầu hiển thị đầy đủ tất cả các lựa chọn đúng ví dụ [A:3][B:312]”

6. **Thực thi chi tiết (Task Breakdown)**
   > “liệt kê các bước cần thực hiện và sẽ làm theo từng bước nhỏ”

7. **Thực thi & Tinh chỉnh (Refactoring)**
   > “Bạn là Senior Frontend Engineer. Hãy trực tiếp audit và chuẩn hóa CSS toàn bộ dự án AdaptiveQuiz theo yêu cầu dưới đây: Loại bỏ inline style tĩnh, không làm hỏng tính năng, dữ liệu, theme, responsive...”

## Tổng hợp tài liệu dự án

- [Hướng dẫn AI Coding Agent](./agents.md) — ràng buộc công nghệ, kiến trúc và dữ liệu hiện tại, quy tắc thay đổi mã, cùng hướng dẫn làm việc theo từng loại tác vụ.
- [Kỹ năng và API hiện có](./.ai/skills.md) — ghi chú tra cứu API, module và quy ước triển khai đang được dùng trong mã nguồn.
- [Kiến trúc hệ thống](./docs/architecture.md) — cấu trúc mã nguồn, thứ tự khởi tạo/phụ thuộc module, vòng đời trạng thái, luồng giao diện và giới hạn bảo mật.
- [Hợp đồng dữ liệu](./docs/data-contracts.md) — hợp đồng DOM giữa HTML và JavaScript; cấu trúc, khóa lưu trữ và dữ liệu của câu hỏi, tài khoản, lịch sử, tiến độ, danh mục và tích hợp Gemini.
- [User stories](./docs/user_stories.md) — nhu cầu và tiêu chí hành vi của học viên, quản trị viên/giáo viên và hệ thống, kèm ghi chú phạm vi hiện tại.
- [Nhật ký prompt](./prompt_log) — công cụ AI, các prompt theo tiến trình thực hiện dự án, kết quả/tùy chỉnh và bài học kinh nghiệm của nhóm.
