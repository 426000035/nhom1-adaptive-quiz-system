# Hợp đồng dữ liệu - Adaptive Quiz System

Tài liệu này mô tả các cấu trúc dữ liệu đang được ứng dụng sử dụng. Ứng dụng chạy phía trình duyệt; đăng nhập, danh mục, đề, câu hỏi, lịch sử và tiến độ dùng `adaptive_quiz_demo_db` trong `localStorage`. Dữ liệu legacy được giữ lại nếu không thể chuyển đổi an toàn. `sessionStorage` giữ ghi đè theme trong tab hiện tại. Chưa có backend. Các trường là mô tả theo mã hiện tại; một số trường tùy chọn hoặc dữ liệu cũ có thể không đầy đủ.

## Hợp đồng DOM (HTML–JavaScript)

Các `id` dưới đây là điểm nối giữa cấu trúc giao diện và mã JavaScript. Khi đổi hoặc xóa một ID, cần cập nhật các selector và xử lý sự kiện tham chiếu đến ID đó. Các view và modal được nạp động nên ID chỉ có mặt trong DOM khi component tương ứng được nạp.

### ID khai báo trong HTML

| Tệp | ID |
|---|---|
| `index.html` | `mobile-menu-toggle`, `brand-logo`, `theme-toggle`, `theme-toggle-label`, `nav-guest`, `btn-nav-login`, `nav-user`, `user-fullname`, `user-role-badge`, `btn-logout`, `mobile-menu-backdrop`, `app-main`, `view-auth`, `view-list`, `view-quiz`, `view-result`, `view-admin`, `modals-holder` |
| `views/auth/auth.html` | `demo-signin-title`, `form-demo-login`, `demo-username`, `demo-password`, `btn-demo-login`, `demo-login-status` |
| `views/shared/modals.html` | `modal-manage-questions`, `modal-manage-questions-title`, `selected-quiz-title-display`, `selected-quiz-id-display`, `btn-close-questions-modal`, `btn-admin-import-from-bank`, `btn-admin-add-q-to-quiz`, `search-quiz-questions`, `sort-quiz-questions`, `pagesize-quiz-questions`, `admin-quiz-questions-tbody`, `pagination-quiz-questions`, `modal-select-from-bank`, `modal-select-from-bank-title`, `search-modal-bank`, `sort-modal-bank`, `pagesize-modal-bank`, `chk-select-filtered-bank`, `bank-question-selection-count`, `bank-questions-select-tbody`, `pagination-modal-bank`, `btn-cancel-bank-select`, `btn-confirm-bank-select`, `modal-quiz-form`, `modal-quiz-title`, `form-manage-quiz`, `quiz-form-id`, `quiz-form-title-input`, `quiz-form-topic-select`, `quiz-form-time-input`, `btn-open-quiz-assignment`, `quiz-assignment-selection-summary`, `quiz-form-students-hint`, `quiz-form-max-attempts-input`, `quiz-form-unlimited-attempts`, `quiz-form-score-policy`, `quiz-form-has-deadline`, `quiz-form-due-at`, `btn-cancel-quiz-form`, `modal-quiz-assignment`, `quiz-assignment-title`, `quiz-assignment-selected-count`, `btn-close-quiz-assignment`, `search-quiz-assignment-students`, `filter-quiz-assignment-status`, `filter-quiz-assignment-class`, `sort-quiz-assignment-students`, `pagesize-quiz-assignment-students`, `chk-select-filtered-assignment-students`, `quiz-assignment-students-tbody`, `pagination-quiz-assignment-students`, `btn-cancel-quiz-assignment`, `btn-confirm-quiz-assignment`, `modal-user-classes`, `user-classes-title`, `user-classes-student-name`, `btn-close-user-classes`, `user-classes-checkbox-list`, `btn-cancel-user-classes`, `btn-save-user-classes`, `modal-create-student`, `create-student-title`, `btn-close-create-student`, `form-admin-create-student`, `admin-new-student-name`, `admin-new-student-username`, `admin-student-username-help`, `admin-new-student-password`, `admin-create-student-status`, `btn-cancel-create-student`, `btn-admin-create-student`, `modal-question-form`, `modal-question-title`, `btn-close-q-modal`, `form-manage-question`, `q-form-id`, `q-form-topic`, `q-form-skill`, `q-form-difficulty`, `q-form-text`, `question-options-title`, `q-form-add-option`, `q-form-options`, `q-form-type`, `q-form-explanation`, `btn-cancel-q-form`, `ai-loading-modal`, `water-bucket-celebration`, `btn-close-water-celebration`, `water-celebration-bucket-holder`, `water-celebration-title`, `water-celebration-count` |
| `views/student/catalog.html` | `input-search-quiz`, `filter-topic`, `filter-difficulty`, `sort-quiz-catalog`, `pagesize-quiz-catalog`, `quiz-count-badge`, `quiz-grid-container`, `pagination-quiz-catalog` |
| `views/student/dashboard.html` | `student-tabs-nav`, `student-tab-list`, `tab-profile`, `tab-catalog`, `tab-history`, `student-subtab-contents`, `subtab-catalog`, `student-catalog-mount-point`, `subtab-history`, `student-history-mount-point`, `subtab-profile`, `btn-return-admin-profile`, `student-profile-avatar`, `student-profile-nickname-display`, `student-profile-name`, `student-avatar-picker`, `student-avatar-status`, `student-profile-details-heading`, `btn-edit-student-profile`, `btn-open-student-password`, `student-profile-classes`, `student-profile-birth-date`, `student-profile-phone`, `student-profile-username`, `student-profile-status`, `student-profile-edit-dialog`, `student-profile-edit-title`, `form-student-profile`, `student-profile-nickname`, `student-profile-nickname-help`, `student-profile-birth-date-input`, `student-profile-phone-input`, `btn-save-student-profile`, `student-password-dialog`, `student-password-heading`, `form-student-password`, `student-current-password`, `student-new-password`, `student-confirm-password`, `btn-save-student-password`, `student-password-status`, `student-stats-title`, `dash-streak-count`, `dash-completed-count`, `dash-avg-score`, `learning-progress-title`, `student-learning-progress`, `tree-garden-scene`, `dash-tree-title`, `dash-tree-desc`, `dash-tree-exp-badge`, `dash-tree-icon`, `dash-garden-ground-label`, `dash-tree-exp-label`, `dash-tree-exp-bar`, `dash-water-count`, `btn-water-tree`, `btn-profile-logout` |
| `views/student/history.html` | `history-page-title`, `btn-back-to-dashboard`, `history-items-container` |
| `views/student/quiz.html` | `current-quiz-title`, `question-tracker`, `quiz-progress`, `quiz-progress-bar`, `practice-score`, `practice-score-ring-fill`, `practice-score-value`, `countdown-timer`, `question-topic-tag`, `question-type-tag`, `question-text`, `options-container`, `btn-prev-question`, `btn-next-question`, `question-navigation-title`, `question-navigation-progress`, `question-navigation`, `question-navigation-pagination`, `btn-question-navigation-prev`, `question-navigation-page-status`, `btn-question-navigation-next`, `btn-exit-quiz`, `btn-submit-quiz` |
| `views/student/result.html` | `result-page-title`, `result-quiz-name`, `result-score-number`, `skills-chart-title`, `skills-chart`, `skills-chart-legend`, `skill-analysis-title`, `result-skill-analysis`, `ai-banner-title`, `btn-trigger-ai`, `review-section-title`, `review-section-label`, `wrong-questions-container`, `btn-return-catalog`, `result-return-label` |
| `views/admin/dashboard.html` | `admin-tabs`, `admin-tab-list`, `admin-tab-quizzes`, `admin-tab-catalogs`, `admin-tab-question-bank`, `admin-tab-users`, `admin-tab-reports`, `admin-tab-tools`, `admin-tab-container`, `holder-tab-quizzes`, `holder-tab-catalogs`, `holder-tab-bank`, `holder-tab-users`, `holder-tab-reports`, `holder-tab-tools`, `admin-student-profile-content` |
| `views/admin/tabs/tab-bank.html` | `tab-question-bank`, `btn-admin-add-global-question`, `search-global-bank`, `filter-topic-global-bank`, `filter-difficulty-global-bank`, `sort-global-bank`, `pagesize-global-bank`, `admin-global-questions-tbody`, `pagination-global-bank` |
| `views/admin/tabs/tab-catalogs.html` | `tab-catalogs`, `admin-catalog-tabs`, `admin-catalog-tab-subjects`, `admin-catalog-tab-skills`, `admin-catalog-tab-difficulties`, `admin-catalogs-status`, `admin-catalog-panel-subjects`, `btn-admin-add-subject`, `search-admin-subjects`, `sort-admin-subjects`, `pagesize-admin-subjects`, `count-admin-subjects`, `admin-subjects-tbody`, `pagination-admin-subjects`, `admin-catalog-panel-skills`, `btn-admin-add-skill`, `search-admin-skills`, `sort-admin-skills`, `pagesize-admin-skills`, `count-admin-skills`, `admin-skills-tbody`, `pagination-admin-skills`, `admin-catalog-panel-difficulties`, `btn-admin-add-difficulty`, `search-admin-difficulties`, `sort-admin-difficulties`, `pagesize-admin-difficulties`, `count-admin-difficulties`, `admin-difficulties-tbody`, `pagination-admin-difficulties` |
| `views/admin/tabs/tab-quizzes.html` | `tab-quizzes`, `btn-admin-create-quiz`, `search-admin-quizzes`, `filter-topic-admin-quizzes`, `filter-difficulty-admin-quizzes`, `sort-admin-quizzes`, `pagesize-admin-quizzes`, `admin-quizzes-tbody`, `pagination-admin-quizzes` |
| `views/admin/tabs/tab-reports.html` | `tab-reports`, `stat-total-attempts`, `stat-avg-score`, `admin-reports-status`, `search-admin-reports`, `sort-admin-reports`, `pagesize-admin-reports`, `admin-history-tbody`, `pagination-admin-reports` |
| `views/admin/tabs/tab-tools.html` | `tab-tools`, `form-random-quiz`, `random-subject-select`, `random-title-input`, `random-time-input`, `random-skill-allocation-list`, `btn-export-json`, `input-import-json`, `admin-import-status` |
| `views/admin/tabs/tab-users.html` | `tab-users`, `admin-user-tabs`, `admin-user-tab-students`, `admin-user-tab-classes`, `admin-user-panel-students`, `btn-open-admin-create-student`, `search-admin-users`, `filter-role-admin-users`, `filter-class-admin-users`, `filter-status-admin-users`, `sort-admin-users`, `pagesize-admin-users`, `admin-users-tbody`, `pagination-admin-users`, `admin-user-panel-classes`, `form-admin-add-class`, `admin-new-class-name`, `admin-create-class-status`, `search-admin-classes`, `filter-status-admin-classes`, `sort-admin-classes`, `pagesize-admin-classes`, `admin-classes-tbody`, `pagination-admin-classes` |

