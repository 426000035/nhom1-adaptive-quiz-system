# User Stories - Adaptive Quiz System

Tài liệu này mô tả các luồng người dùng và đối chiếu tiêu chí với mã hiện tại. Trạng thái “Đã triển khai” chỉ nói về chức năng trong ứng dụng client-side; không đồng nghĩa với bảo mật hoặc xác thực phía máy chủ.

## 1. Học viên

### US-01: Đăng nhập demo trên một máy

**Là một** học viên, **tôi muốn** dùng tài khoản do giáo viên cấp để đăng nhập, **để** sử dụng các chức năng học tập và lưu tiến trình trong trình duyệt.

**Tiêu chí và trạng thái hiện tại**

- Đăng nhập bằng username và mật khẩu từ `adaptive_quiz_demo_db`; tài khoản seed dùng `userId` làm username và có mật khẩu ban đầu `123` — **Đã triển khai cho demo**.
- Học viên không có luồng tự đăng ký; giáo viên demo tạo tài khoản học viên từ tab quản lý tài khoản — **Đã triển khai phía client**.
- Hồ sơ và role được đọc từ database theo `userId`; session cục bộ `app_current_user` chỉ lưu ID này và được giữ qua reload — **Đã triển khai**.
- Sau đăng nhập, header hiển thị tên và role; dashboard được chọn theo role — **Đã triển khai**.
- Tài khoản giáo viên demo có thể đổi role hoặc khóa/mở khóa tài khoản trong trang quản trị — **Đã triển khai phía client**.
- Mật khẩu lưu plain text trong `localStorage`, không có xác thực server; người kiểm soát trình duyệt có thể đọc mật khẩu hoặc sửa dữ liệu — **Giới hạn demo, không an toàn cho production**.
- Học viên có tab **Hồ Sơ & Tiến Độ** tích hợp hồ sơ cá nhân, thống kê học tập, năng lực theo môn/kỹ năng và khu vườn cây; xem biệt danh, họ tên thật, username, ngày sinh, số điện thoại và lớp được gán — **Đã triển khai phía client**.
- Học viên chỉnh sửa biệt danh, ngày sinh và số điện thoại trong hộp thoại riêng; có thể đổi mật khẩu từ hộp thoại riêng với bước xác nhận trước khi lưu — **Đã triển khai cho demo phía client**.
- Học viên mở bộ chọn avatar bằng cách bấm avatar; lựa chọn dùng preset, lưu vào `users` trong database local. Giáo viên xem biệt danh kèm họ tên thật trong danh sách tài khoản — **Đã triển khai phía client**.
- Học viên đổi mật khẩu sau khi xác minh mật khẩu hiện tại; mật khẩu mới và xác nhận phải khớp, dài từ 8 đến 128 ký tự — **Đã triển khai cho demo client-side; mật khẩu vẫn lưu plain text**.
- Giáo viên mở hồ sơ từ danh sách học viên để xem thông tin cá nhân, thống kê, cây trồng và năng lực theo môn/kỹ năng của đúng học viên — **Đã triển khai phía client, chỉ đọc**.

### US-02: Duyệt và lọc đề thi

**Là một** học viên, **tôi muốn** tìm và lọc đề thi, **để** chọn bài phù hợp với nội dung cần ôn tập.

**Tiêu chí và trạng thái hiện tại**

- Danh sách đề được trình bày dạng thẻ, có tiêu đề, chủ đề, độ khó, số câu và thời lượng — **Đã triển khai**.
- Có tìm kiếm, lọc theo chủ đề/độ khó, sắp xếp và phân trang — **Đã triển khai**.
- Danh sách chỉ hiển thị đề có `assignedStudentIds` chứa ID học viên hiện đăng nhập; đề thiếu danh sách hoặc danh sách rỗng không hiển thị — **Đã triển khai**.
- Khi bắt đầu đề, quyền giao được đọc lại từ database để từ chối thẻ cũ nếu giáo viên vừa thu hồi quyền — **Đã triển khai**.
- Khi database và cache legacy chưa có đề/câu hỏi, ứng dụng có thể nạp `data/questions.json` và nhóm câu hỏi thành đề mặc định; tệp này hiện là mảng rỗng. Nội dung demo hiện được bổ sung từ `data/demo-sample-pack.json` — **Đã triển khai**.
- Các giá trị chủ đề và độ khó tùy thuộc dữ liệu/cài đặt hiện tại, không cố định chỉ là HTML, CSS và JavaScript.

