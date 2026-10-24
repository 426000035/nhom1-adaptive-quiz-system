# Hướng dẫn AI Coding Agent - Adaptive Quiz System

> Quy tắc làm việc dành cho AI assistant tham gia phát triển dự án. Tệp này là điểm vào ở thư mục gốc; xem [`.ai/skills.md`](./.ai/skills.md) về API hiện có và [tài liệu kiến trúc](./docs/architecture.md), [hợp đồng dữ liệu](./docs/data-contracts.md), [user stories](./docs/user_stories.md) để biết chi tiết. Không chỉnh `README.md` trừ khi người dùng yêu cầu rõ.

## 1. Ràng buộc công nghệ

- Dùng HTML5, CSS3 và JavaScript thuần ES6+ ở phía trình duyệt.
- Không thêm backend, Node.js runtime, framework hoặc bundler như Vite/Webpack khi chưa được yêu cầu.
- Các thư viện giao diện được phép dùng qua CDN hiện có trong `index.html`: Chart.js, SweetAlert2, Lucide, Canvas Confetti và Prism.js.
- Giữ phong cách chủ đạo **Bento Learning Garden** với hai theme `morning` và `evening`, lần lượt tương ứng Sáng và Tối.
- Mascot phải xuất hiện trong cả hai theme, có chuyển động nhẹ và luôn tôn trọng `prefers-reduced-motion`.
- Theme tự khớp theo giờ địa phương (Sáng 06:00–17:59, Tối 18:00–05:59). Lựa chọn thủ công được giữ trong phiên đăng nhập hiện tại, qua reload, và bị xóa khi đăng xuất/đăng nhập mới.
- Card đề thi thể hiện độ khó bằng màu semantic nhất quán giữa các theme: Dễ xanh lá, Trung bình vàng/cam, Khó đỏ; luôn đi kèm nhãn chữ, không chỉ dựa vào màu.
- Giữ giao diện responsive trên desktop/mobile khi thay đổi HTML/CSS.
- Dùng Windows-style path separator khi làm việc với đường dẫn trong môi trường Windows; trong liên kết Markdown, dùng đường dẫn phù hợp với cú pháp liên kết.

## 2. Kiến trúc và dữ liệu hiện tại

- `index.html` là SPA shell duy nhất với các section `#view-auth`, `#view-list`, `#view-quiz`, `#view-result`, `#view-admin`. Điều hướng bằng JavaScript và trạng thái ẩn/hiện.
- JavaScript được nạp tuần tự trong `index.html`, không có bundler. Khi thêm module, cập nhật đúng thứ tự nạp và kiểm tra phụ thuộc.
- Trạng thái runtime tập trung ở `window.AppState` trong `js/core/state.js`. Dùng API và tên trường thực tế; tham khảo [`.ai/skills.md`](./.ai/skills.md), không giả định API cũ còn tồn tại.
- Logic được tổ chức theo `js/core/`, `js/features/student/`, `js/features/admin/` và `js/services/`; template giao diện ở `views/auth/`, `views/shared/`, `views/student/`, `views/admin/`.
- `data/questions.json` là nguồn tương thích/legacy để bootstrap câu hỏi và hiện đang rỗng; dữ liệu demo hiện được bổ sung từ `data/demo-sample-pack.json`. Không hardcode ngân hàng câu hỏi trong mã ứng dụng.
- Đề, ngân hàng câu hỏi, cài đặt, tài khoản, phiên, lịch sử và tiến độ người học lưu trong `localStorage` theo các khóa hiện hành. `data/users.json` là dữ liệu mẫu/tài liệu, không phải nguồn đăng nhập.
- Dữ liệu và phân quyền đều ở client, không đồng bộ giữa thiết bị và không phải cơ chế xác thực an toàn. Không mô tả chúng như backend hoặc RBAC bảo mật.

## 3. Quy tắc thay đổi mã