### ID tạo động bằng JavaScript

| Tệp | ID | Mục đích |
|---|---|---|
| `js/features/admin/admin-catalogs.js` | `difficulty-label`, `difficulty-rank`, `catalog-skill-name`, `catalog-skill-subject` | Trường nhập trong các hộp thoại quản lý danh mục. |
| `js/features/student/mascot.js` | `student-mascot-floating`, `student-mascot-container`, `mascot-bubble`, `handleGradient`, `mascot-svg-eyes`, `mascot-svg-mouth` | Vùng mascot, lời thoại và các thành phần SVG. |
| `js/features/student/student-history.js` | `input-search-history`, `filter-history-mode`, `filter-history-score`, `sort-student-history`, `pagesize-student-history`, `history-count-badge`, `history-status`, `history-items-container`, `pagination-student-history` | Bộ lọc, trạng thái, danh sách và phân trang lịch sử. |
| `js/features/student/student-view.js` | `practice-explanation-box` | Vùng giải thích đáp án ở chế độ luyện tập. |

Danh sách trên được đối chiếu với HTML trong `index.html` và `views/`, cùng các ID được gán trực tiếp hoặc chèn bằng template trong JavaScript. Các ID trong giao diện hiện tại là duy nhất trong các tệp HTML; component nạp động cần tiếp tục tránh tạo ID trùng khi cùng lúc được gắn vào DOM.

## 1. Dữ liệu trong `localStorage`

### 1.1. Các khóa chính

