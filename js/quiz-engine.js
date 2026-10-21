/* ==========================================================================
   Adaptive Quiz System - Quiz Execution & Analytics Engine (js/quiz-engine.js)
   ========================================================================== */

window.QuizEngine = {
  
  /**
   * Khởi chạy đồng hồ đếm ngược
   * @param {number} durationInSeconds 
   * @param {Function} onTick 
   * @param {Function} onTimeUp 
   */
  startTimer(durationInSeconds, onTick, onTimeUp) {
    this.stopTimer();
    window.AppState.timeRemaining = durationInSeconds;

    window.AppState.timerInterval = setInterval(() => {
      window.AppState.timeRemaining--;
      
      const minutes = Math.floor(window.AppState.timeRemaining / 60);
      const seconds = window.AppState.timeRemaining % 60;
      const formattedTime = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
      
      if (onTick) onTick(formattedTime, window.AppState.timeRemaining);

      if (window.AppState.timeRemaining <= 0) {
        this.stopTimer();
        if (onTimeUp) onTimeUp();
      }
    }, 1000);
  },

  /**
   * Dừng đồng hồ đếm ngược
   */
  stopTimer() {
    if (window.AppState.timerInterval) {
      clearInterval(window.AppState.timerInterval);
      window.AppState.timerInterval = null;
    }
  },

  /**
   * Ghi nhận lựa chọn đáp án của người dùng
   * @param {string} questionId 
   * @param {Array<number>} selectedOptions 
   */
  recordAnswer(questionId, selectedOptions) {
    window.AppState.answers[questionId] = selectedOptions;
  },

  /**
   * Chấm điểm bài làm
   * @param {Array} questions - Danh sách câu hỏi
   * @param {Object} userAnswers - Object lưu câu trả lời { "q1": [0] }
   * @returns {Object} Результаты chấm điểm & phân tích
   */
  evaluateQuiz(questions, userAnswers) {
    let correctCount = 0;
    const wrongQuestions = [];
    const topicStats = {};

    questions.forEach(q => {
      const userSel = userAnswers[q.id] || [];
      const correctSel = q.correctAnswer || [];

      // Khởi tạo thống kê theo chủ đề
      if (!topicStats[q.topic]) {
        topicStats[q.topic] = { total: 0, correct: 0 };
      }
      topicStats[q.topic].total++;

      // So sánh mảng đáp án chọn vs đáp án chuẩn
      const isCorrect = userSel.length === correctSel.length && 
                        userSel.every(val => correctSel.includes(val));

      if (isCorrect) {
        correctCount++;
        topicStats[q.topic].correct++;
      } else {
        wrongQuestions.push({
          ...q,
          userSelection: userSel
        });
      }
    });

    const totalQuestions = questions.length;
    const score10 = Number(((correctCount / totalQuestions) * 10).toFixed(1));
    const accuracyPercentage = Math.round((correctCount / totalQuestions) * 100);

    const results = {
      score: score10,
      accuracy: accuracyPercentage,
      correctCount: correctCount,
      totalQuestions: totalQuestions,
      wrongQuestions: wrongQuestions,
      topicStats: topicStats
    };

    window.AppState.quizResults = results;
    return results;
  },

  /**
   * Vẽ biểu đồ phân tích kỹ năng bằng Chart.js
   * @param {string} canvasId 
   * @param {Object} topicStats 
   */
  renderChart(canvasId, topicStats) {
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;

    // Xóa biểu đồ cũ nếu đã tồn tại
    if (window.mySkillsChart) {
      window.mySkillsChart.destroy();
    }

    const labels = Object.keys(topicStats);
    const accuracyData = labels.map(topic => {
      const stat = topicStats[topic];
      return Math.round((stat.correct / stat.total) * 100);
    });

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
};
