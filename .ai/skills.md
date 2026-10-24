# Hướng dẫn năng lực và API cho AI coding agent

Tài liệu này giúp AI coding agent làm việc với các module hiện có của Adaptive Quiz System. Các API được liệt kê dưới đây đã được đối chiếu với mã nguồn. Không giả định những hàm chưa có trong mã là API sẵn dùng; nếu cần bổ sung, hãy xem đó là thay đổi cần triển khai và kiểm thử.

## 1. Nguyên tắc làm việc trong dự án

- Dự án dùng HTML5, CSS3 và JavaScript thuần chạy phía trình duyệt; không thêm backend, bundler hoặc framework nếu chưa được yêu cầu.
- `index.html` nạp script tuần tự. Khi thêm module, cập nhật đúng thứ tự nạp và kiểm tra các phụ thuộc global.
- `data/questions.json` và `data/users.json` được dùng khởi tạo một lần cho `adaptive_quiz_demo_db`; đăng nhập demo, tài khoản, môn học, kỹ năng, độ khó, đề, câu hỏi, lịch sử và tiến độ hiện đọc/ghi database local.
- Trạng thái runtime tập trung trong `window.AppState`; dữ liệu đề, ngân hàng và cài đặt được quản lý qua `js/core/state.js`.
- Giữ các luồng hiện tại tương thích với `localStorage`. Không mô tả dữ liệu client là xác thực, phân quyền hoặc lưu trữ an toàn.
- Khi sửa tài liệu, phân biệt rõ hành vi đã triển khai với đề xuất/chức năng tương lai.

## 2. Module nền tảng

### SKILL-01: Xác thực và phiên người dùng

**Module:** `js/core/auth.js`

`window.Auth` cung cấp:

- `getUsers()` — đọc danh sách tài khoản từ `LocalStorageDB`.
- `getCurrentUser()` — lấy `userId` từ `app_current_user`, sau đó đọc lại hồ sơ/role hiện hành trong database; phiên sai hoặc tài khoản bị khóa không được chấp nhận.
- `init()` — hiện không tạo hay sửa tài khoản.
- `login(username, password)` — đăng nhập bằng username và mật khẩu của tài khoản demo đang hoạt động; username không phân biệt hoa thường. Ném lỗi nếu thông tin không hợp lệ hoặc tài khoản không hoạt động. Session chỉ lưu `userId`.
- `createStudentAccount(fullName, username, password)` — chỉ admin demo mới có thể tạo tài khoản học viên.
- `updateUser(userId, patch)` — cho phép session admin demo cập nhật `role` hoặc `status` qua database local.
- `updateOwnProfile(patch)` và `updateOwnPassword(currentPassword, newPassword)` — học viên cập nhật hồ sơ cho phép hoặc đổi mật khẩu sau khi xác minh mật khẩu hiện tại.
- `logout()` — xóa khóa `app_current_user`.

Lưu ý: đây là đăng nhập username/mật khẩu client-side cho demo, không phải xác thực hoặc phân quyền an toàn. Không có luồng tự đăng ký; tài khoản học viên do giáo viên demo tạo. Event handler đồng bộ `AppState.currentUser`, header và điều hướng. Không có API `register()`.

### SKILL-02: Điều hướng SPA và danh mục đề

**Modules:** `js/core/router.js`, `js/features/student/student-view.js`

- `navigateTo(viewId)` — ẩn các `.view-section` rồi hiển thị section được chỉ định; nếu không tồn tại, thử hiển thị `view-list`.
- `updateNavUI(user)` — cập nhật nhóm nút khách/người dùng và thông tin role trên header.
- `filterAndRenderQuizzes()` — đọc filter/sort/page state trong `AppState.listsState.catalog`, lọc danh sách `AppState.allQuizzes`, sau đó render danh sách và phân trang.
- `renderQuizCatalog(quizzes, totalCount)` — render thẻ đề thi.
- `startQuizExecution(quizId)` — kiểm tra quyền giao và chính sách rồi khởi chạy đề được giao ở chế độ `EXAM`.

Các hàm này là hàm toàn cục được khai báo bằng function declaration; chúng không thuộc một object API `Router` hay `StudentView`.

## 3. Trạng thái và engine làm bài