| Khóa | Cấu trúc hiện tại | Mục đích |
|---|---|---|
| `adaptive_quiz_demo_db` | `LocalStorageDatabase` | Nguồn dữ liệu chuẩn cho tài khoản, danh mục, câu hỏi, đề thi, lượt làm và tiến độ học viên. |
| `adaptive_quiz_demo_db_sample_pack_version` | `number` | Phiên bản bộ dữ liệu demo chi tiết đã nhập; ngăn nhập lặp khi tải lại ứng dụng. |
| `app_users` | `Array<User>` | Khóa legacy; không còn được dùng cho đăng nhập. |
| `app_current_user` | `{ userId: string } \| null` | ID tài khoản demo đang đăng nhập; hồ sơ/role được đọc lại từ database mỗi lần tải phiên. Khi đăng xuất, khóa này bị xóa. |
| `adaptive_quiz_quizzes` | `Array<Quiz>` | Khóa legacy; được nhập một lần vào `quizzes` trong database rồi xóa sau khi ghi thành công. |
| `adaptive_quiz_questions` | `Array<Question>` | Khóa legacy; được nhập một lần vào `questions` trong database rồi xóa sau khi ghi thành công. |
| `adaptive_quiz_settings` | `{ topics: string[], difficulties: string[] }` | Cache giao diện tương thích; danh sách tên môn và nhãn độ khó được đồng bộ từ `LocalStorageDB`, không quản lý độc lập tại đây. |
| `quiz_history_all` | `Array<HistoryItem>` | Khóa legacy; lượt có dữ liệu hợp lệ được nhập vào `attempts`. Bản ghi không đủ thông tin hoặc không khớp tài khoản được giữ lại. |
| `adaptive_quiz_student_<encoded-username>_gamification` | `GamificationData` | Cache legacy theo tài khoản; được nhập vào `studentProgress` khi đọc lần đầu và chỉ xóa sau khi ghi thành công. |
| `adaptive_quiz_student_<encoded-username>_mascot` | `MascotData` | Cache legacy theo tài khoản; được nhập vào `studentProgress` khi đọc lần đầu và chỉ xóa sau khi ghi thành công. |

Tên tài khoản trong khóa dữ liệu cá nhân được trim, chuyển về chữ thường và mã hóa bằng `encodeURIComponent`.

### 1.2. Dữ liệu trong `sessionStorage`

| Khóa | Cấu trúc hiện tại | Mục đích |
|---|---|---|
| `adaptive_quiz_theme_override` | `morning \| evening` | Theme người dùng chọn thủ công trong phiên đăng nhập. Giữ qua reload cùng tab; bị xóa khi đăng xuất hoặc đăng nhập phiên mới. Nếu không có giá trị hợp lệ (bao gồm giá trị `noon` từ phiên bản cũ), giao diện tự chọn theo giờ địa phương. |
| `adaptive_quiz_google_oauth_session` | `{ accessToken: string, expiresAt: number }` | Khóa sót lại từ tích hợp Google đã gỡ; không còn module nào đọc/ghi token này. Ứng dụng xóa khóa khi khởi động để dọn session cũ. |

### 1.3. Khóa cũ và chuyển đổi dữ liệu

- Đề: `all_quizzes_data`, `adaptive_quizzes` và `adaptive_quiz_quizzes` được nhập vào `quizzes` trong database.
- Ngân hàng câu hỏi: `all_questions_bank` và `adaptive_quiz_questions` được nhập vào `questions` trong database.
- Cài đặt: `admin_settings` được đọc làm khóa cũ của `adaptive_quiz_settings`.
- Lịch sử: `quiz_history_all` được chuyển vào `attempts` khi giao diện lịch sử hoặc báo cáo đọc dữ liệu. Bản ghi chỉ được xóa khỏi khóa legacy sau khi database ghi thành công; dữ liệu chưa đủ để tạo snapshot hợp lệ hoặc chưa thể gắn với tài khoản vẫn được giữ trong khóa cũ.
- Tiến độ: khóa gamification/mascot theo tài khoản và khóa chung `student_gamification_data`/`student_mascot_data` được gộp vào một record `studentProgress` khi đọc hoặc ghi dữ liệu cá nhân. Khóa nguồn chỉ bị xóa sau khi transaction thành công.
- Không tìm thấy dữ liệu tiến độ thì ứng dụng trả giá trị mặc định và tạo record khi có thao tác lưu. `app_users` và `app_current_user` không thuộc các chuyển đổi trên.

### 1.4. Database demo

`js/services/local-storage-db.js` định nghĩa một database local có phiên bản, lưu dưới khóa `adaptive_quiz_demo_db`. Schema v5 gồm `users`, `classes`, `subjects`, `skills`, `difficulties`, `questions`, `quizzes`, `attempts` và `studentProgress`. Đăng nhập, danh mục, ngân hàng câu hỏi, đề thi, lịch sử và tiến độ hiện đọc/ghi tại đây. Khi ứng dụng chưa có khóa này, `initializeFromJson()` nạp `data/users.json` và `data/questions.json` một lần; ngân hàng legacy `data/questions.json` hiện để trống. `importDemoSamplePack()` nhập gói dữ liệu phiên bản 9 theo ID ổn định và chỉ ghi marker sau khi database hợp lệ. Khi nâng cấp từ các gói mẫu cũ, bước nhập xóa môn, kỹ năng, câu hỏi, đề và lượt làm không thuộc ba môn Toán lớp 3–5; tài khoản, lớp và tiến độ người dùng được giữ lại. Các nâng cấp phiên bản 8–9 chỉ áp dụng các tiến độ và bản ghi mẫu được chỉ định, không nhập lại toàn bộ gói hay xóa dữ liệu tùy chỉnh. Bản cập nhật tiến độ mẫu chỉ chỉnh `waterProgress` của `usr_math_demo_001`, giữ nguyên các trường tiến độ còn lại. Tiêu đề đề mẫu có ký tự lỗi font được cập nhật từ gói dữ liệu mới, không ghi đè tiêu đề tùy chỉnh hợp lệ. Các cache đề/câu hỏi/lịch sử được chuyển đổi trong transaction; khóa nguồn chỉ bị xóa sau khi ghi thành công. Bản ghi lịch sử không đầy đủ hoặc không khớp tài khoản tiếp tục được giữ ở khóa legacy.

Validator kiểm tra các trường và liên kết, tính nhất quán số câu trong `generationSpec` với các câu đã cố định theo kỹ năng, và tính đúng/sai trong attempt so với các option snapshot. `registerMigration(fromVersion, migration)` cho phép đăng ký từng bước migration đồng bộ. Khi `read()` gặp schema cũ, các migration phải tạo database hợp lệ ở đúng phiên bản kế tiếp; database cũ được sao lưu vào khóa `adaptive_quiz_demo_db_backup_vN` trước khi ghi schema mới. Thiếu migration, migration sai hoặc schema mới hơn đều báo lỗi mà không ghi đè dữ liệu nguồn.

