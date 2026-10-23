# Kiến trúc Adaptive Quiz System

## Tổng quan

Adaptive Quiz System là ứng dụng SPA chạy hoàn toàn phía trình duyệt, viết bằng HTML, CSS và JavaScript thuần. `index.html` là shell và entry point; các thư viện giao diện được nạp từ CDN, các module JavaScript được nạp bằng thẻ `<script>` theo thứ tự phụ thuộc. Đăng nhập, danh mục, đề, câu hỏi, lịch sử và tiến độ dùng `adaptive_quiz_demo_db` trong `localStorage`; các cache cũ được nhập có điều kiện và giữ lại nếu không chuyển đổi an toàn. Ghi đè theme thủ công trong phiên đăng nhập được lưu bằng `sessionStorage`. Không có backend và dữ liệu không đồng bộ giữa máy.

Ứng dụng cần được mở qua HTTP(S) để các template và `data/questions.json` tải được bằng `fetch()`. Không dùng bundler hoặc bước build.

## Cấu trúc mã nguồn

```text
index.html
├── css/
│   ├── main.css                 Kiểu nền tảng, bố cục và giao diện chính
│   ├── components.css           Kiểu các thành phần giao diện
│   └── responsive.css           Điều chỉnh giao diện theo kích thước màn hình
├── data/
│   ├── demo-sample-pack.json    Gói môn, kỹ năng, câu hỏi, đề và dữ liệu demo
│   ├── questions.json           Nguồn tương thích/legacy để bootstrap; hiện là mảng rỗng
│   └── users.json               Danh tính seed để khởi tạo database local lần đầu
├── js/
│   ├── core/                    Trạng thái, điều hướng, menu mobile, theme, khởi động và engine dùng chung
│   ├── features/
│   │   ├── student/             Luồng học viên, lịch sử và tiến độ cá nhân
│   │   └── admin/               Quản lý đề, câu hỏi, người dùng, báo cáo và công cụ
│   └── services/
│       ├── local-storage-db.js   Kho localStorage demo có phiên bản và kiểm tra liên kết
│       └── ai-service.js        Gọi Gemini và xử lý fallback cho luyện tập câu sai
├── views/
│   ├── auth/                    Template đăng nhập tài khoản demo local
│   ├── shared/                  Modal và thành phần dùng chung
│   ├── student/                 Dashboard, catalog, bài làm, kết quả, lịch sử
│   └── admin/                   Dashboard và các tab quản trị
├── docs/                        Tài liệu kiến trúc, hợp đồng dữ liệu, user stories
├── .ai/                         Hướng dẫn/kỹ năng dành cho AI coding agent
├── agents.md                    Quy tắc phát triển dành cho AI coding agent
└── generate-questions.js        Công cụ tạo dữ liệu câu hỏi
```

### Quy ước CSS

- `css/main.css` là nguồn token thiết kế (theme, typography, spacing, radius, focus và chiều rộng nội dung), reset và bố cục nền tảng.
- `css/components.css` định nghĩa component dùng lại và trạng thái tương tác; template nên tham chiếu class và token thay vì thêm inline style.
- `css/responsive.css` điều chỉnh component và bố cục theo breakpoint.
- Trên màn hình rộng tối đa 850px, menu module của admin và student được mở từ nút ☰ cạnh logo thành ngăn kéo trượt bên trái; nút nền, phím Escape và thao tác chọn tab đóng menu. Desktop tiếp tục dùng thanh điều hướng bên trái. Chuyển động bị tắt khi người dùng bật `prefers-reduced-motion`.
- Ưu tiên CSS Grid cho bố cục hai chiều và Flexbox cho hàng/cột một chiều. Giữ tên class mô tả hiện có và tái sử dụng token thay vì đổi tên hàng loạt.

## Sơ đồ phụ thuộc và khởi tạo

Các script trong `index.html` được nạp lần lượt; module khởi động nằm cuối danh sách:

```text
index.html
├── Thư viện CDN: Lucide, Chart.js, SweetAlert2, Confetti, Prism
├── js/core/utils.js
├── js/services/local-storage-db.js
├── js/core/state.js
├── js/core/mobile-menu.js
├── js/core/router.js
├── js/core/auth.js
├── js/core/quiz-engine.js
├── js/features/student/*
├── js/features/admin/*
├── js/services/ai-service.js
├── js/core/theme.js
└── js/core/main.js
    └── DOMContentLoaded
        ├── Tải HTML auth, catalog, quiz, result, admin và modal
        ├── Tải các template tab quản trị
        ├── Khởi tạo database demo từ JSON nếu chưa tồn tại và xóa OAuth token legacy
        ├── Gắn sự kiện chọn tài khoản demo local
        ├── Nạp cài đặt
        ├── Nạp đề/câu hỏi vào AppState
        ├── Khởi tạo các module student và admin
        └── Đọc phiên hiện tại, cập nhật header và điều hướng theo role
```

Các template được tải động bằng `fetch()` trong `js/core/utils.js`, ngoại trừ dashboard và một số vùng nội dung student được tải/lắp thêm bởi `js/features/student/student-dashboard.js`.

## Vòng đời dữ liệu và trạng thái

- `window.AppState` trong `js/core/state.js` giữ trạng thái runtime: tài khoản hiện tại, đề/câu hỏi, chỉ số câu, câu trả lời, kết quả, trạng thái danh sách và dữ liệu hỗ trợ giao diện.
- Mục quản trị học viên trong `views/admin/tabs/tab-users.html` có hai tab con **Học viên** và **Lớp học**. Tab Học viên mở mặc định với bộ lọc học viên; thao tác thêm mở hộp thoại riêng. Tab Lớp học gom form tạo lớp, lọc và danh sách lớp; cả hai tab con hỗ trợ điều hướng bàn phím.
- `window.AppStorageKeys` còn định nghĩa khóa cài đặt tương thích `adaptive_quiz_settings`; khóa đề/câu hỏi cũ chỉ dùng để nhập dữ liệu một lần vào database.
- Gói demo phiên bản 7 có 500 lượt làm: 250 lượt theo phân phối 5 lượt/học viên và 250 lượt đạt điểm 10 của `usr_math_demo_001` trên đề Toán lớp 5 không giới hạn lượt. Tiến độ mẫu của học viên này có 50 xô đầy, tương ứng mỗi 5 lượt điểm 10 được 1 xô; gói chỉ thêm tiến độ khi học viên chưa có record. Bản nâng cấp này cũng đồng bộ tiêu đề hỏng font trong snapshot lượt làm mẫu theo đề tương ứng trong database.
- `js/services/local-storage-db.js` cung cấp database demo có version (`adaptive_quiz_demo_db`, schema v5), API đọc/ghi/cập nhật, kiểm tra trường và liên kết, và khởi tạo một lần từ `data/users.json`/`data/questions.json`. Migration v1→v2 thêm collection `classes` và `classIds: []`; migration v2→v3 bổ sung thông tin đăng nhập/hồ sơ; migration v3→v4 thêm ngày sinh mặc định rỗng, migration v4→v5 thêm số điện thoại mặc định rỗng. Mỗi migration sao lưu database nguồn trước khi lưu phiên bản mới. Mỗi lớp có ID riêng, tên duy nhất và trạng thái; một học viên có thể thuộc nhiều lớp. Giáo viên quản lý lớp, phân lớp học viên và lọc theo lớp trong danh sách học viên/cửa sổ giao đề. Sau bootstrap, `importDemoSamplePack()` nhập `data/demo-sample-pack.json` theo ID ổn định. Gói hiện hành phiên bản 7 giữ 3 môn Toán lớp 3–5, 15 kỹ năng, 150 câu hỏi nguyên bản, 20 đề và 250 lượt làm cơ sở (5 lượt cho mỗi học viên demo); nâng cấp từ gói cũ xóa môn/kỹ năng/câu hỏi/đề và lượt làm ngoài ba môn này, nhưng giữ tài khoản, lớp và tiến độ người dùng. Chính sách đề mẫu bao gồm thời lượng 15–60 phút, hạn chót tùy chọn, số lượt 1/3/không giới hạn và giao đề theo lớp. Nội dung luyện tập không sao chép đề thi có bản quyền. Validator đối chiếu `generationSpec` với số câu đã cố định theo kỹ năng, kiểm tra `assignedStudentIds` chỉ tham chiếu học viên, và xác thực `maxAttempts`, `scorePolicy`, `dueAt`. `assignedStudentIds` là danh sách học viên được giáo viên chọn nhận đề; catalog chỉ hiển thị đề được giao cho ID hiện tại, và bước bắt đầu đọc lại danh sách giao từ database để chặn thẻ đã cũ. Card đề hiển thị lượt đã hoàn thành/tối đa của học viên hiện tại và thời gian còn đến `dueAt`; giá trị được lấy từ database, đề không giới hạn lượt/hạn chót hiển thị tương ứng là “Không giới hạn”. Trường giao đề vắng mặt ở đề cũ thì tương đương danh sách rỗng, nên học sinh chưa được giao đề cho đến khi giáo viên chọn. Form quản trị cung cấp cửa sổ riêng để tìm học sinh theo mã/họ tên, lọc trạng thái và lớp, phân trang; lựa chọn được giữ giữa các trang và áp dụng khi xác nhận. Các trường chính sách khác vắng mặt ở đề cũ được diễn giải lần lượt là không giới hạn lượt, tính điểm cao nhất và không hạn chót. Trước khi bắt đầu, ứng dụng kiểm tra hạn chót và số lượt đã nộp thành công của đúng học viên/đề; lượt bắt đầu trước hạn được tiếp tục sau hạn, lượt bỏ dở không tính. `QuizEngine.aggregateQuizScores()` tổng hợp theo từng học viên/đề theo `highest`, `average` hoặc `latest`; dashboard học viên lấy trung bình từ các điểm tổng hợp theo đề, báo cáo giáo viên hiển thị điểm từng lượt cùng điểm tổng hợp. Bản ghi attempt vẫn được giữ nguyên. Đề được giao khởi chạy ở chế độ `EXAM`; chế độ `PRACTICE` hiện không có luồng chọn trong giao diện làm đề. Validator cũng kiểm tra trạng thái đúng/sai của attempt từ snapshot. Nếu thiếu migration hoặc schema mới hơn, dữ liệu gốc được giữ nguyên. Cache đề/câu hỏi/lịch sử được chuyển bằng transaction, chỉ xóa sau khi ghi thành công; lịch sử không đủ snapshot hoặc không khớp tài khoản được giữ trong cache cũ. Tiến độ mascot/gamification được gộp vào một record `studentProgress` theo `userId`. Lượt làm mẫu thuộc bộ dữ liệu cũ không còn được seed.
- `js/core/theme.js` tự chọn theme `morning` (06:00–17:59) hoặc `evening` (18:00–05:59) theo giờ địa phương. Người dùng có thể ghi đè thủ công bằng nút Dark mode; lựa chọn được giữ trong `sessionStorage` qua reload và bị xóa khi đăng xuất hoặc bắt đầu phiên đăng nhập mới. Khi không có ghi đè, theme tiếp tục tự đổi theo giờ. Giá trị cũ `adaptive_quiz_theme` trong `localStorage` không còn được đọc; giá trị `noon` đã lưu trong phiên từ phiên bản cũ bị xem là không hợp lệ, xóa và thay bằng theme theo giờ.
- Giao diện theo phong cách Bento Learning Garden: `morning` sáng dịu, `evening` tối thư thái. Mascot dùng chung cả hai theme, đổi màu vỏ xô theo theme, hoạt ảnh nhẹ và hỗ trợ `prefers-reduced-motion`.
- Catalog đề gán `data-difficulty` cho từng card để phân biệt Dễ (xanh lá), Trung bình (vàng/cam), Khó (đỏ); badge luôn có nhãn chữ và màu được định nghĩa bằng CSS custom properties theo theme.
- Khi khởi tạo, `data/questions.json` (hiện rỗng) được bootstrap trước khi nhập bộ Toán từ gói mẫu. `state.js` chuyển record giữa cấu trúc database chuẩn và object tương thích mà các màn hình cũ đang dùng; đề/câu hỏi được lưu tập trung trong `LocalStorageDB`.
- Các cache đề/câu hỏi cũ được nhập một lần. Nếu import thất bại, khóa cũ không bị xóa và lỗi được báo rõ.
- `Auth` trong `js/core/auth.js` xác thực username và mật khẩu demo từ `LocalStorageDB`; session `app_current_user` chỉ lưu `userId`, còn hồ sơ và role được đọc lại từ database mỗi lần khôi phục phiên. Tài khoản seed dùng `userId` làm username và mật khẩu ban đầu `123`; không sử dụng mật khẩu thật. Dashboard quản lý tài khoản có thể đổi role hoặc khóa/mở khóa tài khoản local. Đây là xác thực client-side cho demo, không an toàn: người dùng có thể đọc mật khẩu từ `localStorage` hoặc sửa dữ liệu.
- `QuizHistoryStorage` đọc/ghi lượt làm trong collection `attempts`; báo cáo giáo viên và lịch sử học viên dùng cùng adapter. `StudentDataStorage` gộp dữ liệu gamification/mascot vào `studentProgress`; cache legacy chỉ bị xóa sau khi ghi thành công. Lượt làm mới lưu thời điểm bắt đầu và hoàn thành; các bản ghi cũ không có thời điểm bắt đầu dùng thời điểm hoàn thành làm mốc gần đúng.
- `QuizEngine.evaluateQuiz()` phân tích điểm theo subject/skill ID cho kết quả mỗi lượt; dashboard học viên tổng hợp cùng cấu trúc từ các lượt đã lưu. Ngưỡng gợi ý “Cần củng cố” là tỷ lệ đúng dưới 60%. Câu hỏi chưa gắn kỹ năng được hiển thị riêng, không suy luận `subTopic` thành skill.
- `localStorage` gắn với trình duyệt/origin hiện tại; dữ liệu không tự đồng bộ giữa người dùng, thiết bị hoặc trình duyệt.
- `js/features/admin/admin-catalogs.js` đọc/ghi môn học, kỹ năng và độ khó trong `LocalStorageDB`. Giáo viên có thể thêm, sửa, tạm ẩn/hiện; xóa danh mục đang được tham chiếu sẽ bị chặn. Danh sách chọn trong form đề/câu hỏi và bộ lọc được đồng bộ từ các catalog này. Công cụ admin trộn đề lấy trực tiếp các câu đang hoạt động từ ngân hàng theo môn và số lượng từng kỹ năng, kiểm tra số lượng khả dụng, chọn không lặp rồi lưu câu cố định cùng `generationSpec`; đề ngẫu nhiên chưa được giao cho học sinh cho đến khi giáo viên chỉnh sửa và giao đề.
- Mã kết nối Google Sheets legacy đã được gỡ khỏi repository. Khi khởi động, ứng dụng vẫn xóa khóa OAuth Google legacy còn sót trong `sessionStorage`; luồng demo hiện tại không có thao tác Google Sheets.
- Đăng nhập demo dùng username/password lưu trong database local; tài khoản seed có mật khẩu ban đầu `123`. Giáo viên demo có thể tạo tài khoản học viên và đổi role trong mục quản lý người dùng; học viên có trang hồ sơ và tiến độ cá nhân. Catalog, đề, câu hỏi, lịch sử và tiến độ được quản lý trong database local.