### SKILL-03: AppState và dữ liệu dùng chung

**Module:** `js/core/state.js`

`window.AppState` gồm các trường runtime chính:

- Người dùng: `currentUser`.
- Dữ liệu: `allQuizzes`, `allQuestions`, `settings`.
- Bài đang làm: `currentQuiz`, `currentQuestions`, `currentQuestionIndex`, `answers`, `quizMode`.
- Kết quả và AI: `quizResults`, `aiQuestions`.
- Điều hướng/lọc: `resultReturnTo`, `listsState`.

`window.AppStorageKeys` giữ tên tương thích `quizzes`, `questions`, `settings`. Khóa đề/câu hỏi legacy chỉ được đọc khi import dữ liệu cũ và bị xóa sau khi ghi thành công vào `LocalStorageDB`; database là nguồn chuẩn hiện tại. `adaptive_quiz_settings` là cache tương thích, được đồng bộ từ danh mục trong database. `window.StudentDataStorage.read(dataType, legacyKey, defaultValue)` và `.write(dataType, data)` đọc/ghi `studentProgress` theo `userId`, đồng thời nhập cache gamification/mascot cũ an toàn. `window.QuizHistoryStorage.readAll()` và `.save(historyItem)` đọc/ghi lịch sử qua collection `attempts`; bản ghi legacy không thể chuyển an toàn được giữ lại.

`window.MascotEngine.emit(eventName, context)` phát lời thoại sự kiện; các tích hợp hiện có dùng `onLogin(user)`, `onSessionResume(user)`, `recordAnswer(isCorrect)`, `resetAnswerStreak()`, `speakWaterStatus()` và `resetSession()`. Event dispatcher cá nhân hóa sau đăng nhập, chọn lời thoại theo ưu tiên và áp dụng cooldown; không tự phát thoại ngẫu nhiên lúc chờ.

### SKILL-04: Quiz Engine và chấm điểm

**Module:** `js/core/quiz-engine.js`

`window.QuizEngine` cung cấp các phương thức thực tế sau:

- `startTimer(durationInSeconds, onTick, onComplete)` — đếm ngược, gọi `onTick` mỗi giây và `onComplete` khi hết giờ. Nếu thời lượng không hợp lệ hoặc không dương, timer dùng mặc định 600 giây.
- `stopTimer()` — dừng timer.
- `recordAnswer(questionId, selectedOptions)` — lưu lựa chọn vào `AppState.answers[questionId]`.
- `evaluateQuiz(questions, userAnswers)` — trả object `{ score, accuracy, correctCount, totalQuestions, wrongQuestions, topicStats, subjectStats }` và cập nhật `AppState.quizResults`.
- `buildSkillStats(questions, userAnswers)` — nhóm câu đúng/tổng theo subject ID và skill ID từ database; có thể khôi phục phân loại câu hỏi lịch sử bằng ID câu hỏi hiện có.
- `aggregateSkillStats(historyItems)` — gộp hiệu suất môn/kỹ năng qua các lượt làm; dùng trong thống kê học viên.
- `WEAK_SKILL_THRESHOLD` — ngưỡng tỷ lệ đúng phần trăm; hiện là 60.
- `renderChart(canvasId, stats)` — dùng Chart.js vẽ biểu đồ doughnut theo tỷ lệ đúng từng môn trong trang kết quả.

**Không có** các API `QuizEngine.start()`, `QuizEngine.submit()` hoặc `QuizEngine.updateProgressBar()`. Việc khởi tạo bài, nộp/chấm bài và vẽ thanh tiến độ nằm trong `js/features/student/student-view.js`. Thanh tiến độ thể hiện vị trí câu đang xem, không phải phần trăm câu đã trả lời.

Đề được giao không giới hạn số lượt (`maxAttempts: null`) và không có hạn chót (`dueAt: null`) cho phép học viên chọn `EXAM` hoặc `PRACTICE`. `EXAM` dùng thời lượng đề nếu có và tự nộp khi hết giờ; `PRACTICE` không giới hạn giờ và hiện lời giải sau khi chấm. Câu một đáp án được chấm ngay khi chọn; câu nhiều đáp án cho phép chọn/bỏ chọn nhiều phương án rồi bấm “Kiểm tra đáp án”, sau đó mới chấm và khóa lựa chọn. Đề có giới hạn lượt hoặc hạn chót vẫn chỉ bắt đầu ở `EXAM`. Lịch sử vẫn nhận diện các record `PRACTICE` cũ.