Ngân hàng legacy đã được xóa: `data/questions.json` là mảng rỗng và không còn tạo các môn/kỹ năng giữ chỗ từ `topic`. Gói mẫu phiên bản 9 cung cấp 3 môn Toán lớp 3–5, 15 kỹ năng, 151 câu hỏi (50 câu mỗi khối và một câu hỏi cho đề Test), 21 đề (20 đề theo khối và đề Test), 250 lượt làm cơ sở (5 lượt cho mỗi học viên demo), cùng 9 lớp Toán và 50 tài khoản demo (`hs_math_001`–`hs_math_050`, mật khẩu ban đầu `123`). Mỗi học viên demo có lượt làm trên đề thuộc khối/lớp của mình. Các đề cơ sở có thời lượng 15–60 phút, có hoặc không có hạn chót, và chính sách số lượt một lần, 3 lần hoặc không giới hạn. Đề Test thuộc Toán lớp 3, có câu hỏi `4 × 5 = ?`, đáp án A là 20, được giao cho toàn bộ 51 học viên hiện có trong gói dữ liệu. Đề không giới hạn lượt và không có hạn chót; EXAM dùng thời lượng 15 phút, còn PRACTICE không tính giờ. Mỗi câu Toán có 2–5 lựa chọn và 1–3 đáp án đúng. Câu hỏi là nội dung luyện tập nguyên bản theo kiến thức phổ thông, không sao chép đề thi/tài liệu có bản quyền; đáp án và giải thích được tạo cùng câu hỏi. Dữ liệu này chỉ phục vụ demo, không phải hồ sơ hoặc kết quả học thật; tiến độ sẵn có của người dùng không bị thay thế, ngoại trừ cập nhật waterProgress được nêu rõ ở trên.

Gói demo hiện hành phiên bản 9 bổ sung 250 lượt làm đạt 10/10 cho học viên `usr_math_demo_001`, dùng đề Toán lớp 5 không giới hạn lượt. Với quy tắc 5 bài đạt điểm 10 được một xô, lượt mẫu này tương ứng đúng 50 xô đầy. Tổng cộng có 500 lượt làm trong bộ dữ liệu mẫu; tiến độ 50 xô chỉ được thêm khi học viên chưa có record tiến độ. Bản cập nhật phiên bản 8 đặt `waterProgress` của học viên này thành 4/5 một lần, đồng thời giữ nguyên kinh nghiệm, cấp cây, chuỗi ngày và số xô đã lưu. Phiên bản 7 cũng sửa tiêu đề lỗi font trong snapshot lượt làm mẫu bằng tên đề từ database, theo `quizId`. Phiên bản 9 thêm câu hỏi và đề Test bằng cập nhật mẫu chỉ thêm các bản ghi có ID đã chỉ định.

Trên card danh sách đề, số lượt đã hoàn thành/tối đa và thời gian còn đến hạn được tính từ database, theo học viên đang đăng nhập và chính sách `maxAttempts`/`dueAt` của đề. Giá trị null/thiếu chính sách được hiển thị là không giới hạn.

API `window.LocalStorageDB` gồm:

| API | Hành vi |
|---|---|
| `createEmptyDatabase()` | Tạo object schema v5 với các collection rỗng. |
| `read()` | Đọc, parse, validate và trả database; nếu khóa chưa tồn tại thì trả database rỗng trong bộ nhớ, không tự ghi và không nhập dữ liệu JSON. |
| `write(database)` | Validate rồi ghi database; ném lỗi nếu dữ liệu sai hoặc localStorage từ chối ghi. |
| `update(mutator)` | Tạo bản sao, áp dụng mutator đồng bộ, validate rồi ghi; không commit draft nếu mutator/validation thất bại. |
| `importDemoSamplePack()` | Nhập bổ sung các record có ID ổn định từ `data/demo-sample-pack.json`; chỉ ghi marker phiên bản sau khi database hợp lệ, không ghi đè tiến độ đã tồn tại. |
| `validate(database)` | Kiểm tra schema version, collection, ID duy nhất, trường bắt buộc, đáp án, snapshot lượt làm, giá trị tiến độ và liên kết lớp/học viên/môn/kỹ năng/độ khó/câu hỏi/đề/tài khoản. Trả `true` hoặc ném lỗi mô tả vấn đề. |
| `window.Auth.login(username, password)` | So sánh username không phân biệt hoa/thường và mật khẩu chính xác; tạo session chỉ chứa `userId`, hồ sơ và role luôn được đọc lại từ database. |

Record `users` gồm `userId`, `username`, `password`, `fullName`, `nickname`, `avatar`, `birthDate`, `phone`, `role`, `status` và `classIds`. Username phải duy nhất sau khi trim và chuyển chữ thường. Tài khoản seed mới dùng `userId` làm username và mật khẩu ban đầu `123`; migration v2→v3 áp dụng cùng giá trị mặc định cho tài khoản cũ. Migration v3→v4 thêm `birthDate: ''`; migration v4→v5 thêm `phone: ''` để giữ tương thích hồ sơ cũ. `Auth.getUsers()` không trả trường password cho các màn hình; password vẫn tồn tại dạng plain text trong `localStorage`.

Một tab **Hồ Sơ & Tiến Độ** tích hợp hồ sơ cá nhân, thống kê học tập, năng lực theo môn/kỹ năng và khu vườn cây. Hồ sơ cho phép cập nhật biệt danh, avatar trong bộ preset, ngày sinh tùy chọn (ngày thực tế theo `YYYY-MM-DD`, không ở tương lai) và số điện thoại tùy chọn (9–15 chữ số, cho phép định dạng bằng dấu cách, `+`, `-`, dấu chấm hoặc ngoặc). Họ tên, username và lớp chỉ hiển thị, không thể sửa từ hồ sơ. Header học viên dùng biệt danh và dự phòng họ tên khi biệt danh trống. Danh sách tài khoản của giáo viên hiển thị biệt danh cùng họ tên thật khi có biệt danh.

Đăng nhập username/password chỉ phục vụ demo client-side, không phải xác thực an toàn. Bất kỳ ai kiểm soát trình duyệt có thể đọc mật khẩu trong `localStorage`, sửa role hoặc thay đổi kiểm tra phía client; không dùng mật khẩu thật hoặc triển khai cho dữ liệu nhạy cảm.

Database có JSON lỗi, collection thiếu, ID trùng hoặc tham chiếu không hợp lệ sẽ không bị tự khởi tạo lại/ghi đè. Đề có thể tạm thời rỗng câu hỏi trong lúc giáo viên tạo và biên soạn; đề không có câu sẽ chưa thể làm bài. Migration tích hợp chuyển schema v1 sang v2, tạo collection `classes` rỗng và bổ sung `classIds: []`; migration v2 sang v3 thêm trường đăng nhập/hồ sơ với mật khẩu mặc định demo `123`; migration v3 sang v4 thêm `birthDate: ''`; migration v4 sang v5 thêm `phone: ''`. Database cũ được sao lưu trước khi lưu phiên bản mới.

## 2. Lớp học và danh mục trong LocalStorageDB

