/* ==========================================================================
   Adaptive Quiz System - Super Hydro Bucket Mascot Engine (js/features/student/mascot.js)
   ========================================================================== */

function closeWaterBucketCelebration(modal) {
  modal.hidden = true;
  modal.classList.add('hidden');
  modal.setAttribute('aria-hidden', 'true');
  modal.classList.remove('is-celebrating');
  document.getElementById('student-mascot-floating')
    ?.classList.remove('water-celebration-mascot-hidden');
  if (modal.celebrationOpener?.isConnected) modal.celebrationOpener.focus();
  modal.celebrationOpener = null;
}

function createCelebrationBucketClone() {
  const mascotBucket = document.querySelector('#student-mascot-container .mascot-bucket-art');
  if (!mascotBucket) {
    console.error('Không tìm thấy xô mascot để hiển thị hiệu ứng chúc mừng.');
    return null;
  }

  const bucketClone = mascotBucket.cloneNode(true);
  bucketClone.classList.add('water-celebration-mascot-bucket');
  bucketClone.setAttribute('aria-hidden', 'true');
  const handlePath = bucketClone.querySelector('.bucket-handle-svg path');
  handlePath?.setAttribute('stroke', '#cbd5e1');
  bucketClone.querySelectorAll('defs').forEach(definition => definition.remove());
  bucketClone.querySelectorAll('[id]').forEach(element => element.removeAttribute('id'));
  return bucketClone;
}

