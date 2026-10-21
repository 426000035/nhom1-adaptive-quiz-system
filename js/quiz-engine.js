/* ==========================================================================
   Adaptive Quiz System - Quiz Execution & Analytics Engine (js/quiz-engine.js)
   ========================================================================== */

window.QuizEngine = {
  timerId: null,

  /**
   * Bắt đầu đồng hồ đếm ngược thời gian làm bài
   * @param {number} durationInSeconds Tổng số giây làm bài
   * @param {function} onTick Callback mỗi giây (trả về chuỗi MM:SS)
   * @param {function} onComplete Callback khi hết giờ
   */
  startTimer(durationInSeconds, onTick, onComplete) {
    // Xóa timer cũ nếu đang chạy
    this.stopTimer();

    let remainingSeconds = parseInt(durationInSeconds);
    if (isNaN(remainingSeconds) || remainingSeconds <= 0) {
      remainingSeconds = 600; // Mặc định 10 phút nếu dữ liệu thời gian bị lỗi
    }

    const updateDisplay = () => {
      if (remainingSeconds <= 0) {
        this.stopTimer();
        if (typeof onTick === 'function') onTick("00:00");
        if (typeof onComplete === 'function') onComplete();
        return;
      }

      const minutes = Math.floor(remainingSeconds / 60);
      const seconds = remainingSeconds % 60;
      const timeStr = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
      
      if (typeof onTick === 'function') onTick(timeStr);

      remainingSeconds--;
    };

    updateDisplay(); // Chạy cập nhật ngay giây đầu tiên
    this.timerId = setInterval(updateDisplay, 1000);
  },

  /**
   * Dừng đồng hồ đếm ngược
   */
  stopTimer() {
    if (this.timerId) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
  },

  /**
   * Ghi nhận lựa chọn đáp án của người dùng
   * @param {string} questionId 
   * @param {Array<number>} selectedOptions 
   */
  recordAnswer(questionId, selectedOptions) {
    if (!window.AppState) window.AppState = {};
    if (!window.AppState.answers) window.AppState.answers = {};
    window.AppState.answers[questionId] = selectedOptions || [];
  },

  /**
   * Chấm điểm bài làm & phân tích theo chủ đề
   * @param {Array} questions - Danh sách câu hỏi
   * @param {Object} userAnswers - Object lưu câu trả lời { "q1": [0] }
   * @returns {Object} Kết quả chấm điểm
   */
  evaluateQuiz(questions = [], userAnswers = {}) {
    let correctCount = 0;
    const wrongQuestions = [];
    const topicStats = {};

    const safeQuestions = Array.isArray(questions) ? questions : [];
    const totalQuestions = safeQuestions.length;

    safeQuestions.forEach(q => {
      if (!q) return;
      const userSel = userAnswers[q.id] || [];
      const correctSel = Array.isArray(q.correctAnswer) ? q.correctAnswer : [q.correctAnswer || 0];
      const topicName = q.topic || 'Chung';

      // Khởi tạo thống kê theo chủ đề
      if (!topicStats[topicName]) {
        topicStats[topicName] = { total: 0, correct: 0 };
      }
      topicStats[topicName].total++;

      // So sánh mảng đáp án chọn vs đáp án chuẩn
      const isCorrect = userSel.length === correctSel.length && 
                        userSel.every(val => correctSel.includes(val));

      if (isCorrect) {
        correctCount++;
        topicStats[topicName].correct++;
      } else {
        wrongQuestions.push({
          ...q,
          userSelection: userSel
        });
      }
    });

    // Tránh lỗi chia cho 0 (Division by zero)
    const score10 = totalQuestions > 0 ? Number(((correctCount / totalQuestions) * 10).toFixed(1)) : 0;
    const accuracyPercentage = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;

    const results = {
      score: score10,
      accuracy: accuracyPercentage,
      correctCount: correctCount,
      totalQuestions: totalQuestions,
      wrongQuestions: wrongQuestions,
      topicStats: topicStats
    };

    if (window.AppState) {
      window.AppState.quizResults = results;
    }
    return results;
  },

  /**
   * Vẽ biểu đồ phân tích kỹ năng bằng Chart.js
   * @param {string} canvasId 
   * @param {Object} topicStats 
   */
  renderChart(canvasId, topicStats = {}) {
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;

    // Xóa biểu đồ cũ nếu đã tồn tại
    if (window.mySkillsChart) {
      window.mySkillsChart.destroy();
    }

    const labels = Object.keys(topicStats);
    if (labels.length === 0) return;

    const accuracyData = labels.map(topic => {
      const stat = topicStats[topic];
      return stat && stat.total > 0 ? Math.round((stat.correct / stat.total) * 100) : 0;
    });

    if (typeof Chart !== 'undefined') {
      window.mySkillsChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
          labels: labels,
          datasets: [{
            label: 'Tỷ lệ đúng (%)',
            data: accuracyData,
            backgroundColor: ['#38bdf8', '#818cf8', '#a855f7', '#10b981'],
            borderWidth: 0
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'bottom',
              labels: { color: '#94a3b8', font: { family: 'Inter' } }
            }
          }
        }
      });
    }
  }
};