`classes` là danh mục lớp chuẩn có `classId` ổn định, tên không trùng (không phân biệt hoa thường) và `status` là `active` hoặc `inactive`. Mỗi học viên có `classIds: string[]` tham chiếu một hoặc nhiều lớp. Tài khoản cũ được migration với danh sách rỗng; quản trị viên có thể thêm/đổi tên/tạm ẩn lớp, phân nhiều lớp cho học viên và dùng bộ lọc lớp trong danh sách học viên cũng như cửa sổ giao đề. Lớp bị ẩn không xuất hiện trong lựa chọn gán mới nhưng vẫn giữ liên kết hiện có; không xóa lớp để tránh mất liên kết lịch sử. Schema v5 yêu cầu `classIds` là mảng; migration v1 bổ sung `[]` cho record cũ thiếu trường này.

Trong giao diện quản trị, danh sách học viên và lớp học nằm ở hai tab con riêng. Hộp thoại thêm học viên xếp trường theo chiều dọc, có thể đóng bằng nút Hủy/Đóng, phím Escape hoặc nhấn vùng nền; tạo thành công sẽ làm mới danh sách và thông báo username. Tên lớp được kiểm tra trùng không phân biệt hoa thường trước khi thêm.

Các collection `subjects`, `skills` và `difficulties` trong database là nguồn danh mục chuẩn. Giáo viên quản lý chúng qua mục **Môn Học & Kỹ Năng**; form đề/câu hỏi và bộ lọc lấy danh sách từ cùng nguồn. Mỗi record dùng ID ổn định để các nội dung tham chiếu nhất quán:

| Tab | Trường | Ý nghĩa |
|---|---|---|
| `classes` | `classId` | ID lớp học ổn định. |
| `classes` | `name` | Tên lớp duy nhất, trim khoảng trắng và không phân biệt hoa thường khi kiểm tra trùng. |
| `classes` | `status` | `active` hoặc `inactive`; lớp ẩn không nhận thêm học viên, nhưng các thành viên hiện tại vẫn được lưu. |
| `classes` | `createdAt` | Thời điểm tạo ISO 8601 ở lớp mới; lớp cũ có thể không có trường này. |
| `users` | `classIds` | Mảng ID lớp của học viên; mọi ID phải tham chiếu `classes.classId` và không lặp. Tài khoản giáo viên phải có mảng rỗng. |
| `subjects` | `subjectId` | ID môn học ổn định. |
| `subjects` | `name` | Tên môn học duy nhất. |
| `subjects` | `status` | `active` hoặc `inactive`; `inactive` là tạm ẩn. |
| `subjects` | `createdByUserId` | `userId` của giáo viên demo tạo môn học. |
| `subjects` | `createdAt` | Thời điểm tạo ISO 8601, có ở môn học được tạo sau khi hỗ trợ sắp xếp theo thời gian; record cũ có thể không có trường này. |
| `skills` | `skillId` | ID kỹ năng ổn định. |
| `skills` | `subjectId` | ID môn học cha, phải tham chiếu `subjects.subjectId`. |
| `skills` | `name` | Tên kỹ năng duy nhất trong môn học cha. |
| `skills` | `status` | `active` hoặc `inactive`; `inactive` là tạm ẩn. |
| `skills` | `createdAt` | Thời điểm tạo ISO 8601; record cũ có thể không có trường này. |
| `difficulties` | `difficultyId` | ID độ khó ổn định. |
| `difficulties` | `label` | Nhãn hiển thị, ví dụ `Easy`, `Medium`, `Hard`. |
| `difficulties` | `rank` | Thứ hạng số nguyên dương, duy nhất, dùng để so sánh độ khó. |
| `difficulties` | `status` | `active` hoặc `inactive`; `inactive` là tạm ẩn. |

Danh sách môn học và kỹ năng hỗ trợ tìm kiếm, sắp xếp theo tên A–Z/Z–A hoặc theo ngày tạo mới nhất/cũ nhất, và phân trang; mặc định hiển thị mới nhất trước. Record cũ không có `createdAt` vẫn được giữ nguyên; khi sắp xếp theo thời gian, các record này được xem là chưa rõ ngày tạo và giữ thứ tự lưu tương đối với nhau.

Các danh sách dữ liệu phía client dùng `processListRecords()` trong `js/core/utils.js` để áp dụng theo thứ tự tìm kiếm không phân biệt dấu, các bộ lọc đã cấu hình, sắp xếp, rồi mới phân trang. `renderListPagination()` hiển thị khoảng kết quả và trạng thái rỗng; bộ điều khiển tìm kiếm/bộ lọc có hành động đặt lại. Quy mô trang thống nhất là 10, 20, 50 hoặc tất cả. Danh sách lớp và mức độ khó cũng có tìm kiếm, sắp xếp, bộ lọc phù hợp và phân trang; mức độ khó sắp xếp bằng trường số `rank`, không phải chuỗi hiển thị.

Ứng dụng chặn xóa môn học còn kỹ năng/câu hỏi/đề tham chiếu và chặn xóa kỹ năng/độ khó đang được câu hỏi tham chiếu. Không thể ẩn môn còn kỹ năng đang hoạt động hoặc ẩn/xóa độ khó cuối cùng đang hoạt động. Có thể tạm ẩn danh mục để giữ nguyên liên kết. `data/questions.json` hiện rỗng; gói mẫu tạo 3 môn Toán lớp 3–5, 9 lớp (mỗi khối 3 lớp A/B/C), 50 học viên demo và 5 kỹ năng riêng cho từng khối. Phân bổ học viên được trộn có thể tái lập, mỗi lớp có 5 hoặc 6 học viên. Khi nâng cấp gói mẫu, các môn/câu hỏi/đề ngoài Toán khối 3–5 bị xóa khỏi database local; tài khoản, danh sách lớp và tiến độ học viên được giữ. Mọi dữ liệu demo vẫn được giáo viên chỉnh sửa trong ứng dụng.

## 3. Câu hỏi

`data/questions.json` là nguồn tương thích được đọc khi database và cache chưa có dữ liệu; các câu trong tệp được nhóm thành đề mặc định theo từng nhóm 10 câu. Tệp hiện là mảng rỗng, vì vậy không tạo câu hỏi hoặc đề mặc định. Dữ liệu demo hiện được bổ sung từ `data/demo-sample-pack.json`. Câu hỏi trong đề và trong ngân hàng là các object cùng dạng.