const mascotEventLines = {
  loginScreen: {
    priority: 5,
    emotion: 'curious',
    lines: {
      day: ['Ai đấy? Vào đây định học thật hay chỉ ngắm giao diện?', 'Ủa, khách mới à? Chọn tài khoản rồi mình tính tiếp nhé.'],
      night: ['Ai đấy? Học bài giờ này, cú đêm cũng phải nể.', 'Khuya rồi vẫn đăng nhập à? Chăm thế, tôi hơi nghi ngờ đấy.']
    }
  },
  loginSuccess: {
    priority: 4,
    emotion: 'excited',
    lines: ['Chào {name}! Cuối cùng cũng chịu vào học rồi à?', 'Chào mừng, {name}! Hôm nay định làm tôi bất ngờ chứ?']
  },
  loginReturn: {
    priority: 4,
    emotion: 'happy',
    lines: ['Chào mừng trở lại, {name}. Tưởng bạn quên tôi rồi chứ!', '{name} quay lại rồi! Cây cối với tôi đợi cũng hơi lâu đó.']
  },
  loginFailure: {
    priority: 4,
    emotion: 'surprised',
    lines: ['Sai tài khoản hoặc mật khẩu rồi. Thử lại nhé, tôi không đoán hộ được đâu.', 'Chưa vào được rồi. Kiểm tra lại thông tin đăng nhập nha.']
  },
  usernameFocus: {
    priority: 5,
    emotion: 'curious',
    cooldown: 5000,
    lines: ['Tên tài khoản của bạn là gì nhỉ?', 'Gõ tên tài khoản đi, tôi đang tò mò đây.']
  },
  passwordFocus: {
    priority: 5,
    emotion: 'thinking',
    cooldown: 5000,
    lines: ['Mật khẩu bí mật nhé, tôi không nhìn đâu… chắc vậy.', 'Nhập mật khẩu đi, lần này nhớ đúng nha.']
  },
  quizStart: {
    priority: 4,
    emotion: 'excited',
    lines: ['Bắt đầu "{quizTitle}" nhé, {name}. Bình tĩnh mà thể hiện!', 'Vào bài rồi, {name}. Đừng để mấy câu hỏi dọa nhé.']
  },
  answerCorrect: {
    priority: 2,
    emotion: 'proud',
    cooldown: 1800,
    lines: ['Đúng rồi! {name} cũng có lúc làm tôi bất ngờ đấy.', 'Chuẩn xác! Giữ phong độ này nhé.']
  },
  answerWrong: {
    priority: 2,
    emotion: 'sad',
    cooldown: 1800,
    lines: ['Chưa đúng rồi, {name}. Đọc lời giải rồi phục thù nhé.', 'Ối, câu này chưa qua cửa. Bình tĩnh xem lại nào.']
  },
  wrongStreakTwo: {
    priority: 2,
    emotion: 'confused',
    cooldown: 3000,
    lines: ['Hai câu sai liền rồi, {name}. Đổi chiến thuật chút nhé?', 'Sai liên tiếp hai câu—khoan bấm nhanh, đọc kỹ đề nào.']
  },
  wrongStreakThree: {
    priority: 2,
    emotion: 'sad',
    cooldown: 3000,
    lines: ['Ba câu sai liền! {name}, mình chậm lại và xem từng bước nhé.', 'Chuỗi sai lên ba rồi; nghỉ một nhịp, lời giải ở ngay đây.']
  },
  correctStreak: {
    priority: 2,
    emotion: 'correct',
    cooldown: 3000,
    lines: ['Ba câu đúng liên tiếp! {name} đang vào guồng rồi đó.', 'Chuỗi ba câu chuẩn—được rồi, tôi công nhận bạn giỏi.']
  },
  quizComplete: {
    priority: 1,
    emotion: 'happy',
    lines: ['{name}, hoàn thành bài với {score}/10. {resultMessage}', '{name} đã xong bài: {score}/10. {resultMessage}']
  },
  quizAbandoned: {
    priority: 1,
    emotion: 'sad',
    lines: ['Bỏ dở rồi à, {name}? Khi nào sẵn sàng thì quay lại nhé.', 'Ơ, bài còn dang dở mà {name}. Nghỉ chút rồi làm tiếp cũng được.']
  },
  waterReminder: {
    priority: 3,
    emotion: 'excited',
    cooldown: 30 * 60 * 1000,
    lines: ['{name} ơi, đang có {bucketCount} xô nước đầy. Tưới cây đi, đừng tích trữ nữa!', 'Có {bucketCount} xô rồi đó, {name}. Cây đang chờ được tưới kìa.']
  },
  waterAvailable: {
    priority: 5,
    emotion: 'happy',
    cooldown: 3000,
    lines: ['Còn {bucketCount} xô nước để cây lớn thêm đó, {name}!', '{name} vẫn còn {bucketCount} xô nước. Tưới thêm cho cây nhé!']
  },
  noWater: {
    priority: 5,
    emotion: 'confused',
    cooldown: 3000,
    lines: ['Chưa có xô nước đâu, {name}. Làm bài để tích nước nhé!', 'Túi nước đang trống trơn. Học thêm để kiếm nước nào.']
  },
  waterProgress: {
    priority: 5,
    emotion: 'happy',
    cooldown: 3000,
    lines: ['Bạn đã tích {waterProgress}/5 vạch nước rồi, {name}!', 'Còn chút nữa là đầy xô, {name}. Cố lên nhé!']
  },
  treeWatered: {
    priority: 1,
    emotion: 'correct',
    lines: ['Tưới cây thành công! +{exp} EXP. Cây lớn thêm rồi, {name}!', 'Cây vừa được tưới, {name}. Nó đang phát triển tốt hơn chủ nhân một chút!']
  },
  treeGrew: {
    priority: 1,
    emotion: 'excited',
    lines: ['Cây tiến hóa thành {stageName}, {name}! Lần này cây mới là ngôi sao.', 'Thành tựu mở khóa: cây lên cấp {stage}. Tưới đúng lúc có khác!']
  },
  waterFailure: {
    priority: 3,
    emotion: 'sad',
    cooldown: 3000,
    lines: ['Chưa có xô nước đầy để tưới đâu, {name}. Làm bài kiếm nước nhé.', 'Tưới bằng niềm tin thì cây không lớn được đâu. Hãy kiếm xô nước trước!']
  },
  mascotClick: {
    priority: 5,
    emotion: 'happy',
    cooldown: 3000,
    lines: ['Gọi tôi có việc gì, {name}? Cây đang chờ nước kìa.', 'Tôi đây! Bạn cần động lực hay cần nhắc tưới cây?']
  },
  mascotTeased: {
    priority: 5,
    emotion: 'confused',
    cooldown: 6000,
    lines: [
      'Đừng chọc vào tôiiii, lo mà làm bài đi!',
      'Đồ đáng ghét, toàn chọc xô nước thôi!',
      'Công an sắp còng vì tội quấy rối xô nước!'
    ]
  }
};