### US-03: Làm bài trắc nghiệm

**Là một** học viên, **tôi muốn** làm đề thi được giao trong chế độ có giới hạn thời gian, **để** kết quả tuân thủ thời lượng do giáo viên thiết lập.

**Tiêu chí và trạng thái hiện tại**

- Câu hỏi `single` dùng radio, câu hỏi `multiple` dùng checkbox; đáp án được giữ trong `AppState` khi chuyển câu — **Đã triển khai**.
- Đề được giao hiện luôn bắt đầu ở chế độ thử thách `EXAM`; không có lựa chọn ôn luyện trong luồng bắt đầu đề — **Đã triển khai**.
- Chế độ thử thách có đồng hồ đếm ngược; khi hết giờ hệ thống tự nộp bài — **Đã triển khai**.
- Thanh tiến độ hiện biểu diễn vị trí câu đang xem trên tổng số câu, không phải tỷ lệ câu đã trả lời — **Đã triển khai theo vị trí**.
- Không có yêu cầu bắt buộc trả lời hết mọi câu trước khi nộp; câu chưa chọn được chấm là sai.

### US-04: Xem kết quả và lịch sử

**Là một** học viên, **tôi muốn** xem điểm và các câu sai sau khi nộp bài, **để** biết phần kiến thức cần ôn thêm.

**Tiêu chí và trạng thái hiện tại**

- Kết quả hiển thị điểm trên thang 10, tỷ lệ đúng, thống kê theo chủ đề và biểu đồ — **Đã triển khai**.
- Mỗi kết quả đề phân tích câu đúng/tổng theo từng môn và kỹ năng; kỹ năng dưới 60% được đánh dấu cần củng cố — **Đã triển khai**.
- Thống kê học viên tổng hợp tỷ lệ đúng theo môn và từng kỹ năng từ các lượt làm đã lưu của tài khoản — **Đã triển khai**.
- Câu hỏi thiếu skill ID được hiển thị dưới nhãn “Chưa phân loại kỹ năng”; không suy diễn kỹ năng từ tên đề hoặc `subTopic` — **Đã triển khai**.
- Tất cả câu hỏi hiển thị lựa chọn của học viên, đúng/sai, đáp án đúng và lời giải; kết quả của học viên và chế độ xem của giáo viên dùng chung màn hình — **Đã triển khai**.
- Mỗi lượt hoàn thành được lưu trong collection `attempts` của `adaptive_quiz_demo_db`, gồm thông tin lượt thi, điểm, chế độ, thời điểm bắt đầu/kết thúc và snapshot câu hỏi/đáp án — **Đã triển khai**.
- Điểm tổng hợp theo từng học viên và đề tuân theo `scorePolicy`: cao nhất, trung bình (làm tròn 1 chữ số thập phân) hoặc lần nộp mới nhất theo `completedAt`; điểm của từng lượt vẫn được giữ nguyên trong lịch sử — **Đã triển khai**.
- Thống kê điểm trung bình của học viên lấy trung bình các điểm tổng hợp theo đề; báo cáo giáo viên hiển thị điểm từng lượt và điểm tổng hợp tương ứng — **Đã triển khai**.
- Lịch sử `quiz_history_all` cũ được nhập nếu xác định được tài khoản và snapshot hợp lệ; bản ghi chưa chuyển được giữ ở khóa cũ — **Đã triển khai**.
- Học viên có thể lọc/phân trang lịch sử và xem lại kết quả chi tiết cho lượt có snapshot — **Đã triển khai**.
- Tiến độ gamification và mascot được đọc/ghi chung trong `studentProgress` theo user ID; cache cũ chỉ xóa sau khi ghi database thành công — **Đã triển khai**.
- Thời lượng có thể tính cho lượt mới từ `startedAt`/`completedAt`; lịch sử cũ không có thời điểm bắt đầu nên dùng `completedAt` cho cả hai mốc.

### US-05: Ôn câu sai với AI

**Là một** học viên, **tôi muốn** tạo bài luyện tập từ các câu sai, **để** củng cố những nội dung vừa làm chưa đúng.

**Tiêu chí và trạng thái hiện tại**