| Trường | Kiểu | Trạng thái | Mô tả |
|---|---|---|---|
| `id` | `string` | Cần có để lưu/nhận diện câu hỏi | Định danh câu hỏi. |
| `createdAt` | `ISO8601String` | Tùy chọn | Thời điểm tạo dùng để sắp xếp mới nhất/cũ nhất; bản ghi cũ có thể không có trường này. |
| `subjectId` | `string` | Có ở câu hỏi mới tạo qua giao diện quản trị | ID môn học tham chiếu `Subjects.subjectId`. |
| `skillId` | `string` | Có ở câu hỏi mới tạo qua giao diện quản trị | ID kỹ năng tham chiếu `Skills.skillId`. |
| `topic` | `string` | Có trong dữ liệu mẫu; có thể được suy ra từ đề | Chủ đề chính. |
| `subTopic` | `string` | Tùy chọn | Chủ đề con hoặc tên nhóm kiến thức. |
| `difficulty` | `string` | Có trong dữ liệu mẫu; có thể được suy ra từ đề | Mức độ khó; giá trị cấu hình mặc định gồm `Easy`, `Medium`, `Hard`. |
| `type` | `string` | `single` hoặc `multiple` | `single` có đúng một đáp án đúng và hiển thị radio; `multiple` có một hoặc nhiều đáp án đúng và hiển thị checkbox. |
| `question` | `string` | Có trong dữ liệu mẫu | Nội dung câu hỏi. |
| `options` | `string[]` | Cần có ít nhất hai phương án để hiển thị lựa chọn | Danh sách phương án, không giới hạn ở bốn lựa chọn. |
| `correctAnswer` | `number[]` hoặc `number` | Cần có để chấm | Chỉ số phương án đúng, bắt đầu từ 0. Dạng chuẩn trong dữ liệu là mảng; câu `single` có đúng một chỉ số, câu `multiple` có thể có một hoặc nhiều chỉ số. |
| `explanation` | `string` | Tùy chọn khi hiển thị | Lời giải được trình bày sau khi chọn trong chế độ ôn luyện hoặc trong kết quả. |
| `remediation` | `object` | Tùy chọn | Dữ liệu bổ trợ có thể gồm `concept` và `suggestedRead`; luồng chấm hiện tại không yêu cầu trường này. |

Ví dụ tối giản theo dữ liệu hiện tại:

```json
{
  "id": "q_web_01",
  "subjectId": "subject-id-from-LocalStorageDB",
  "skillId": "skill-id-from-LocalStorageDB",
  "topic": "HTML5 Basic",
  "subTopic": "HTML Elements",
  "difficulty": "Easy",
  "type": "multiple",
  "question": "Chọn các phần tử HTML5 semantic trong danh sách.",
  "options": ["<h1>", "<header>", "<main>", "<div>", "<nav>"],
  "correctAnswer": [1, 2, 4],
  "explanation": "header, main và nav là các phần tử semantic."
}
```

Đề thi có cấu trúc hiện dùng:

| Trường | Kiểu | Mô tả |
|---|---|---|
| `id` | `string` | Định danh đề. |
| `createdAt` | `ISO8601String` | Tùy chọn | Thời điểm tạo dùng để sắp xếp mới nhất/cũ nhất; bản ghi cũ có thể không có trường này. |
| `subjectId` | `string` | Có ở đề tạo/sửa từ giao diện mới; ID tham chiếu `Subjects.subjectId`. |
| `title` | `string` | Tên đề hiển thị. |
| `topic` | `string` | Chủ đề đề. |
| `difficulty` | `string` | Nhãn độ khó suy ra từ trung bình thứ hạng độ khó của các câu hỏi trong đề, ánh xạ về mức gần nhất trong danh mục. Không chọn riêng ở form đề; đề chưa có câu hỏi thì chưa có độ khó. |
| `timeLimit` | `number` | Thời lượng tính bằng phút; được dùng cho đồng hồ ở chế độ `EXAM`. |
| `generationSpec` | `Record<skillId, positiveInteger>` | Phân bổ số câu theo từng kỹ năng; tổng số phải khớp số câu đã lưu trong đề. Công cụ admin trộn ngẫu nhiên câu đang hoạt động trực tiếp từ ngân hàng theo môn/kỹ năng và cố định câu đã chọn vào đề. |
| `assignedStudentIds` | `string[]` | Danh sách `userId` học viên được giáo viên chọn để giao đề; chỉ tài khoản `student` hợp lệ. Catalog học viên chỉ hiển thị đề chứa ID tài khoản hiện tại; trước khi bắt đầu, quyền được đọc lại từ database. Thiếu trường ở đề cũ được hiểu là `[]`, tức chưa giao cho ai. Giáo viên chọn trong cửa sổ riêng có tìm theo mã/họ tên, lọc trạng thái/lớp và phân trang; lựa chọn chỉ cập nhật vào form đề sau khi xác nhận. |
| `maxAttempts` | `positiveInteger \| null` | Số lượt làm bài đã nộp tối đa; `null` là không giới hạn. Một lượt được tính sau khi kết quả được lưu thành công, lượt bỏ dở không tính. Đề cũ thiếu trường mặc định là `null`. |
| `scorePolicy` | `highest \| average \| latest` | Cách tính điểm tổng hợp theo từng cặp học viên/đề; `highest` chọn điểm cao nhất, `average` lấy trung bình và làm tròn 1 chữ số thập phân, `latest` chọn lượt có `completedAt` mới nhất. Đề cũ thiếu trường mặc định `highest`. |
| `dueAt` | `ISO8601String \| null` | Hạn chót để bắt đầu lượt mới; `null` là vô thời hạn. Từ thời điểm này trở đi không thể bắt đầu lượt mới; lượt bắt đầu trước hạn vẫn được tiếp tục và nộp sau hạn. Đề cũ thiếu trường mặc định là `null`. |
| `questions` | `Question[]` | Các câu hỏi thuộc đề. |

Các trường được kiểm tra bởi `LocalStorageDB.validate()`. Thiếu các trường chính sách ở record cũ được chấp nhận theo các mặc định trên; nếu có trường thì phải đúng kiểu và tham chiếu hợp lệ. Luồng bắt đầu đề kiểm tra giao đề, hạn chót và số lượt đã lưu trước khi mở đề; các điều kiện được xác minh lại ngay trước khi khởi chạy. Đề được giao hiện luôn khởi chạy ở chế độ `EXAM`; giao diện không cung cấp lựa chọn `PRACTICE`. Bộ render vẫn hỗ trợ `PRACTICE` với thời gian vô hạn và hiển thị lời giải sau khi chọn; lịch sử vẫn có thể chứa lượt `PRACTICE` cũ. Báo cáo và thống kê tổng hợp điểm theo chính sách đề, trong khi từng lượt vẫn giữ điểm riêng và không bị ghi đè.

Các danh sách đề, câu hỏi, lớp, tài khoản, học sinh nhận đề và lịch sử cho phép sắp xếp mới nhất/cũ nhất cùng các lựa chọn sắp xếp theo tên hiện có; mặc định là mới nhất trước. Dữ liệu mới được tạo qua giao diện quản trị ghi `createdAt`; lịch sử dùng `completedAt`. Bản ghi cũ không có mốc thời gian được giữ nguyên và xếp sau các bản ghi có ngày, theo thứ tự lưu ban đầu.