Chi tiết khóa lưu trữ và cấu trúc object được mô tả tại [data-contracts.md](./data-contracts.md).

## Luồng giao diện

- `index.html` cung cấp các section SPA `view-auth`, `view-list`, `view-quiz`, `view-result` và `view-admin`.
- `js/core/router.js` chuyển view bằng cách ẩn/hiện `.view-section` và cập nhật header theo người dùng.
- Template auth, quiz, kết quả, catalog, admin và modal được nạp vào các vùng chứa tương ứng.
- Dashboard student ghép `views/student/dashboard.html` với catalog và nạp nội dung lịch sử khi cần.
- Dashboard admin dùng các tab và template nằm trong `views/admin/tabs/`.
- Màn hình trộn đề từ ngân hàng dùng lưới responsive cho thông tin đề và phân bổ số câu theo kỹ năng; thanh tiến độ kỹ năng ở kết quả từng bài và thống kê học viên dùng chung bố cục Grid, nhãn tỷ lệ và thanh `<progress>`.
- Tab công cụ quản trị đặt form trộn đề phía trên mục nhập/xuất đề JSON; cả hai card chiếm toàn chiều ngang. Mục JSON ghi rõ phương thức nhập đề hàng loạt khác đang được phát triển cho phiên bản sau.
- Việc chọn dashboard admin/student dựa trên `role` đọc ở client; đây là điều hướng giao diện, không phải kiểm soát quyền an toàn.