- Đọc các module liên quan trước khi sửa; tìm cách triển khai tương tự để dùng lại helper và quy ước hiện có.
- Thay đổi chính xác, trong phạm vi yêu cầu; không sửa README hoặc các nội dung không liên quan.
- Giữ tương thích với cấu trúc dữ liệu hiện có và tránh làm mất dữ liệu `localStorage`. Nếu cần thay đổi schema hoặc khóa lưu trữ, nêu rõ ảnh hưởng và hỗ trợ dữ liệu cũ khi thích hợp.
- Kiểm tra đầu vào và các trường hợp biên: dữ liệu rỗng/sai định dạng, danh sách câu hỏi rỗng, câu chưa trả lời, câu hỏi nhiều đáp án, hết giờ, lỗi tải template/dữ liệu và lỗi API.
- Dùng SweetAlert2 theo pattern hiện có khi cần thông báo tương tác; không thêm `alert()` mới nếu có thể dùng giao diện thông báo đã được dự án sử dụng.
- Hiển thị hoặc ghi nhận lỗi theo cách rõ ràng; không âm thầm bỏ qua lỗi hay trả dữ liệu giả dạng thành công.
- Thêm/cập nhật kiểm thử hoặc validation phù hợp. Kiểm tra tối thiểu JavaScript liên quan bằng công cụ sẵn có; không thêm build tool chỉ để kiểm tra.
- Cập nhật tài liệu trực tiếp liên quan trong cùng thay đổi. Phân biệt hành vi đã triển khai, giới hạn hiện tại và đề xuất tương lai.

## 4. Quy tắc cho dịch vụ AI

- `js/services/ai-service.js` hiện gửi context câu sai gồm `topic`, `subTopic`, `failedQuestion` và `explanation`; prompt yêu cầu Gemini trả một mảng JSON các câu hỏi có `id`, `topic`, `subTopic`, `difficulty`, `type`, `question`, `options`, `correctAnswer`, `explanation`.
- Khi sửa prompt hoặc xử lý response, giữ yêu cầu JSON thuần và kiểm tra dữ liệu trả về trước khi dùng; không xem nội dung từ mô hình là đáng tin cậy.
- **Hành vi fallback hiện tại:** khi các lần gọi Gemini thất bại, service sao chép các câu sai và đổi ID; không đọc `data/questions.json`. Đây là mô tả implementation, không phải yêu cầu sản phẩm.
- **Yêu cầu định hướng:** nếu người dùng yêu cầu fallback từ `data/questions.json`, hãy triển khai thay đổi đó, kiểm tra luồng fallback và đồng bộ tài liệu liên quan. Không tuyên bố yêu cầu này đã được đáp ứng khi chưa sửa mã.
- API key hiện được nhúng trong mã phía client và có nguy cơ bị lộ. Không sao chép giá trị key vào tài liệu, log, ví dụ hoặc commit. Nếu key đã bị lộ, khuyến nghị thu hồi/thay mới; không đưa key production lên client. Khi được yêu cầu thiết kế triển khai thực tế, đề xuất backend/proxy bảo vệ bí mật.

## 5. Quy trình theo loại công việc

### Khi sửa HTML/CSS

- Giữ bản sắc Bento Learning Garden và kiểm tra cả hai theme; không làm mất mascot hoặc ý nghĩa màu độ khó khi thêm thành phần.
- Đảm bảo responsive, khả năng sử dụng trên mobile và trạng thái tương tác/phản hồi phù hợp.
- Ưu tiên class và component hiện có; tránh thêm thư viện ngoài danh sách được phép nếu chưa hỏi người dùng.

### Khi sửa JavaScript

- Kiểm tra API hiện có trước khi gọi; ví dụ `QuizEngine` hiện có `startTimer`, `stopTimer`, `recordAnswer`, `evaluateQuiz`, `renderChart`, không có `submit()` hay `updateProgressBar()`.
- Đề được giao không giới hạn lượt và không có hạn chót cho phép người học chọn `EXAM` hoặc `PRACTICE`; đề có giới hạn lượt hoặc hạn chót chỉ chạy `EXAM`. `EXAM` đếm ngược và tự nộp khi hết giờ; `PRACTICE` không giới hạn giờ và hiện lời giải sau khi trả lời. Giữ nguyên điều kiện chọn chế độ này, không tự thay đổi chính sách nếu yêu cầu không nêu rõ.
- Dùng `localStorage` theo đúng khóa hiện hành và không coi dữ liệu lưu phía client là an toàn.

### Khi cập nhật tài liệu

- Đối chiếu trực tiếp với mã nguồn trước khi khẳng định một chức năng đã triển khai.
- Ghi rõ khoảng cách giữa yêu cầu và implementation nếu có; không âm thầm biến yêu cầu tương lai thành tính năng hiện tại.
- Giữ nhất quán liên kết tương đối giữa tài liệu; chỉ sửa `README.md` khi được yêu cầu rõ.
