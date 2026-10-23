/* ==========================================================================
   Adaptive Quiz System - Admin Tools Module (js/features/admin/admin-tools.js)
   ========================================================================== */

function initAdminToolsModule() {
  bindAdminToolsEvents();
}

function bindAdminToolsEvents() {
  document.getElementById('btn-export-json')?.addEventListener('click', exportQuizzesToJSON);
  document.getElementById('input-import-json')?.addEventListener('change', importQuizzesFromJSON);
  document.getElementById('form-random-quiz')?.addEventListener('submit', generateRandomQuiz);
}

async function populateRandomQuizForm() {
  const subjectSelect = document.getElementById('random-subject-select');
  if (!subjectSelect) return;
  try {
    const catalogs = await window.AdminCatalogs.getActiveCatalogs();
    const { subjects } = catalogs;
    window.AdminCatalogCache = catalogs;
    subjectSelect.replaceChildren();
    subjects.forEach(subject => {
      const option = document.createElement('option');
      option.value = subject.subjectId;
      option.textContent = subject.name;
      subjectSelect.appendChild(option);
    });
    if (subjects.length === 0) {
      throw new Error('Chưa có môn học đang hoạt động. Hãy thêm môn học trước khi tạo đề.');
    }
    subjectSelect.onchange = renderRandomSkillAllocations;
    renderRandomSkillAllocations();
  } catch (error) {
    console.error('Không thể nạp biểu mẫu tạo đề theo kỹ năng:', error);
    Swal.fire({ icon: 'error', title: 'Không thể tải môn học', text: error.message });
  }
}

function renderRandomSkillAllocations() {
  const container = document.getElementById('random-skill-allocation-list');
  const subjectId = document.getElementById('random-subject-select')?.value;
  if (!container || !subjectId) return;
  const database = window.LocalStorageDB.read();
  const { skills } = window.AdminCatalogCache || {};
  const activeSkills = (skills || database.skills).filter(skill =>
    skill.status === 'active' && String(skill.subjectId) === String(subjectId)
  );
  const questionCounts = new Map();
  database.questions.forEach(question => {
    if (question.status === 'active' && String(question.subjectId) === String(subjectId)) {
      questionCounts.set(question.skillId, (questionCounts.get(question.skillId) || 0) + 1);
    }
  });
  container.replaceChildren();
  if (activeSkills.length === 0) {
    const emptyMessage = document.createElement('p');
    emptyMessage.textContent = 'Môn học này chưa có kỹ năng đang hoạt động.';
    container.appendChild(emptyMessage);
    return;
  }

  activeSkills.forEach(skill => {
    const row = document.createElement('label');
    row.className = 'admin-skill-allocation-row';
    const name = document.createElement('span');
    name.textContent = skill.name;
    const countInput = document.createElement('input');
    countInput.type = 'number';
    countInput.className = 'select-control random-skill-count';
    countInput.min = '0';
    countInput.max = String(questionCounts.get(skill.skillId) || 0);
    countInput.step = '1';
    countInput.value = '0';
    countInput.dataset.skillId = skill.skillId;
    countInput.setAttribute('aria-label', `Số câu ${skill.name}`);
    countInput.disabled = Number(countInput.max) === 0;
    const available = document.createElement('small');
    available.textContent = `${countInput.max} câu`;
    available.className = 'admin-muted-copy';
    row.append(name, countInput, available);
    container.appendChild(row);
  });
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
  const input = event.currentTarget || event.target;
  const file = input.files?.[0];
  if (!file) return;

  const status = document.getElementById('admin-import-status');
  const setStatus = (message, busy = false) => {
    if (status) status.textContent = message;
    input.disabled = busy;
    input.setAttribute('aria-busy', String(busy));
  };
  const reportFailure = (title, error) => {
    const message = error?.message || 'Không thể đọc file đã chọn.';
    setStatus(`${title}: ${message}`);
    if (typeof Swal !== 'undefined') Swal.fire({ icon: 'error', title, text: message });
    else console.error(`${title}:`, error);
  };
  const finish = () => {
    input.value = '';
    input.disabled = false;
    input.setAttribute('aria-busy', 'false');
  };

  const reader = new FileReader();
  setStatus('Đang đọc tệp JSON...', true);
  reader.onload = (e) => {
    let importedQuizzes;
    try {
      importedQuizzes = JSON.parse(e.target.result);
    } catch (error) {
      reportFailure('Không thể nhập file JSON', error);
      finish();
      return;
    }

    if (!Array.isArray(importedQuizzes)) {
      reportFailure('Cấu trúc file JSON không hợp lệ', new Error('Tệp cần chứa một mảng các đề thi.'));
      finish();
      return;
    }

    const previousQuizzes = window.AppState.allQuizzes;
    const previousQuestions = window.AppState.allQuestions;
    window.AppState.allQuizzes = importedQuizzes;
    try {
      if (typeof saveQuizzesAndQuestionsToStorage === 'function') {
        saveQuizzesAndQuestionsToStorage();
      } else {
        throw new Error('Không tìm thấy thao tác lưu dữ liệu đề thi.');
      }
    } catch (error) {
      window.AppState.allQuizzes = previousQuizzes;
      window.AppState.allQuestions = previousQuestions;
      reportFailure('Không thể lưu dữ liệu đã nhập', error);
      finish();
      return;
    }

    try {
      if (typeof renderAdminQuizzesTable === 'function') renderAdminQuizzesTable();
    } catch (error) {
      const message = `Đã lưu ${importedQuizzes.length} đề thi nhưng không thể cập nhật bảng: ${error.message}`;
      setStatus(message);
      if (typeof Swal !== 'undefined') Swal.fire({ icon: 'warning', title: 'Đã lưu nhưng chưa thể cập nhật giao diện', text: error.message });
      else console.error(message, error);
      finish();
      return;
    }

    if (status) status.textContent = `Đã nhập ${importedQuizzes.length} đề thi.`;
    if (typeof Swal !== 'undefined') Swal.fire({ icon: 'success', title: 'Nhập file JSON thành công!' });
    finish();
  };
  reader.onerror = () => {
    reportFailure('Không thể đọc file JSON', reader.error);
    finish();
  };
  reader.onabort = () => {
    setStatus('Đã hủy thao tác nhập file.');
    finish();
  };
  try {
    reader.readAsText(file);
  } catch (error) {
    reportFailure('Không thể đọc file JSON', error);
    finish();
  }
}