### SKILL-05: Kết quả và câu sai

Kết quả `QuizEngine.evaluateQuiz()` có `wrongQuestions`, `topicStats` và `subjectStats` lồng môn học/kỹ năng; chưa có trường `weakConcepts`. UI đánh dấu kỹ năng có tỷ lệ đúng dưới 60% là cần củng cố. `QuizEngine.aggregateSkillStats(historyItems)` gộp hiệu suất theo môn/kỹ năng cho dashboard học viên. Mỗi câu sai chứa thông tin câu hỏi cùng `userSelection`. Hệ thống lưu lịch sử sau khi nộp bài vào `attempts`, gồm snapshot câu hỏi/đáp án, điểm, chế độ, thời điểm bắt đầu và hoàn thành. Bản ghi lịch sử cũ không có thời điểm bắt đầu được chuyển với `startedAt` bằng `completedAt`; duration của bản ghi cũ không thể khôi phục. Câu hỏi thiếu skill ID cần giữ nhãn chưa phân loại; không dùng `subTopic` hay tên đề làm kỹ năng.

## 4. Tích hợp AI

### SKILL-06: Sinh bài luyện từ câu sai

**Module:** `js/services/ai-service.js`

`window.AIService` cung cấp:

- `generateRemediationQuiz(wrongQuestions)` — trả `null` khi danh sách rỗng; nếu không, gửi context câu sai đến Gemini, parse JSON text thành câu hỏi, cập nhật `AppState.aiQuestions`, rồi trả mảng câu hỏi. Service thử các model trong `AVAILABLE_MODELS` theo thứ tự khai báo.
- `fallbackToStaticQuestions(wrongQuestions)` — tạo bản sao các câu sai với ID mới `fallback_q_<n>`.

Fallback hiện **không** đọc `data/questions.json`. Nội dung cảnh báo trong giao diện đang gọi đó là kho câu hỏi nội bộ nhưng chưa khớp hành vi thật. Response Gemini được parse nhưng chưa được xác thực đầy đủ theo schema; hãy xem dữ liệu AI là đầu vào không đáng tin cậy.

API key hiện được đặt trong mã JavaScript phía client. Không sao chép key vào tài liệu, log, ví dụ hoặc commit; key đã bị lộ cần được thu hồi/thay mới. Không triển khai key production trong client; hãy đề xuất backend/proxy khi cần bảo vệ bí mật.

## 5. UI và thư viện CDN

- SweetAlert2 được gọi trực tiếp bằng `Swal.fire(...)` trong các module; không có wrapper `ui.showAlert()` hoặc `ui.showConfirm()`.
- Canvas Confetti được gọi khi điểm đạt từ `8.0/10` trở lên; chưa có API wrapper `ui.triggerConfetti()`.
- Lucide được làm mới bằng `lucide.createIcons()` ở các nơi render nội dung động; chưa có wrapper `ui.refreshIcons()`.
- Chart.js được dùng trong `QuizEngine.renderChart()`.
- Prism được nạp từ CDN trong `index.html`, nhưng hiện chưa thấy logic gọi highlight trong mã JavaScript. Không mô tả `ui.highlightCode()` hoặc khả năng highlight đang hoạt động nếu chưa triển khai.

## 6. Những API không nên giả định tồn tại

Các tên sau từng xuất hiện trong tài liệu cũ nhưng không có implementation hiện tại:

- `Auth.register(userData)`.
- `QuizEngine.start(quizId)`, `QuizEngine.submit()`, `QuizEngine.updateProgressBar()`.
- Object `analytics` với `getWrongQuestions()` hoặc `extractWeakConcepts()`.
- `AppState.quizResults.weakConcepts`.
- Các wrapper `ui.showAlert()`, `ui.showConfirm()`, `ui.triggerConfetti()`, `ui.highlightCode()` và `ui.refreshIcons()`.

Trước khi dùng một API, kiểm tra module nguồn hoặc cập nhật implementation và tài liệu trong cùng thay đổi.
