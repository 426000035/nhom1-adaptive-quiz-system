/* ==========================================================================
   Adaptive Quiz System - Super Hydro Bucket Mascot Engine (js/features/student/mascot.js)
   ========================================================================== */

function closeWaterBucketCelebration(modal) {
  modal.hidden = true;
  modal.classList.add('hidden');
  modal.setAttribute('aria-hidden', 'true');
  modal.classList.remove('is-celebrating');
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

window.MascotEngine = {
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
      window.mascotBubbleTimer = setTimeout(() => bubble.classList.remove('active'), 4500);
    }

    // Biến đổi biểu cảm mắt & miệng linh hoạt
    if (eyesEl && mouthEl) {
      if (emotion === 'correct' || emotion === 'excited') {
        // Mắt Ngôi sao tỏa sáng ✨
        eyesEl.innerHTML = `
          <path d="M30 30 L32 24 L34 30 L40 32 L34 34 L32 40 L30 34 L24 32 Z" fill="#f59e0b" stroke="#d97706" stroke-width="1.5"/>
          <path d="M60 30 L62 24 L64 30 L70 32 L64 34 L62 40 L60 34 L54 32 Z" fill="#f59e0b" stroke="#d97706" stroke-width="1.5"/>
        `;
        mouthEl.setAttribute('d', 'M 40 48 Q 47 62 54 48 Z');
        mouthEl.setAttribute('fill', '#ef4444');
      } else if (emotion === 'wrong') {
        // Mắt X_X hoặc Q_Q thất vọng
        eyesEl.innerHTML = `
          <path d="M28 26 L38 36 M28 36 L38 26 M56 26 L66 36 M56 36 L66 26" stroke="#0f172a" stroke-width="4" stroke-linecap="round"/>
        `;
        mouthEl.setAttribute('d', 'M 40 54 Q 47 46 54 54');
        mouthEl.setAttribute('fill', 'none');
      } else { // Normal / Happy
        eyesEl.innerHTML = `
          <circle cx="34" cy="32" r="6" fill="#0f172a"/>
          <circle cx="60" cy="32" r="6" fill="#0f172a"/>
          <circle cx="36.5" cy="29.5" r="2.2" fill="#fff"/>
          <circle cx="62.5" cy="29.5" r="2.2" fill="#fff"/>
        `;
        mouthEl.setAttribute('d', 'M 40 48 Q 47 57 54 48');
        mouthEl.setAttribute('fill', 'none');
      }
    }

    // Keep reactions subtle in calm themes and respect the system motion preference.
    if (container) {
      container.classList.remove('anim-gentle');
      if (!prefersReducedMotion && (emotion === 'correct' || emotion === 'excited' || emotion === 'wrong')) {
        void container.offsetWidth;
      }
      if (!prefersReducedMotion) {
        if (emotion === 'correct' || emotion === 'excited' || emotion === 'wrong') {
          container.classList.add('anim-gentle');
        }
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
      <div id="student-mascot-container" class="mascot-wrapper ${data.fullBucketCount > 0 ? 'super-glow' : ''}">
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
      const currentData = this.getData();
      if (currentData.fullBucketCount > 0) {
        this.speak(`Tớ đang có ${currentData.fullBucketCount} xô nước đầy! Hãy tới Dashboard để tưới cây ngay nhé! 🌳`, 'excited');
      } else {
        this.speak(`Cố lên! Bạn đã tích được ${currentData.waterProgress}/5 vạch nước rồi! 🌊`, 'happy');
      }
    });
  }
};