- Nút luyện AI gửi các câu sai đến Gemini; prompt yêu cầu sinh số câu tương ứng với số câu sai và trả về JSON — **Đã triển khai trong mã**.
- Service thử nhiều tên model, parse kết quả JSON và đưa câu hỏi trả về vào luồng làm bài — **Đã triển khai trong mã; chưa xác nhận dịch vụ từ xa luôn sẵn sàng**.
- Khi các lần gọi thất bại, fallback hiện tạo bản sao các câu sai với ID mới; **không tải câu hỏi thay thế từ `data/questions.json`**.
- Mã service hiện chứa API key phía client. Không đưa key này lên môi trường công khai; cần thu hồi/thay mới nếu key còn hiệu lực hoặc từng bị chia sẻ. Production nên gọi Gemini qua backend/proxy.

## 2. Quản trị viên / Giáo viên

### US-06: Truy cập chức năng quản trị theo role

**Là một** quản trị viên, **tôi muốn** mở khu vực quản trị, **để** quản lý nội dung và xem báo cáo.

**Tiêu chí và trạng thái hiện tại**

- Sau đăng nhập, tài khoản có `role === "admin"` được điều hướng đến dashboard admin; tài khoản khác được điều hướng đến dashboard học viên — **Đã triển khai**.
- Giao diện admin có các tab quản lý đề thi, môn học/kỹ năng, ngân hàng câu hỏi, học viên/lớp, báo cáo và công cụ — **Đã triển khai**.
- Tạo tài khoản học viên yêu cầu họ tên, username duy nhất và mật khẩu ban đầu; tài khoản mới luôn có role `student` và được thêm vào danh sách từ database — **Đã triển khai phía client**.
- Quản lý tài khoản hỗ trợ tạo/đổi tên/tạm ẩn lớp, gán một hoặc nhiều lớp cho học viên, lọc danh sách theo lớp và lọc học viên theo lớp khi giao đề. Lớp dùng `classId` và học viên giữ mảng `classIds`; database cũ được migration tương thích — **Đã triển khai**.
- Từ báo cáo lịch sử, giáo viên có thể mở chi tiết một lượt, xem tất cả câu trả lời trên màn hình kết quả dùng chung và nhận nhãn kỹ năng mạnh/yếu — **Đã triển khai phía client**.
- Đây là phân nhánh giao diện phía client, không phải kiểm soát truy cập an toàn. Không có backend để ngăn người dùng sửa `localStorage` hoặc mã chạy trong trình duyệt.

### US-07: Quản lý danh mục chuẩn

**Là một** giáo viên, **tôi muốn** quản lý môn học, kỹ năng và độ khó ở một nguồn dữ liệu cục bộ thống nhất, **để** form và bộ lọc dùng cùng ID/nhãn.

**Tiêu chí và trạng thái hiện tại**

- Thêm, sửa, tạm ẩn/hiện môn học, kỹ năng và độ khó trong `adaptive_quiz_demo_db` — **Đã triển khai**.
- Chặn xóa danh mục đang được tham chiếu và giữ ít nhất một độ khó hoạt động — **Đã triển khai**.
- Form đề/câu hỏi và bộ lọc đọc danh mục hoạt động từ LocalStorageDB — **Đã triển khai**.
- `data/questions.json` hiện là mảng rỗng, không tạo môn/kỹ năng giữ chỗ. `data/demo-sample-pack.json` bổ sung các môn/kỹ năng, đề và lượt làm/tiến độ giả lập để kiểm thử. Dữ liệu giả lập không phải kết quả học thật và không ghi đè tiến độ có sẵn — **Đã triển khai**.
- Form tạo/sửa đề mở cửa sổ riêng để chọn học sinh nhận đề; danh sách hỗ trợ tìm theo mã/họ tên, lọc theo trạng thái tài khoản và phân trang. Lựa chọn được giữ khi tìm/lọc/chuyển trang và chỉ áp dụng sau khi xác nhận. Danh sách lưu bằng `userId`; bỏ trống nghĩa là chưa giao đề — **Đã triển khai phần cấu hình/lưu**.
- Công cụ trộn đề cho phép chọn môn và số câu cần lấy theo từng kỹ năng; câu được lấy ngẫu nhiên từ ngân hàng câu hỏi đang hoạt động cùng môn, không lặp, và được cố định vào đề với `generationSpec` — **Đã triển khai**.
- Học viên chỉ bắt đầu lượt mới trước hạn chót; lượt đã bắt đầu trước hạn vẫn có thể tiếp tục và nộp sau hạn. Đề giới hạn số lượt sẽ chặn khi số lượt đã nộp và lưu thành công đạt mức tối đa; lượt bỏ dở không tính. Hệ thống kiểm tra lại chính sách ngay trước khi khởi chạy đề — **Đã triển khai**.