## Trách nhiệm module

| Module | Trách nhiệm |
|---|---|
| `js/core/main.js` | Khởi tạo ứng dụng, nạp dữ liệu, khởi tạo module và khôi phục điều hướng theo phiên. |
| `js/core/state.js` | Khai báo `AppState`, đọc/ghi dữ liệu đề, ngân hàng câu hỏi, cài đặt và hỗ trợ dữ liệu cá nhân. |
| `js/core/router.js` | Chuyển view SPA và cập nhật thanh điều hướng. |
| `js/core/mobile-menu.js` | Mở/đóng menu module trượt của admin/student trên màn hình tối đa 850px. |
| `js/core/theme.js` | Tự chọn theme theo giờ địa phương, áp dụng theme và giữ lựa chọn thủ công trong phiên đăng nhập. |
| `js/core/utils.js` | Tải HTML component; cung cấp pipeline dùng chung tìm kiếm, lọc, sắp xếp ổn định, phân trang, trạng thái kết quả và đặt lại điều kiện cho các danh sách client-side. Các thanh điều khiển danh sách giữ một hàng và tự co theo chiều rộng, không dùng cuộn ngang. |
| `js/core/auth.js` | Đăng nhập username/mật khẩu demo, quản lý tài khoản/hồ sơ, đăng xuất và lưu session ID ở client. |
| `js/core/quiz-engine.js` | Timer, ghi nhận đáp án, chấm điểm và thống kê theo chủ đề. |
| `js/features/student/student-view.js` | Catalog và nhãn độ khó theo theme, luồng làm bài, gọi luyện tập AI và lưu kết quả/lịch sử. |
| `js/features/student/student-dashboard.js` | Nạp dashboard, hiển thị thống kê và điều hướng tab student. |
| `js/features/student/student-history.js` | Lọc, phân trang và xem lại lịch sử làm bài. |
| `js/features/student/gamification.js`, `mascot.js` | Tiến độ cây, streak, xô nước và phản hồi mascot. |
| `js/features/admin/*.js` | Quản trị đề thi, ngân hàng câu hỏi, tài khoản, báo cáo và công cụ. |
| `js/services/ai-service.js` | Gửi context câu sai đến Gemini, parse kết quả và tạo câu dự phòng. |

## Giới hạn và bảo mật

- Đây là ứng dụng client-only: dữ liệu và logic nằm trong trình duyệt; tài khoản demo, role, đáp án và dữ liệu lưu trữ có thể bị người dùng xem hoặc sửa. Không có xác thực server hoặc cơ chế chống gian lận.
- API key Gemini hiện được nhúng trong JavaScript client và có thể bị lộ. Không dùng key production ở client; nếu key đã bị chia sẻ cần thu hồi/thay mới. Lời gọi thực tế nên đi qua backend/proxy bảo vệ bí mật.
- Nếu các request Gemini thất bại, fallback hiện tạo bản sao các câu trả lời sai với ID mới, không tải câu hỏi thay thế từ `data/questions.json`. Thông báo fallback hiện tại chưa mô tả chính xác hành vi này.
- Dữ liệu lưu trong `localStorage` phụ thuộc trình duyệt và origin, có thể bị xóa và không tự sao lưu/đồng bộ.

Ứng dụng hiện phù hợp cho demo và học tập; các giới hạn trên cần được giải quyết trước khi dùng với dữ liệu hoặc tài khoản thực tế.