Trong record `quizzes` của database, `difficultyId` là tùy chọn và được tính từ thứ hạng độ khó trung bình của các câu hỏi, rồi ánh xạ về mức gần nhất trong danh mục (nếu bằng khoảng cách thì chọn thứ hạng cao hơn). Đề chưa có câu hỏi thì không có `difficultyId`; nhãn tương thích `difficulty` trên object hiển thị cũng không được gán cho đến khi đề có câu hỏi.

## 4. Tài khoản

Đăng nhập demo dùng username và mật khẩu từ collection `users` của `adaptive_quiz_demo_db`; không dùng Google OAuth. Record seed JSON tiếp tục chỉ cung cấp danh tính/role/trạng thái, còn `normalizeSeedUsers()` bổ sung username từ `userId`, mật khẩu ban đầu `123` và giá trị hồ sơ mặc định. Giáo viên demo có thể tạo tài khoản học viên trong tab quản lý tài khoản; tài khoản mới dùng `userId` sinh tự động, username chuẩn hóa chữ thường, role `student`, trạng thái `active`, không gán lớp và giá trị hồ sơ mặc định.

Tài khoản sử dụng bởi `Auth` có dạng:

| Trường | Kiểu | Mô tả |
|---|---|---|
| `userId` | `string` | ID ổn định trong database local và session. |
| `username` | `string` | Tên đăng nhập 3–40 ký tự chữ/số/`.`/`_`/`-`, duy nhất sau khi trim và chuyển chữ thường. |
| `password` | `string` | Mật khẩu demo dạng plain text trong `localStorage`; seed và tài khoản cũ sau migration mặc định `123`. |
| `fullName` | `string` | Tên hiển thị. |
| `nickname` | `string` | Biệt danh, mặc định chuỗi rỗng; học viên có thể tự sửa (tối đa 40 ký tự). |
| `avatar` | `string` | ID avatar preset, mặc định `seedling`; học viên có thể chọn `seedling`, `sunflower`, `book`, `star` hoặc `fox`. Không lưu ảnh tải lên. |
| `birthDate` | `string` | Ngày sinh dạng `YYYY-MM-DD`; chuỗi rỗng nếu chưa cập nhật. Phải là ngày có thật và không nằm trong tương lai. |
| `phone` | `string` | Số điện thoại tùy chọn; chuỗi rỗng nếu chưa cập nhật, nếu có phải gồm 9–15 chữ số và định dạng ký tự phổ biến. |
| `role` | `string` | `student` hoặc `admin`; giao diện chọn dashboard dựa trên role. |
| `status` | `string` | `active`, `inactive` hoặc `locked`; chỉ tài khoản `active` đăng nhập được. |
| `classIds` | `string[]` | Mảng ID lớp áp dụng với học viên; ID phải tham chiếu `classes.classId`, không trùng. Giáo viên có mảng rỗng; record cũ thiếu trường được hiểu là `[]`. |

Session `app_current_user` chỉ giữ `{ userId }`; `Auth.getCurrentUser()` đọc lại hồ sơ hiện hành từ database. Cache tiến độ legacy tiếp tục được nhận diện theo username thật; các tài khoản seed giữ username bằng `userId`.

`Auth.createStudentAccount()` chỉ cho phép phiên hiện tại có role `admin`, kiểm tra họ tên, định dạng/độ duy nhất username và mật khẩu không rỗng trước khi ghi. Mật khẩu của tài khoản mới theo lựa chọn demo được lưu plain text trong `localStorage`, nhưng không được trả về từ API hồ sơ người dùng hoặc hiển thị trong bảng, log hay thông báo.

`Auth.updateOwnProfile()` chỉ cập nhật `nickname`, `birthDate`, `phone` và `avatar` của học viên đang đăng nhập; không nhận `userId`, nên caller không thể chỉ định hồ sơ của tài khoản khác. Họ tên, username và role không thể sửa qua trang cá nhân. Avatar dùng bộ preset emoji để tránh lưu ảnh lớn vào database local. Lớp được hiển thị từ `classIds` hiện tại và danh mục lớp, không cho học viên tự sửa.

`Auth.updateOwnPassword()` chỉ cập nhật mật khẩu của học viên đang đăng nhập sau khi xác minh mật khẩu hiện tại; mật khẩu mới phải dài 8–128 ký tự và khác mật khẩu cũ. Form trang cá nhân yêu cầu xác nhận khớp trước khi gọi service. Mật khẩu tiếp tục lưu plain text trong bản demo localStorage, không được xem là biện pháp bảo vệ an toàn.

Danh sách học viên cung cấp thao tác chỉ đọc để giáo viên xem hồ sơ và tiến độ của từng học viên. Thống kê được tổng hợp từ các lượt làm bài đã lưu theo `userId`, còn chuỗi học/cây/xô nước đọc từ `studentProgress` tương ứng; nội dung không cập nhật tiến độ của học viên đang đăng nhập và không cung cấp thao tác sửa hồ sơ.

> **Giới hạn bảo mật:** mật khẩu được lưu dạng plain text; không có xác thực server. Bất kỳ người dùng trình duyệt nào cũng có thể đọc mật khẩu hoặc sửa role trong database local. Chỉ dùng dữ liệu giả cho demo trên một máy; tuyệt đối không dùng mật khẩu thật hoặc xem đây là kiểm soát truy cập an toàn cho production.

## 5. Lịch sử làm bài

Mỗi lượt hoàn thành được thêm vào đầu collection `attempts` trong `adaptive_quiz_demo_db`. `quiz_history_all` chỉ còn là nguồn legacy để import an toàn.

| Trường | Kiểu | Mô tả |
|---|---|---|
| `attemptId` | `string` | Định danh lượt làm được tạo khi nộp bài. |
| `quizId` | `string \| null` | ID từ `AppState.currentQuiz`, nếu có. |
| `timestamp` | `string` | Thời gian hoàn thành theo locale `vi-VN`. |
| `startedAt` | `string` | Thời điểm bắt đầu dạng ISO 8601 UTC; bản ghi legacy không có trường này dùng thời điểm hoàn thành. |
| `completedAt` | `string` | Thời điểm hoàn thành dạng ISO 8601 UTC. |
| `username` | `string` | Tên hiển thị của học viên tại thời điểm lưu. |
| `ownerUsername` | `string \| null` | Tên đăng nhập dùng để lọc lịch sử theo tài khoản. |
| `quizTitle` | `string` | Tên lấy từ `AppState.currentQuiz`, hoặc tiêu đề dự phòng `Luyện tập AI` nếu không có. |
| `topic` | `string` | Chủ đề đề hiện tại, mặc định `Chung`. |
| `score` | `number` | Điểm trên thang 10. |
| `correctCount` | `number` | Số câu đúng. |
| `totalQuestions` | `number` | Tổng số câu được chấm. |
| `mode` | `string` | `EXAM` hoặc `PRACTICE`. |
| `questions` | `Question[]` | Snapshot câu hỏi tại thời điểm nộp. |
| `answers` | `Record<string, number[]>` | Lựa chọn theo ID câu hỏi. Câu chưa trả lời không có lựa chọn tương ứng. |