### US-08: Quản lý ngân hàng câu hỏi và đề thi

**Là một** quản trị viên, **tôi muốn** quản lý câu hỏi và đề thi, **để** cập nhật nội dung luyện tập.

**Tiêu chí và trạng thái hiện tại**

- Xem, thêm, sửa, xóa câu hỏi trong ngân hàng; tìm/lọc theo chủ đề và độ khó — **Đã triển khai**.
- Form câu hỏi thích ứng với máy tính/điện thoại, nội dung cuộn riêng và nút Lưu/Hủy luôn hiển thị; giáo viên có thể thêm số phương án không giới hạn cố định ở bốn, chọn dạng một đáp án hoặc nhiều đáp án đúng — **Đã triển khai**.
- Chọn câu hỏi từ ngân hàng để thêm vào đề; đề và câu hỏi được lưu trong `adaptive_quiz_demo_db` — **Đã triển khai**.
- Có chức năng quản lý đề thi, môn học/kỹ năng, học viên/lớp, báo cáo và công cụ trộn đề cùng nhập/xuất JSON. Phương thức nhập đề hàng loạt khác đang được phát triển — **Đã triển khai một phần ở giao diện admin**.
- Cache legacy đề/câu hỏi được nhập vào database một lần và chỉ xóa sau khi ghi thành công. `data/questions.json` rỗng không cung cấp câu hỏi mẫu mặc định — **Đã triển khai**.
- Dữ liệu được lưu cục bộ trên trình duyệt, không tự đồng bộ giữa người dùng hoặc thiết bị.

## 3. Hệ thống

### US-09: Điều hướng SPA

**Là một** ứng dụng web, **tôi muốn** chuyển giữa các màn hình mà không tải lại toàn bộ trang, **để** duy trì trải nghiệm liền mạch.

**Tiêu chí và trạng thái hiện tại**

- `index.html` làm SPA shell; JavaScript ẩn/hiện các section `view-auth`, `view-list`, `view-quiz`, `view-result`, `view-admin` — **Đã triển khai**.
- Các template HTML được tải bằng `fetch()` từ `views/` khi khởi tạo hoặc khi render dashboard — **Đã triển khai**.
- Trên màn hình tối đa 850px, menu module admin/student mở dưới dạng ngăn kéo trượt từ trái; chọn mục, bấm nền hoặc nhấn Escape sẽ đóng menu — **Đã triển khai**.
- Trạng thái câu trả lời được giữ trong `AppState` trong phiên trang; việc này không đồng nghĩa với khôi phục bài đang làm sau khi đóng/tải lại trang.

### US-10: Giao diện Sáng – Tối

**Là một** người dùng, **tôi muốn** giao diện tự phù hợp với thời điểm trong ngày nhưng vẫn có thể chọn thủ công, **để** sử dụng ứng dụng thoải mái hơn.

**Tiêu chí và trạng thái hiện tại**

- Nút Dark mode chuyển thủ công giữa Sáng và Tối, có nhãn truy cập mô tả trạng thái — **Đã triển khai**.
- Khi không có ghi đè thủ công, giao diện theo giờ địa phương: Sáng 06:00–17:59, Tối 18:00–05:59; tự kiểm tra định kỳ và khi tab hiện lại — **Đã triển khai**.
- Lựa chọn thủ công được giữ trong `sessionStorage` qua reload trong phiên đăng nhập, không tự đổi khi chuyển khung giờ; đăng xuất hoặc đăng nhập phiên mới xóa lựa chọn thủ công — **Đã triển khai**.
- Hai theme cùng phong cách Bento Learning Garden; mascot hiện diện ở cả hai theme, có hoạt ảnh nhẹ và tôn trọng `prefers-reduced-motion` — **Đã triển khai**.
- Thẻ đề thể hiện Dễ bằng xanh lá, Trung bình bằng vàng/cam, Khó bằng đỏ và luôn có nhãn chữ — **Đã triển khai**.

## Ghi chú phạm vi

- Đây là ứng dụng HTML/CSS/JavaScript chạy phía trình duyệt, dùng `localStorage`; dữ liệu không phải kho dùng chung có xác thực.
- `data/users.json` là dữ liệu mẫu/tài liệu. Luồng đăng nhập hiện tại không tải tài khoản từ tệp đó.
- Các tiêu chí ở trên được đối chiếu với mã hiện tại; các giới hạn và mục chưa đáp ứng được ghi rõ thay vì xem là chức năng đã hoàn tất.
