/* ==========================================================================
   Adaptive Quiz System - Quiz Execution & Analytics Engine (js/core/quiz-engine.js)
   ========================================================================== */

window.QuizEngine = {
  timerId: null,
  WEAK_SKILL_THRESHOLD: 60,

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

  getQuestionCategory(question, catalogs) {
    const storedQuestion = catalogs.questionsById.get(question.id);
    const skill = catalogs.skillsById.get(question.skillId) ||
      catalogs.skillsById.get(question.skillIdSnapshot) ||
      catalogs.skillsById.get(storedQuestion?.skillId);
    const subjectId = question.subjectId || skill?.subjectId || storedQuestion?.subjectId ||
      `subject_${question.topic || 'unknown'}`;
    const subject = catalogs.subjectsById.get(subjectId);
    const subjectName = subject?.name || question.topic || storedQuestion?.topic || 'Chưa xác định môn học';
    const validSkill = skill?.subjectId === subjectId ? skill : null;
    const skillId = validSkill?.skillId || `unclassified_${subjectId}`;
    return {
      subjectId,
      subjectName,
      skillId,
      skillName: validSkill?.name || question.skillName || 'Chưa phân loại kỹ năng'
    };
  },

  getSkillCatalogs() {
    const database = window.LocalStorageDB.read();
    return {
      subjectsById: new Map(database.subjects.map(subject => [subject.subjectId, subject])),
      skillsById: new Map(database.skills.map(skill => [skill.skillId, skill])),
      questionsById: new Map(database.questions.map(question => [question.questionId, question]))
    };
  },

  buildSkillStats(questions = [], userAnswers = {}, catalogs = this.getSkillCatalogs()) {
    const subjects = new Map();
    (Array.isArray(questions) ? questions : []).forEach(question => {
      if (!question) return;
      const category = this.getQuestionCategory(question, catalogs);
      let subjectStats = subjects.get(category.subjectId);
      if (!subjectStats) {
        subjectStats = {
          subjectId: category.subjectId,
          subjectName: category.subjectName,
          total: 0,
          correct: 0,
          skills: new Map()
        };
        subjects.set(category.subjectId, subjectStats);
      }
      let skillStats = subjectStats.skills.get(category.skillId);
      if (!skillStats) {
        skillStats = {
          skillId: category.skillId,
          skillName: category.skillName,
          total: 0,
          correct: 0
        };
        subjectStats.skills.set(category.skillId, skillStats);
      }
      const selected = userAnswers[question.id] || [];
      const correct = Array.isArray(question.correctAnswer)
        ? question.correctAnswer
        : [question.correctAnswer ?? 0];
      const isCorrect = selected.length === correct.length && selected.every(index => correct.includes(index));
      subjectStats.total++;
      skillStats.total++;
      if (isCorrect) {
        subjectStats.correct++;
        skillStats.correct++;
      }
    });
    return Object.fromEntries(Array.from(subjects, ([subjectId, subject]) => [
      subjectId,
      {
        subjectId: subject.subjectId,
        subjectName: subject.subjectName,
        total: subject.total,
        correct: subject.correct,
        skills: Object.fromEntries(subject.skills)
      }
    ]));
  },

  aggregateSkillStats(historyItems = []) {
    const aggregate = {};
    const catalogs = this.getSkillCatalogs();
    (Array.isArray(historyItems) ? historyItems : []).forEach(historyItem => {
      if (!Array.isArray(historyItem.questions) || !historyItem.answers) return;
      const attemptStats = this.buildSkillStats(historyItem.questions, historyItem.answers, catalogs);
      Object.entries(attemptStats).forEach(([subjectId, subject]) => {
        if (!aggregate[subjectId]) {
          aggregate[subjectId] = {
            subjectId,
            subjectName: subject.subjectName,
            total: 0,
            correct: 0,
            skills: {}
          };
        }
        const subjectAggregate = aggregate[subjectId];
        subjectAggregate.total += subject.total;
        subjectAggregate.correct += subject.correct;
        Object.entries(subject.skills).forEach(([skillId, skill]) => {
          if (!subjectAggregate.skills[skillId]) {
            subjectAggregate.skills[skillId] = {
              skillId,
              skillName: skill.skillName,
              total: 0,
              correct: 0
            };
          }
          subjectAggregate.skills[skillId].total += skill.total;
          subjectAggregate.skills[skillId].correct += skill.correct;
        });
      });
    });
    return aggregate;
  },

  aggregateQuizScores(historyItems = [], quizzes = window.LocalStorageDB.read().quizzes || []) {
    const policiesByQuizId = new Map(quizzes.map(quiz => [
      quiz.quizId,
      ['highest', 'average', 'latest'].includes(quiz.scorePolicy) ? quiz.scorePolicy : 'highest'
    ]));
    const groupedAttempts = new Map();

    (Array.isArray(historyItems) ? historyItems : []).forEach((attempt, index) => {
      const score = Number(attempt.score);
      if (!Number.isFinite(score) || score < 0 || score > 10) return;
      const userId = attempt.ownerUsername || attempt.username || 'unknown';
      const quizId = attempt.quizId || `legacy:${attempt.quizTitle || 'Bài kiểm tra'}`;
      const key = JSON.stringify([userId, quizId]);
      if (!groupedAttempts.has(key)) {
        groupedAttempts.set(key, {
          userId,
          quizId: attempt.quizId || null,
          quizTitle: attempt.quizTitle || 'Bài kiểm tra',
          username: attempt.username || 'Học viên',
          scorePolicy: policiesByQuizId.get(attempt.quizId) || 'highest',
          attempts: []
        });
      }
      groupedAttempts.get(key).attempts.push({
        attemptId: attempt.attemptId,
        score,
        completedAt: Date.parse(attempt.completedAt || attempt.timestamp) || 0,
        index
      });
    });

    return Array.from(groupedAttempts.values(), group => {
      const scores = group.attempts.map(attempt => attempt.score);
      let aggregateScore;
      if (group.scorePolicy === 'average') {
        aggregateScore = Number((scores.reduce((sum, score) => sum + score, 0) / scores.length).toFixed(1));
      } else if (group.scorePolicy === 'latest') {
        const latestAttempt = group.attempts.reduce((latest, attempt) =>
          attempt.completedAt > latest.completedAt ||
          (attempt.completedAt === latest.completedAt && attempt.index < latest.index)
            ? attempt
            : latest
        );
        aggregateScore = latestAttempt.score;
      } else {
        aggregateScore = Math.max(...scores);
      }
      return {
        userId: group.userId,
        quizId: group.quizId,
        quizTitle: group.quizTitle,
        username: group.username,
        scorePolicy: group.scorePolicy,
        aggregateScore,
        attemptCount: group.attempts.length,
        attemptIds: group.attempts.map(attempt => attempt.attemptId).filter(Boolean)
      };
    });
  },

  /**
   * Chấm điểm bài làm & phân tích theo môn học và kỹ năng
   * @param {Array} questions - Danh sách câu hỏi
   * @param {Object} userAnswers - Object lưu câu trả lời { "q1": [0] }
   * @returns {Object} Kết quả chấm điểm
   */
  evaluateQuiz(questions = [], userAnswers = {}) {
    let correctCount = 0;
    const wrongQuestions = [];
    const reviewQuestions = [];
    const topicStats = {};

    const safeQuestions = Array.isArray(questions) ? questions : [];
    const totalQuestions = safeQuestions.length;
    const subjectStats = this.buildSkillStats(safeQuestions, userAnswers);

    safeQuestions.forEach(q => {
      if (!q) return;
      const userSel = Array.isArray(userAnswers[q.id]) ? userAnswers[q.id] : [];
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
      reviewQuestions.push({
        ...q,
        userSelection: userSel,
        isCorrect,
        questionNumber: reviewQuestions.length + 1
      });

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
      reviewQuestions,
      topicStats: topicStats,
      subjectStats
    };

    if (window.AppState) {
      window.AppState.quizResults = results;
    }
    return results;
  },

  /**
   * Vẽ tỷ lệ đúng/sai cho từng môn bằng các vòng doughnut đồng tâm.
   * @param {string} canvasId
   * @param {Object} subjectStats
   */
  renderChart(canvasId, subjectStats = {}) {
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;

    // Xóa biểu đồ cũ nếu đã tồn tại
    if (window.mySkillsChart) {
      window.mySkillsChart.destroy();
    }

    const subjects = Object.entries(subjectStats)
      .filter(([, stat]) => Number.isFinite(stat?.total) && stat.total > 0)
      .map(([label, stat]) => ({
        label: stat.subjectName || label,
        correct: Math.max(0, Math.min(stat.correct || 0, stat.total)),
        incorrect: Math.max(0, stat.total - (stat.correct || 0))
      }));
    if (subjects.length === 0) return;

    if (typeof Chart !== 'undefined') {
      const themeStyles = getComputedStyle(document.body);
      const themeColor = token => themeStyles.getPropertyValue(token).trim();
      const correctColor = themeColor('--success');
      const incorrectColor = themeColor('--danger');

      window.mySkillsChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
          labels: ['Đúng', 'Sai'],
          datasets: subjects.map(subject => ({
            label: subject.label,
            data: [subject.correct, subject.incorrect],
            backgroundColor: [correctColor, incorrectColor],
            borderColor: themeColor('--bg-card'),
            borderWidth: 0
          }))
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          cutout: '35%',
          plugins: {
            legend: {
              display: false,
              labels: { color: themeColor('--text-muted'), font: { family: 'Inter' } }
            },
            tooltip: {
              callbacks: {
                title: items => items.length ? items[0].dataset.label : '',
                label: context => {
                  const total = context.dataset.data.reduce((sum, count) => sum + count, 0);
                  const count = context.raw;
                  const percentage = total > 0 ? Math.round((count / total) * 100) : 0;
                  return `${context.label}: ${count}/${total} câu (${percentage}%)`;
                }
              }
            }
          }
        }
      });
    }
  }
};