Lượt luyện AI không gán một đề mới vào `AppState.currentQuiz`; do đó metadata `quizId`, `quizTitle` và `topic` có thể giữ thông tin đề đã làm trước đó trong cùng phiên. Nếu không có đề hiện tại, `quizId` là `null`, tiêu đề là `Luyện tập AI`, và chủ đề là `Chung`.

Trong database, mỗi attempt có `userId`, `quizId`, `mode`, `startedAt`, `completedAt`, `score`, `correctCount`, `totalQuestions` và `items` snapshot gồm nội dung câu, phương án, đáp án đúng/đã chọn, kết quả và thông tin kỹ năng/độ khó có thể xác định. Metadata hiển thị như tên học viên, tên đề và timestamp locale được giữ cùng attempt để tương thích với màn hình hiện có. `startedAt` của lịch sử cũ được đặt bằng `completedAt`, vì dữ liệu legacy không ghi thời điểm bắt đầu.

Khi import, chủ sở hữu được dò theo `ownerUsername`/`username` khớp `userId` hoặc tên hiển thị. Bản ghi không có snapshot câu hỏi/đáp án đầy đủ, không hợp lệ hoặc không tìm được tài khoản vẫn ở `quiz_history_all`; chúng không bị gán tùy tiện cho người dùng khác. Lịch sử học viên và báo cáo giáo viên đọc database cùng các mục legacy còn lại.

`QuizEngine.evaluateQuiz()` bổ sung `subjectStats`, nhóm số câu đúng/tổng số theo môn và `skillId`/tên kỹ năng. Kết quả từng đề hiển thị từng kỹ năng; tỷ lệ đúng dưới 60% được gắn nhãn **Cần củng cố**. Thống kê học viên gộp các lượt đã lưu của tài khoản hiện tại theo môn và kỹ năng; lượt chỉ được tính khi còn snapshot câu hỏi và đáp án. Câu hỏi không có kỹ năng được gom riêng vào **Chưa phân loại kỹ năng**, không tự suy diễn từ `subTopic`.

## 6. Tiến độ cá nhân

### Gamification

Collection `studentProgress` lưu một record theo `userId`, gộp các trường:

```json
{
  "treeStage": 1,
  "currentExp": 0,
  "streakCount": 1,
  "lastActiveDate": "21/10/2026",
  "waterProgress": 0,
  "fullBucketCount": 0,
  "bucketsWatered": 0
}
```

`lastActiveDate` tiếp tục dùng định dạng locale `vi-VN` để tương thích logic streak hiện tại. Các khóa cá nhân `_gamification`/`_mascot` là nguồn legacy được nhập khi đọc; phần ghi mới cập nhật `studentProgress`. `waterProgress` tích lũy tiến độ xô nước; khi đạt 5, `fullBucketCount` tăng và tiến độ trở về 0.

Trong khu vườn, học viên chưa tưới lần nào (`bucketsWatered` bằng 0, EXP bằng 0 và cây ở cấp 1) chỉ thấy hạt giống. Sau lần tưới đầu tiên, cây mầm xuất hiện và hạt giống được ẩn vĩnh viễn dựa trên `bucketsWatered` hoặc trạng thái phát triển đã lưu.

Mỗi lượt đạt điểm 10 cộng một vạch tiến độ nước; đủ 5 lượt thì nhận một xô. Dữ liệu mẫu phiên bản 9 minh họa phép tính này với 250 lượt đạt 10/10, 50 xô đầy và 4/5 vạch nước cho một học viên.

Khi một lượt đạt mốc làm đầy xô, giao diện hiện lớp phủ chúc mừng với hiệu ứng xô xoay và nước tràn; lớp phủ không làm thay đổi dữ liệu ngoài việc cộng xô đã lưu.

## 7. Tích hợp Gemini

`AIService.generateRemediationQuiz(wrongQuestions)` nhận danh sách câu sai. Với mỗi câu, phần context gửi trong prompt gồm `topic`, `subTopic`, `failedQuestion` (nội dung câu hỏi) và `explanation`. Prompt yêu cầu sinh số câu bằng số câu sai, độ khó tương đương hoặc thấp hơn, và yêu cầu kết quả là mảng câu hỏi có các trường `id`, `topic`, `subTopic`, `difficulty`, `type`, `question`, `options`, `correctAnswer`, `explanation`.

### Request gửi đến Gemini

Mã gọi `generateContent` bằng HTTP `POST`, gửi payload dạng:

```json
{
  "contents": [
    {
      "parts": [
        {
          "text": "<prompt kèm context câu hỏi sai>"
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

Service thử tuần tự các model được khai báo trong `AVAILABLE_MODELS`. Mã hiện tại nhúng API key trong JavaScript phía client, vì vậy key có thể bị người dùng lấy được. Không sao chép giá trị key vào tài liệu; cần thu hồi/thay mới key đã bị lộ và chuyển lời gọi qua backend/proxy bảo vệ bí mật khi triển khai thực tế.

### Response và fallback thực tế

- Khi gọi thành công, service đọc `candidates[0].content.parts[0].text` từ response Gemini, parse chuỗi đó bằng `JSON.parse`, gán kết quả vào `AppState.aiQuestions` và trả về. Mã hiện chưa kiểm tra đầy đủ schema hoặc số lượng câu sau khi parse.
- Nếu mọi lần gọi đều thất bại, fallback sao chép các câu sai nhận được, thay `id` thành `fallback_q_<n>` rồi trả lại. Fallback **không đọc** `data/questions.json`, dù thông báo hiện trên giao diện mô tả là kho câu hỏi nội bộ.
- Nếu danh sách câu sai rỗng, hàm trả `null` và không gửi request.
- Nội dung mảng câu hỏi trong prompt là định dạng AI được yêu cầu trả về, không phải response wrapper thô của Gemini.

Vì vậy, hợp đồng JSON được yêu cầu trong prompt chưa được xác thực chặt chẽ ở runtime; client cần xem dữ liệu AI là đầu vào không đáng tin cậy.