async function generateRandomQuiz(e) {
  e.preventDefault();
  const subjectId = document.getElementById('random-subject-select')?.value;
  const subject = window.AdminCatalogCache?.subjects?.find(item =>
    String(item.subjectId) === String(subjectId)
  );
  const timeLimit = Number(document.getElementById('random-time-input')?.value);
  const allocationInputs = Array.from(document.querySelectorAll('.random-skill-count'));
  if (!subject || allocationInputs.length === 0) {
    Swal.fire({ icon: 'warning', title: 'Chưa có kỹ năng để tạo đề' });
    return;
  }
  if (!Number.isInteger(timeLimit) || timeLimit < 1 || timeLimit > 180) {
    Swal.fire({ icon: 'error', title: 'Thời gian không hợp lệ', text: 'Nhập thời gian từ 1 đến 180 phút.' });
    return;
  }

  const generationSpec = {};
  for (const input of allocationInputs) {
    const count = Number(input.value);
    const availableCount = Number(input.max);
    if (!Number.isInteger(count) || count < 0 || count > availableCount) {
      Swal.fire({
        icon: 'error',
        title: 'Số câu theo kỹ năng không hợp lệ',
        text: `Mỗi kỹ năng phải có số câu từ 0 đến ${availableCount}.`
      });
      return;
    }
    if (count > 0) generationSpec[input.dataset.skillId] = count;
  }
  const totalQuestionCount = Object.values(generationSpec).reduce((sum, count) => sum + count, 0);
  if (totalQuestionCount === 0) {
    Swal.fire({ icon: 'warning', title: 'Chưa chọn số câu', text: 'Hãy đặt số câu lớn hơn 0 cho ít nhất một kỹ năng.' });
    return;
  }

  const database = window.LocalStorageDB.read();
  let questionIds;
  try {
    questionIds = selectRandomQuizQuestionIds(database, subject.subjectId, generationSpec);
  } catch (error) {
    Swal.fire({ icon: 'error', title: 'Không đủ câu hỏi theo kỹ năng', text: error.message });
    return;
  }
  if (new Set(questionIds).size !== questionIds.length) {
    Swal.fire({ icon: 'error', title: 'Không thể tạo đề', text: 'Ngân hàng có câu hỏi bị lặp trong lựa chọn.' });
    return;
  }
  const questionsById = new Map(window.AppState.allQuestions.map(question => [question.id, question]));
  const selectedQuestions = questionIds.map(questionId => questionsById.get(questionId));
  if (selectedQuestions.some(question => !question)) {
    Swal.fire({ icon: 'error', title: 'Không thể tạo đề', text: 'Không thể tải đầy đủ câu hỏi đã chọn từ ngân hàng.' });
    return;
  }

  const titleInput = document.getElementById('random-title-input');
  const title = titleInput?.value.trim() ||
    `Đề ngẫu nhiên - ${subject.name} - ${new Date().toLocaleString('vi-VN')}`;
  const quiz = {
    id: `quiz_random_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    title,
    topic: subject.name,
    subjectId: subject.subjectId,
    timeLimit,
    generationSpec,
    assignedStudentIds: [],
    maxAttempts: null,
    scorePolicy: 'highest',
    dueAt: null,
    createdAt: new Date().toISOString(),
    questions: selectedQuestions
  };
  window.AppState.allQuizzes.unshift(quiz);

  try {
    saveQuizzesAndQuestionsToStorage();
  } catch (error) {
    window.AppState.allQuizzes.shift();
    console.error('Không thể lưu đề ngẫu nhiên:', error);
    Swal.fire({ icon: 'error', title: 'Không thể lưu đề', text: error.message });
    return;
  }
  if (typeof renderAdminQuizzesTable === 'function') renderAdminQuizzesTable();
  await openQuizEditModal(quiz, 'Hoàn Thiện Thông Tin Đề Ngẫu Nhiên');
}

function selectRandomQuizQuestionIds(database, subjectId, generationSpec, random = Math.random) {
  const activeQuestionsBySkill = new Map();
  database.questions.forEach(question => {
    if (question.status !== 'active' || String(question.subjectId) !== String(subjectId)) return;
    const questions = activeQuestionsBySkill.get(question.skillId) || [];
    questions.push(question);
    activeQuestionsBySkill.set(question.skillId, questions);
  });
  const questionIds = [];
  for (const [skillId, count] of Object.entries(generationSpec)) {
    const questions = activeQuestionsBySkill.get(skillId) || [];
    if (questions.length < count) {
      throw new Error(`Kỹ năng ${skillId} chỉ có ${questions.length} câu đang hoạt động, không đủ ${count} câu.`);
    }
    const shuffled = [...questions];
    for (let index = shuffled.length - 1; index > 0; index--) {
      const swapIndex = Math.floor(random() * (index + 1));
      [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
    }
    questionIds.push(...shuffled.slice(0, count).map(question => question.questionId));
  }
  return questionIds;
}