window.MascotEngine = {
  eventState: {
    activePriority: Infinity,
    activeUntil: 0,
    cooldowns: {},
    lastLineByEvent: {},
    correctStreak: 0,
    wrongStreak: 0,
    mascotClickCount: 0,
    mascotClickWindowStartedAt: 0
  },

  getUserName(user = window.Auth?.getCurrentUser?.()) {
    if (!user || user.role === 'admin' && window.AppState?.viewingStudentId) return 'bạn';
    const nickname = String(user.nickname || '').trim();
    const fullName = String(user.fullName || '').trim();
    const username = String(user.username || '').trim();
    return nickname || fullName || username || 'bạn';
  },

  selectLine(eventName, lines) {
    const previous = this.eventState.lastLineByEvent[eventName];
    const choices = lines.length > 1 && previous
      ? lines.filter(line => line !== previous)
      : lines;
    const line = choices[Math.floor(Math.random() * choices.length)];
    this.eventState.lastLineByEvent[eventName] = line;
    return line;
  },

  emit(eventName, context = {}) {
    const event = mascotEventLines[eventName];
    if (!event) {
      console.error(`Sự kiện mascot không được hỗ trợ: ${eventName}`);
      return false;
    }

    const now = Date.now();
    const cooldownUntil = this.eventState.cooldowns[eventName] || 0;
    if (now < cooldownUntil || now < this.eventState.activeUntil && event.priority > this.eventState.activePriority) {
      return false;
    }

    if (eventName === 'waterReminder') {
      const user = context.user || window.Auth?.getCurrentUser?.();
      const userKey = encodeURIComponent(user?.userId || user?.username || 'anonymous');
      const reminderKey = `adaptive_quiz_mascot_water_reminder_${userKey}`;
      try {
        const lastReminder = Number(localStorage.getItem(reminderKey)) || 0;
        if (now < lastReminder + event.cooldown) return false;
        localStorage.setItem(reminderKey, String(now));
      } catch (error) {
        console.error('Không thể lưu thời điểm nhắc tưới cây gần nhất:', error);
      }
    }

    let lines = event.lines;
    if (eventName === 'loginScreen') {
      lines = event.lines[new Date().getHours() >= 22 || new Date().getHours() < 6 ? 'night' : 'day'];
    } else if (eventName === 'quizStart' && (new Date().getHours() >= 22 || new Date().getHours() < 6)) {
      lines = ['Khuya rồi mà vẫn học "{quizTitle}" à, {name}? Cú đêm chăm chỉ ghê.', '{name} học "{quizTitle}" lúc này luôn sao? Nhớ nghỉ ngơi nữa nhé.'];
    } else if (eventName === 'quizComplete') {
      const score = Number(context.score) || 0;
      let resultMessage = score >= 8
        ? 'Kết quả cao đấy—đừng vội tự mãn!'
        : score < 5
          ? 'Điểm chưa cao, cùng xem lại câu sai nhé.'
          : 'Khá ổn, luyện thêm để tiến bộ nhé.';
      if (context.improved) resultMessage += ` Tốt hơn lần trước ${context.previousScore}/10 rồi!`;
      if (context.bucketEarned) resultMessage += ` Đầy xô nước thứ ${context.fullBucketCount} rồi!`;
      else if (score === 10) resultMessage += ` +1 vạch nước (${context.waterProgress}/5).`;
      if (context.bucketEarned && context.previousFullBucketCount < 5 && context.fullBucketCount >= 5) {
        resultMessage += ' Đủ 5 xô rồi—đi tưới cây nào!';
      }
      context = { ...context, resultMessage };
    }

    const name = this.getUserName(context.user || undefined);
    const replacements = {
      name,
      quizTitle: String(context.quizTitle || 'bài kiểm tra'),
      score: String(Number(context.score ?? 0).toFixed(1).replace(/\.0$/, '')),
      resultMessage: String(context.resultMessage || 'Cố gắng thêm nhé.'),
      previousScore: String(context.previousScore ?? ''),
      bucketCount: String(context.bucketCount ?? 0),
      waterProgress: String(context.waterProgress ?? 0),
      exp: String(context.exp ?? 50),
      stageName: String(context.stageName || 'cấp mới'),
      stage: String(context.stage ?? 'mới')
    };
    const message = this.selectLine(eventName, lines)
      .replace(/\{(\w+)\}/g, (placeholder, key) => replacements[key] ?? placeholder);

    this.eventState.activePriority = event.priority;
    this.eventState.activeUntil = now + 4500;
    if (event.cooldown) this.eventState.cooldowns[eventName] = now + event.cooldown;
    this.speak(message, event.emotion);
    return true;
  },

  onLogin(user) {
    this.eventState = {
      activePriority: Infinity,
      activeUntil: 0,
      cooldowns: {},
      lastLineByEvent: {},
      correctStreak: 0,
      wrongStreak: 0
    };
    const key = `adaptive_quiz_mascot_last_login_${encodeURIComponent(user.userId || user.username || '')}`;
    let lastLogin = null;
    try {
      lastLogin = Number(localStorage.getItem(key));
      localStorage.setItem(key, String(Date.now()));
    } catch (error) {
      console.error('Không thể lưu thời điểm đăng nhập gần nhất cho mascot:', error);
    }
    const daysAway = lastLogin ? Math.floor((Date.now() - lastLogin) / (24 * 60 * 60 * 1000)) : 0;
    this.emit(daysAway >= 7 ? 'loginReturn' : 'loginSuccess', { user, daysAway });
  },

  onSessionResume(user) {
    const key = `adaptive_quiz_mascot_last_login_${encodeURIComponent(user.userId || user.username || '')}`;
    let lastLogin = 0;
    try {
      lastLogin = Number(localStorage.getItem(key)) || 0;
      localStorage.setItem(key, String(Date.now()));
    } catch (error) {
      console.error('Không thể kiểm tra thời điểm đăng nhập gần nhất cho mascot:', error);
      return;
    }
    const daysAway = lastLogin ? Math.floor((Date.now() - lastLogin) / (24 * 60 * 60 * 1000)) : 0;
    if (daysAway >= 7) this.emit('loginReturn', { user, daysAway });
  },

  recordAnswer(isCorrect) {
    if (isCorrect) {
      this.eventState.correctStreak += 1;
      this.eventState.wrongStreak = 0;
      if (this.eventState.correctStreak >= 3 && this.eventState.correctStreak % 3 === 0) {
        this.emit('correctStreak', { streak: this.eventState.correctStreak });
      } else {
        this.emit('answerCorrect');
      }
      return;
    }

    this.eventState.wrongStreak += 1;
    this.eventState.correctStreak = 0;
    if (this.eventState.wrongStreak === 3) this.emit('wrongStreakThree');
    else if (this.eventState.wrongStreak === 2) this.emit('wrongStreakTwo');
    else this.emit('answerWrong');
  },

  resetAnswerStreak() {
    this.eventState.correctStreak = 0;
    this.eventState.wrongStreak = 0;
  },

  speakWaterStatus() {
    const data = this.getData();
    if (data.fullBucketCount > 0) {
      const gamification = window.GamificationEngine?.getData?.();
      const hasWatered = Number(data.bucketsWatered) > 0 ||
        Number(gamification?.currentExp) > 0 ||
        Number(gamification?.treeStage) > 1;
      return this.emit(hasWatered ? 'waterAvailable' : 'waterReminder', {
        bucketCount: data.fullBucketCount
      });
    }
    if (data.waterProgress > 0) {
      return this.emit('waterProgress', { waterProgress: data.waterProgress });
    }
    return this.emit('noWater');
  },

  handleMascotClick() {
    const now = Date.now();
    if (now - this.eventState.mascotClickWindowStartedAt > 3000) {
      this.eventState.mascotClickCount = 0;
      this.eventState.mascotClickWindowStartedAt = now;
    }
    this.eventState.mascotClickCount += 1;

    if (this.eventState.mascotClickCount >= 4) {
      this.eventState.mascotClickCount = 0;
      this.eventState.mascotClickWindowStartedAt = 0;
      this.emit('mascotTeased');
      return;
    }
    this.speakWaterStatus();
  },

  resetSession() {
    this.eventState.activePriority = Infinity;
    this.eventState.activeUntil = 0;
    this.eventState.cooldowns = {};
    this.eventState.correctStreak = 0;
    this.eventState.wrongStreak = 0;
    this.eventState.mascotClickCount = 0;
    this.eventState.mascotClickWindowStartedAt = 0;
  },

  celebrateFullBucket(count) {
    const modal = document.getElementById('water-bucket-celebration');
    if (!modal) {
      console.error('Không tìm thấy màn hình chúc mừng xô nước đầy.');
      return;
    }

    const countLabel = document.getElementById('water-celebration-count');
    if (countLabel) countLabel.textContent = `Bạn đang có ${count} xô nước để tưới cây!`;
    const bucketHolder = document.getElementById('water-celebration-bucket-holder');
    if (bucketHolder) {
      bucketHolder.replaceChildren();
      const bucketClone = createCelebrationBucketClone();
      if (bucketClone) bucketHolder.appendChild(bucketClone);
    }

    if (modal.dataset.closeEventsBound !== 'true') {
      modal.addEventListener('click', event => {
        if (event.target === modal || event.target.closest('[data-close-water-celebration]')) {
          closeWaterBucketCelebration(modal);
        }
      });
      document.addEventListener('keydown', event => {
        if (event.key === 'Escape' && !modal.hidden) {
          closeWaterBucketCelebration(modal);
        }
      });
      modal.dataset.closeEventsBound = 'true';
    }

    modal.celebrationOpener = document.activeElement;
    document.getElementById('student-mascot-floating')
      ?.classList.add('water-celebration-mascot-hidden');
    modal.hidden = false;
    modal.setAttribute('aria-hidden', 'false');
    modal.classList.remove('hidden');
    modal.classList.remove('is-celebrating');
    void modal.offsetWidth;
    modal.classList.add('is-celebrating');
    document.getElementById('btn-close-water-celebration')?.focus();
    if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches && typeof confetti === 'function') {
      confetti({ particleCount: 180, spread: 110, startVelocity: 42, origin: { y: 0.6 } });
    }
  },

  getData() {
    const defaultData = {
      waterProgress: 0,   // 0 đến 5 vạch
      fullBucketCount: 0, // Số xô đầy
      treeStage: 1,       // Cấp độ cây
      bucketsWatered: 0   // Số xô đã tưới
    };
    if (window.StudentDataStorage) {
      return window.StudentDataStorage.read('mascot', 'student_mascot_data', defaultData);
    }
    try {
      return JSON.parse(localStorage.getItem('student_mascot_data')) || defaultData;
    } catch (e) {
      return defaultData;
    }
  },

  saveData(data) {
    if (window.StudentDataStorage) {
      window.StudentDataStorage.write('mascot', data);
      this.renderMascotUI();
      return;
    }
    localStorage.setItem('student_mascot_data', JSON.stringify(data));
    this.renderMascotUI();
  },

  // Hiển thị Lời thoại & Biểu cảm siêu sinh động
  speak(message, emotion = 'happy') {
    const bubble = document.getElementById('mascot-bubble');
    const eyesEl = document.getElementById('mascot-svg-eyes');
    const mouthEl = document.getElementById('mascot-svg-mouth');
    const container = document.getElementById('student-mascot-container');
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (bubble) {
      bubble.textContent = message;
      bubble.classList.add('active');
      clearTimeout(window.mascotBubbleTimer);
      window.mascotBubbleTimer = setTimeout(() => {
        bubble.classList.remove('active');
        if (container) {
          container.classList.remove(
            'anim-gentle', 'mascot-emotion-happy', 'mascot-emotion-correct',
            'mascot-emotion-excited', 'mascot-emotion-proud', 'mascot-emotion-wrong',
            'mascot-emotion-sad', 'mascot-emotion-surprised', 'mascot-emotion-curious',
            'mascot-emotion-thinking', 'mascot-emotion-confused', 'mascot-emotion-sleepy'
          );
          container.classList.add('mascot-idle');
        }
        if (eyesEl) {
          eyesEl.innerHTML = `
            <circle cx="34" cy="32" r="6" fill="#0f172a"/>
            <circle cx="60" cy="32" r="6" fill="#0f172a"/>
            <circle cx="36.5" cy="29.5" r="2.2" fill="#fff"/>
            <circle cx="62.5" cy="29.5" r="2.2" fill="#fff"/>
          `;
        }
        if (mouthEl) {
          mouthEl.setAttribute('d', 'M 40 48 Q 47 57 54 48');
          mouthEl.setAttribute('fill', 'none');
        }
      }, 4500);
    }

    const expressions = {
      correct: {
        eyes: '<path d="M30 30 L32 24 L34 30 L40 32 L34 34 L32 40 L30 34 L24 32 Z" fill="#fbbf24" stroke="#d97706" stroke-width="1.5"/><path d="M60 30 L62 24 L64 30 L70 32 L64 34 L62 40 L60 34 L54 32 Z" fill="#fbbf24" stroke="#d97706" stroke-width="1.5"/>',
        mouth: 'M 38 46 Q 47 66 56 46 Z',
        fill: '#ef4444'
      },
      excited: {
        eyes: '<path d="M34 21 L37 29 L45 32 L37 35 L34 43 L31 35 L23 32 L31 29 Z" fill="#fbbf24"/><path d="M62 21 L65 29 L73 32 L65 35 L62 43 L59 35 L51 32 L59 29 Z" fill="#fbbf24"/>',
        mouth: 'M 38 44 Q 47 68 56 44 Z',
        fill: '#ef4444'
      },
      proud: {
        eyes: '<path d="M26 31 Q34 22 42 31" fill="none" stroke="#0f172a" stroke-width="4" stroke-linecap="round"/><path d="M52 31 Q60 22 68 31" fill="none" stroke="#0f172a" stroke-width="4" stroke-linecap="round"/>',
        mouth: 'M 39 49 Q 47 61 55 49',
        fill: 'none'
      },
      wrong: {
        eyes: '<path d="M27 25 L39 37 M39 25 L27 37 M55 25 L67 37 M67 25 L55 37" stroke="#0f172a" stroke-width="4" stroke-linecap="round"/>',
        mouth: 'M 39 57 Q 47 48 55 57',
        fill: 'none'
      },
      sad: {
        eyes: '<path d="M26 33 Q34 24 42 33" fill="none" stroke="#0f172a" stroke-width="4" stroke-linecap="round"/><path d="M52 33 Q60 24 68 33" fill="none" stroke="#0f172a" stroke-width="4" stroke-linecap="round"/><path d="M34 38 Q32 44 35 46" fill="#60a5fa"/>',
        mouth: 'M 39 57 Q 47 49 55 57',
        fill: 'none'
      },
      surprised: {
        eyes: '<ellipse cx="34" cy="31" rx="7" ry="10" fill="#0f172a"/><ellipse cx="60" cy="31" rx="7" ry="10" fill="#0f172a"/><circle cx="36" cy="28" r="2.5" fill="#fff"/><circle cx="62" cy="28" r="2.5" fill="#fff"/>',
        mouth: 'M 43 48 A 4 5 0 1 0 51 48 A 4 5 0 1 0 43 48',
        fill: '#ef4444'
      },
      curious: {
        eyes: '<circle cx="34" cy="32" r="7" fill="#0f172a"/><circle cx="61" cy="31" r="5" fill="#0f172a"/><circle cx="36.5" cy="29" r="2.5" fill="#fff"/><path d="M54 22 Q61 18 68 22" fill="none" stroke="#0f172a" stroke-width="2.5" stroke-linecap="round"/>',
        mouth: 'M 42 51 Q 47 46 53 50',
        fill: 'none'
      },
      thinking: {
        eyes: '<ellipse cx="34" cy="29" rx="6" ry="7" fill="#0f172a"/><ellipse cx="60" cy="29" rx="6" ry="7" fill="#0f172a"/><circle cx="36" cy="26" r="2" fill="#fff"/><circle cx="62" cy="26" r="2" fill="#fff"/>',
        mouth: 'M 41 52 Q 47 48 53 52',
        fill: 'none'
      },
      confused: {
        eyes: '<circle cx="34" cy="32" r="6" fill="#0f172a"/><path d="M54 31 Q60 26 67 31" fill="none" stroke="#0f172a" stroke-width="4" stroke-linecap="round"/><circle cx="36" cy="29" r="2" fill="#fff"/>',
        mouth: 'M 40 52 Q 46 57 54 50',
        fill: 'none'
      },
      sleepy: {
        eyes: '<path d="M26 32 Q34 39 42 32 M52 32 Q60 39 68 32" fill="none" stroke="#0f172a" stroke-width="4" stroke-linecap="round"/>',
        mouth: 'M 42 51 Q 47 55 52 51',
        fill: 'none'
      },
      happy: {
        eyes: '<circle cx="34" cy="32" r="6" fill="#0f172a"/><circle cx="60" cy="32" r="6" fill="#0f172a"/><circle cx="36.5" cy="29.5" r="2.2" fill="#fff"/><circle cx="62.5" cy="29.5" r="2.2" fill="#fff"/>',
        mouth: 'M 39 47 Q 47 61 55 47',
        fill: 'none'
      }
    };

    if (eyesEl && mouthEl) {
      const expression = expressions[emotion] || expressions.happy;
      eyesEl.innerHTML = expression.eyes;
      mouthEl.setAttribute('d', expression.mouth);
      mouthEl.setAttribute('fill', expression.fill);
    }

    if (container) {
      const emotionClasses = [
        'anim-gentle', 'mascot-emotion-happy', 'mascot-emotion-correct',
        'mascot-emotion-excited', 'mascot-emotion-proud', 'mascot-emotion-wrong',
        'mascot-emotion-sad', 'mascot-emotion-surprised', 'mascot-emotion-curious',
        'mascot-emotion-thinking', 'mascot-emotion-confused', 'mascot-emotion-sleepy'
      ];
      container.classList.remove(...emotionClasses);
      container.classList.remove('mascot-idle');
      container.classList.add(`mascot-emotion-${expressions[emotion] ? emotion : 'happy'}`);
      if (!prefersReducedMotion) {
        void container.offsetWidth;
        container.classList.add('anim-gentle');
        clearTimeout(window.mascotReactionTimer);
        window.mascotReactionTimer = setTimeout(() => {
          container.classList.remove('anim-gentle');
        }, 700);
      }
    }
  },

  // Render Giao diện Xô Nước Siêu To 3D
  renderMascotUI() {
    let holder = document.getElementById('student-mascot-floating');
    if (!holder) {
      holder = document.createElement('div');
      holder.id = 'student-mascot-floating';
      document.body.appendChild(holder);
    }

    const data = this.getData();
    const waterHeight = Math.min(100, Math.max(0, (data.waterProgress / 5) * 75));

    holder.innerHTML = `
      <div id="student-mascot-container" class="mascot-wrapper mascot-idle ${data.fullBucketCount > 0 ? 'super-glow' : ''}">
        <!-- Bong bóng Lời thoại -->
        <div id="mascot-bubble" class="mascot-bubble">
          ${data.fullBucketCount > 0 
            ? `🔥 Sẵn sàng ${data.fullBucketCount} xô tưới cây!` 
            : `💧 Đã tích ${data.waterProgress}/5 vạch nước!`}
        </div>

        <div class="mascot-bucket-art">
          <!-- Hiệu ứng Nước văng tung tóe khi Đúng -->
          <!-- QUAI XÔ KIM LOẠI DÀY 3D -->
          <svg class="bucket-handle-svg" viewBox="0 0 130 65">
            <path d="M 18 52 A 47 47 0 0 1 112 52" fill="none" stroke="url(#handleGradient)" stroke-width="7.5" stroke-linecap="round"/>
            <defs>
              <linearGradient id="handleGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stop-color="#64748b"/>
                <stop offset="30%" stop-color="#cbd5e1"/>
                <stop offset="60%" stop-color="#f8fafc"/>
                <stop offset="100%" stop-color="#475569"/>
              </linearGradient>
            </defs>
          </svg>

          <!-- THÂN XÔ NÓN CỤT SIÊU TO (115px x 98px) -->
          <div class="bucket-body-trapezoid">
            <!-- Mực nước & Sóng nước cuộn -->
            <div class="water-container">
              <div class="wave wave1"></div>
              <div class="wave wave2"></div>
              <div class="bubble-particle b1"></div>
              <div class="bubble-particle b2"></div>
              <div class="bubble-particle b3"></div>
            </div>

            <!-- Khuôn mặt SVG siêu nét -->
            <svg class="bucket-face-svg" viewBox="0 0 94 75">
              <g id="mascot-svg-eyes">
                <circle cx="34" cy="32" r="6" fill="#0f172a"/>
                <circle cx="60" cy="32" r="6" fill="#0f172a"/>
                <circle cx="36.5" cy="29.5" r="2.2" fill="#fff"/>
                <circle cx="62.5" cy="29.5" r="2.2" fill="#fff"/>
              </g>
              <!-- Má hồng rạng rỡ -->
              <ellipse cx="23" cy="40" rx="5.5" ry="3" fill="#ff7ace" opacity="0.65"/>
              <ellipse cx="71" cy="40" rx="5.5" ry="3" fill="#ff7ace" opacity="0.65"/>
              <!-- Miệng -->
              <path id="mascot-svg-mouth" d="M 40 48 Q 47 57 54 48" stroke="#0f172a" stroke-width="3.5" stroke-linecap="round" fill="none"/>
            </svg>

            <!-- Vành kim loại định hình xô -->
            <div class="bucket-rim rim-top"></div>
            <div class="bucket-rim rim-bottom"></div>
          </div>

          <!-- BÓNG ĐỔ CHÂN (FLOOR SHADOW 3D) -->
          <div class="mascot-floor-shadow"></div>
        </div>
      </div>
    `;

    holder.querySelector('.water-container')?.style.setProperty('--water-height', `${waterHeight}%`);

    document.getElementById('student-mascot-container')?.addEventListener('click', () => {
      this.handleMascotClick();
    });
  }
};