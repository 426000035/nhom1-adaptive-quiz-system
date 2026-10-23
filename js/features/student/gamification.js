/* ==========================================================================
   Adaptive Quiz System - Gamification & Tree Engine (js/features/student/gamification.js)
   ========================================================================== */

window.GamificationEngine = {
  // Cấu hình Cấp độ cây
  STAGES: {
    1: { name: 'Hạt Mầm', icon: '🌱', maxExp: 100, desc: 'Cây vừa mới nhú mầm, hãy tưới nước đều đặn nhé!' },
    2: { name: 'Cây Con', icon: '🌿', maxExp: 250, desc: 'Cây đã vươn chồi xanh lá, cố gắng thêm chút nữa!' },
    3: { name: 'Cây Trưởng Thành', icon: '🌳', maxExp: 500, desc: 'Cây phát triển tươi tốt, tán lá xòe rộng!' },
    4: { name: 'Cây Cổ Thụ', icon: '🎄', maxExp: 1000, desc: 'Cây đại thụ tỏa sáng vĩnh cửu! Bạn là học viên xuất sắc!' }
  },

  // Lấy dữ liệu Gamification từ LocalStorage
  getData() {
    const defaultData = {
      treeStage: 1,
      currentExp: 0,
      streakCount: 1,
      lastActiveDate: new Date().toLocaleDateString('vi-VN')
    };
    if (window.StudentDataStorage) {
      return window.StudentDataStorage.read('gamification', 'student_gamification_data', defaultData);
    }
    try {
      return JSON.parse(localStorage.getItem('student_gamification_data')) || defaultData;
    } catch (e) {
      return defaultData;
    }
  },

  // Lưu dữ liệu
  saveData(data) {
    if (window.StudentDataStorage) {
      window.StudentDataStorage.write('gamification', data);
      return;
    }
    localStorage.setItem('student_gamification_data', JSON.stringify(data));
  },

  // Cập nhật Chuỗi Streak hằng ngày
  checkAndUpdateStreak() {
    const data = this.getData();
    const today = new Date().toLocaleDateString('vi-VN');
    
    if (data.lastActiveDate !== today) {
      const yesterday = new Date(Date.now() - 86400000).toLocaleDateString('vi-VN');
      if (data.lastActiveDate === yesterday) {
        data.streakCount += 1;
      } else {
        data.streakCount = 1; // Reset nếu ngắt chuỗi
      }
      data.lastActiveDate = today;
      this.saveData(data);
    }
    return data.streakCount;
  },

  // Hành động "Tưới Cây 💧"
  waterTree() {
    if (!window.MascotEngine) return { success: false, message: 'Thiếu MascotEngine!' };

    const mascotData = window.MascotEngine.getData();

    // Kiểm tra xem có xô nước đầy nào không
    if (mascotData.fullBucketCount <= 0) {
      if (window.MascotEngine.speak) {
        window.MascotEngine.speak("Bạn chưa có xô nước đầy nào! Hãy đạt điểm 10 ở bài thi để tích xô nước nhé!", 'wrong');
      }
      return { success: false, message: 'Không đủ xô nước!' };
    }

    // Trừ 1 xô nước
    mascotData.fullBucketCount -= 1;
    mascotData.bucketsWatered = (mascotData.bucketsWatered || 0) + 1;
    window.MascotEngine.saveData(mascotData);

    // Cộng EXP cho cây (+50 EXP mỗi xô nước)
    const gData = this.getData();
    const expGained = 50;
    gData.currentExp += expGained;

    let currentStage = this.STAGES[gData.treeStage] || this.STAGES[1];
    let levelUp = false;

    // Kiểm tra nâng cấp cây
    if (gData.currentExp >= currentStage.maxExp && gData.treeStage < 4) {
      gData.currentExp -= currentStage.maxExp;
      gData.treeStage += 1;
      levelUp = true;
    }

    this.saveData(gData);

    // Phản ứng của Mascot
    if (window.MascotEngine.speak) {
      if (levelUp) {
        const newStage = this.STAGES[gData.treeStage];
        window.MascotEngine.speak(`🎉 XUẤT SẮC! Cây đã tiến hóa thành ${newStage.icon} ${newStage.name}!`, 'excited');
      } else {
        window.MascotEngine.speak(`💧 Đã tưới cây! +${expGained} EXP! Cây lớn thêm một chút rồi!`, 'correct');
      }
    }

    return { success: true, levelUp, data: gData };
  }
};