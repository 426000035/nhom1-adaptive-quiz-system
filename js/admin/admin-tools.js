/* ==========================================================================
   Adaptive Quiz System - Admin Tools Module (js/admin/admin-tools.js)
   ========================================================================== */

function initAdminToolsModule() {
  bindAdminToolsEvents();
}

function bindAdminToolsEvents() {
  document.getElementById('btn-export-json')?.addEventListener('click', exportQuizzesToJSON);
  document.getElementById('input-import-json')?.addEventListener('change', importQuizzesFromJSON);
  document.getElementById('form-random-quiz')?.addEventListener('submit', generateRandomQuiz);
}

function populateRandomQuizForm() {
  const select = document.getElementById('random-topic-select');
  if (select) {
    select.innerHTML = '';
    window.AppState.settings.topics.forEach(t => select.innerHTML += `<option value="${t}">${t}</option>`);
  }
}

function exportQuizzesToJSON() {
  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(window.AppState.allQuizzes, null, 2));
  const downloadAnchor = document.createElement('a');
  downloadAnchor.setAttribute("href", dataStr);
  downloadAnchor.setAttribute("download", `adaptive_quizzes_backup_${Date.now()}.json`);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
}

function importQuizzesFromJSON(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const importedQuizzes = JSON.parse(e.target.result);
      if (Array.isArray(importedQuizzes)) {
        window.AppState.allQuizzes = importedQuizzes;
        saveQuizzesAndQuestionsToStorage();
        if (typeof renderAdminQuizzesTable === 'function') renderAdminQuizzesTable();
        Swal.fire({ icon: 'success', title: 'Nhập file JSON thành công!' });
      } else {
        Swal.fire({ icon: 'error', title: 'Cấu trúc file JSON không hợp lệ!' });
      }
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'File không đúng định dạng JSON!' });
    }
  };
  reader.readAsText(file);
}

function generateRandomQuiz(e) {
  e.preventDefault();
  const selectedTopic = document.getElementById('random-topic-select').value;
  const count = parseInt(document.getElementById('random-count-input').value);
  const timeLimit = parseInt(document.getElementById('random-time-input').value);

  let availableQuestions = [];
  window.AppState.allQuizzes.forEach(quiz => {
    if (quiz.topic === selectedTopic && quiz.questions) {
      availableQuestions = availableQuestions.concat(quiz.questions);
    }
  });

  if (availableQuestions.length === 0) {
    Swal.fire({ icon: 'warning', title: 'Chưa có câu hỏi nào thuộc chủ đề này!' });
    return;
  }

  const shuffled = availableQuestions.sort(() => 0.5 - Math.random());
  const selectedQuestions = shuffled.slice(0, Math.min(count, availableQuestions.length));

  window.AppState.allQuizzes.unshift({
    id: `quiz_random_${Date.now()}`,
    title: `Đề Thi Tổng Hợp Ngẫu Nhiên - ${selectedTopic}`,
    topic: selectedTopic,
    difficulty: "Medium",
    timeLimit,
    questions: selectedQuestions
  });

  saveQuizzesAndQuestionsToStorage();
  if (typeof renderAdminQuizzesTable === 'function') renderAdminQuizzesTable();

  Swal.fire({ 
    icon: 'success', 
    title: 'Đã tạo bài thi ngẫu nhiên mới!', 
    text: `Đã chọn ${selectedQuestions.length} câu hỏi thuộc chủ đề ${selectedTopic}.` 
  });
}