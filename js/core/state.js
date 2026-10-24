/* ==========================================================================
   Adaptive Quiz System - State and Data Module (js/core/state.js)
   ========================================================================== */

window.AppStorageKeys = {
  quizzes: 'adaptive_quiz_quizzes',
  questions: 'adaptive_quiz_questions',
  settings: 'adaptive_quiz_settings'
};

const LEGACY_STORAGE_KEYS = {
  quizzes: ['all_quizzes_data', 'adaptive_quizzes'],
  questions: ['all_questions_bank'],
  settings: ['admin_settings']
};

window.AppState = {
  currentUser: null,
  viewingStudentId: null,
  allQuizzes: [],
  allQuestions: [],
  currentQuiz: null,
  currentQuestions: [],
  currentQuestionIndex: 0,
  answers: {},
  practiceDraftAnswers: {},
  timerInterval: null,
  timeRemaining: 0,
  quizResults: null,
  aiQuestions: null,
  currentAttemptStartedAt: null,
  selectedQuizIdForAdmin: null,
  resultReturnTo: 'catalog',
  listsState: {
    catalog: { searchText: '', topic: 'ALL', difficulty: 'ALL', sort: 'DATE_DESC', currentPage: 1, pageSize: 10 },
    studentHistory: { searchText: '', mode: 'ALL', score: 'ALL', sort: 'DATE_DESC', currentPage: 1, pageSize: '10' },
    adminQuizzes: { searchText: '', topic: 'ALL', difficulty: 'ALL', sort: 'DATE_DESC', currentPage: 1, pageSize: 10 },
    adminSubjects: { searchText: '', sort: 'DATE_DESC', currentPage: 1, pageSize: '10' },
    adminSkills: { searchText: '', sort: 'DATE_DESC', currentPage: 1, pageSize: '10' },
    adminDifficulties: { searchText: '', sort: 'RANK_ASC', currentPage: 1, pageSize: '10' },
    globalBank: { searchText: '', topic: 'ALL', sort: 'DATE_DESC', currentPage: 1, pageSize: 10 },
    adminUsers: { searchText: '', role: 'ALL', classId: 'ALL', status: 'ALL', sort: 'DATE_DESC', currentPage: 1, pageSize: 10 },
    adminClasses: { searchText: '', status: 'ALL', sort: 'DATE_DESC', currentPage: 1, pageSize: '10' },
    adminReports: { searchText: '', sort: 'DATE_DESC', currentPage: 1, pageSize: 10 },
    quizQuestions: { searchText: '', sort: 'DATE_DESC', currentPage: 1, pageSize: 10 },
    modalBank: { searchText: '', sort: 'DATE_DESC', currentPage: 1, pageSize: 10 }
  },
  settings: {
    topics: ["Lập trình Web", "Cơ sở dữ liệu", "Mạng máy tính", "Toán rời rạc"],
    difficulties: ["Easy", "Medium", "Hard"]
  }
};

window.StudentDataStorage = {
  getCurrentUser() {
    return window.AppState.currentUser || window.Auth?.getCurrentUser() || null;
  },

  getUserKey(dataType) {
    const user = this.getCurrentUser();
    const username = String(user?.username || '').trim().toLocaleLowerCase();
    if (!username) return null;
    return `adaptive_quiz_student_${encodeURIComponent(username)}_${dataType}`;
  },

  read(dataType, legacyKey, defaultValue) {
    const user = this.getCurrentUser();
    if (!user?.userId) return defaultValue;

    try {
      const database = window.LocalStorageDB.read();
      const savedProgress = database.studentProgress.find(item => item.userId === user.userId);
      const userKey = this.getUserKey(dataType);
      const localValue = userKey ? localStorage.getItem(userKey) : null;
      const legacyValue = localValue === null ? localStorage.getItem(legacyKey) : null;
      const storedValue = localValue ?? legacyValue;

      if (storedValue === null) {
        return savedProgress
          ? this.getProgressSection(savedProgress, dataType, defaultValue)
          : defaultValue;
      }

      const parsedValue = JSON.parse(storedValue);
      if (!parsedValue || typeof parsedValue !== 'object' || Array.isArray(parsedValue)) {
        throw new Error(`Dữ liệu ${dataType} cũ phải là một object.`);
      }
      const nextProgress = this.createDefaultProgress(user.userId);
      if (savedProgress) Object.assign(nextProgress, savedProgress);
      this.getProgressFields(dataType).forEach(field => {
        if (Object.prototype.hasOwnProperty.call(parsedValue, field)) {
          nextProgress[field] = parsedValue[field];
        }
      });
      const saved = window.LocalStorageDB.update(draft => {
        const index = draft.studentProgress.findIndex(item => item.userId === user.userId);
        if (index === -1) draft.studentProgress.push(nextProgress);
        else draft.studentProgress[index] = nextProgress;
      });
      if (userKey) localStorage.removeItem(userKey);
      if (localValue === null) localStorage.removeItem(legacyKey);
      return this.getProgressSection(
        saved.studentProgress.find(item => item.userId === user.userId),
        dataType,
        defaultValue
      );
    } catch (error) {
      console.error(`Không thể đọc dữ liệu ${dataType} của học viên:`, error);
      try {
        const savedProgress = window.LocalStorageDB.read().studentProgress
          .find(item => item.userId === user.userId);
        if (savedProgress) return this.getProgressSection(savedProgress, dataType, defaultValue);
      } catch (databaseError) {
        console.error('Không thể nạp tiến độ đã lưu trong database demo:', databaseError);
      }
      return defaultValue;
    }
  },

  write(dataType, data) {
    const user = this.getCurrentUser();
    if (!user?.userId) throw new Error('Cần đăng nhập học viên để lưu tiến độ cá nhân.');
    if (!data || typeof data !== 'object' || Array.isArray(data)) {
      throw new Error(`Dữ liệu ${dataType} cần lưu không hợp lệ.`);
    }
    const allowedFields = this.getProgressFields(dataType);
    const legacyKey = dataType === 'gamification' ? 'student_gamification_data' : 'student_mascot_data';
    const userKey = this.getUserKey(dataType);
    const localValue = userKey ? localStorage.getItem(userKey) : null;
    const legacyValue = localValue === null ? localStorage.getItem(legacyKey) : null;
    const cachedValue = localValue ?? legacyValue;
    const nextProgress = this.createDefaultProgress(user.userId);
    const database = window.LocalStorageDB.read();
    const existing = database.studentProgress.find(item => item.userId === user.userId);
    if (existing) Object.assign(nextProgress, existing);
    if (cachedValue !== null) {
      let parsedValue;
      try {
        parsedValue = JSON.parse(cachedValue);
      } catch (error) {
        throw new Error(`Không thể đọc cache ${dataType} cũ: ${error.message}`);
      }
      if (!parsedValue || typeof parsedValue !== 'object' || Array.isArray(parsedValue)) {
        throw new Error(`Dữ liệu ${dataType} cũ phải là một object.`);
      }
      allowedFields.forEach(field => {
        if (Object.prototype.hasOwnProperty.call(parsedValue, field)) nextProgress[field] = parsedValue[field];
      });
    }
    allowedFields.forEach(field => {
      if (Object.prototype.hasOwnProperty.call(data, field)) nextProgress[field] = data[field];
    });
    window.LocalStorageDB.update(draft => {
      const index = draft.studentProgress.findIndex(item => item.userId === user.userId);
      if (index === -1) draft.studentProgress.push(nextProgress);
      else draft.studentProgress[index] = nextProgress;
    });

    if (userKey) localStorage.removeItem(userKey);
    if (localValue === null && legacyValue !== null) localStorage.removeItem(legacyKey);
  },

  createDefaultProgress(userId) {
    return {
      userId,
      currentExp: 0,
      treeStage: 1,
      streakCount: 1,
      lastActiveDate: new Date().toLocaleDateString('vi-VN'),
      waterProgress: 0,
      fullBucketCount: 0,
      bucketsWatered: 0
    };
  },

  getProgressSection(progress, dataType, defaultValue) {
    if (!progress) return defaultValue;
    if (dataType === 'gamification') {
      return {
        treeStage: progress.treeStage,
        currentExp: progress.currentExp,
        streakCount: progress.streakCount,
        lastActiveDate: progress.lastActiveDate
      };
    }
    if (dataType === 'mascot') {
      return {
        waterProgress: progress.waterProgress,
        fullBucketCount: progress.fullBucketCount,
        treeStage: progress.treeStage,
        bucketsWatered: progress.bucketsWatered
      };
    }
    throw new Error(`Loại tiến độ không được hỗ trợ: ${dataType}.`);
  },

  getProgressFields(dataType) {
    if (dataType === 'gamification') {
      return ['currentExp', 'treeStage', 'streakCount', 'lastActiveDate'];
    }
    if (dataType === 'mascot') {
      return ['waterProgress', 'fullBucketCount', 'bucketsWatered'];
    }
    throw new Error(`Loại tiến độ không được hỗ trợ: ${dataType}.`);
  }
};

function readStoredArray(canonicalKey, legacyKeys) {
  const keysToCheck = [canonicalKey, ...legacyKeys];

  for (const key of keysToCheck) {
    const storedValue = localStorage.getItem(key);
    if (storedValue === null) continue;

    try {
      const parsedValue = JSON.parse(storedValue);
      if (!Array.isArray(parsedValue)) {
        throw new Error(`Dữ liệu trong ${key} không phải mảng`);
      }

      if (key !== canonicalKey) {
        localStorage.setItem(canonicalKey, storedValue);
      }
      return parsedValue;
    } catch (error) {
      console.error(`Không thể đọc dữ liệu từ localStorage "${key}":`, error);
    }
  }

  return null;
}

function readStoredSettings() {
  const keysToCheck = [window.AppStorageKeys.settings, ...LEGACY_STORAGE_KEYS.settings];

  for (const key of keysToCheck) {
    const storedValue = localStorage.getItem(key);
    if (storedValue === null) continue;

    try {
      const settings = JSON.parse(storedValue);
      if (!settings || !Array.isArray(settings.topics) || !Array.isArray(settings.difficulties)) {
        throw new Error(`Cấu trúc cài đặt trong ${key} không hợp lệ`);
      }

      if (key !== window.AppStorageKeys.settings) {
        localStorage.setItem(window.AppStorageKeys.settings, storedValue);
      }
      return settings;
    } catch (error) {
      console.error(`Không thể đọc cài đặt từ localStorage "${key}":`, error);
    }
  }

  return null;
}

function removeLegacyStorageKeys(keys) {
  keys.forEach(key => localStorage.removeItem(key));
}

function loadAdminSettings() {
  window.AppState.settings = readStoredSettings() || window.AppState.settings;
  localStorage.setItem(window.AppStorageKeys.settings, JSON.stringify(window.AppState.settings));
  removeLegacyStorageKeys(LEGACY_STORAGE_KEYS.settings);

  updateFilterOptionsUI();
}

function saveAdminSettings() {
  localStorage.setItem(window.AppStorageKeys.settings, JSON.stringify(window.AppState.settings));
  removeLegacyStorageKeys(LEGACY_STORAGE_KEYS.settings);
  updateFilterOptionsUI();
}

function updateFilterOptionsUI() {
  const topicSelects = [
    document.getElementById('filter-topic'),
    document.getElementById('filter-topic-admin-quizzes'),
    document.getElementById('filter-topic-global-bank')
  ];

  topicSelects.forEach(select => {
    if (!select) return;

    const currentValue = select.value || 'ALL';
    select.innerHTML = '<option value="ALL">Tất cả Chủ đề</option>';
    window.AppState.settings.topics.forEach(topic => {
      const option = document.createElement('option');
      option.value = topic;
      option.textContent = topic;
      select.appendChild(option);
    });
    select.value = currentValue;
  });

  const difficultySelects = [
    document.getElementById('filter-difficulty'),
    document.getElementById('filter-difficulty-admin-quizzes'),
    document.getElementById('filter-difficulty-global-bank')
  ];
  difficultySelects.forEach(select => {
    if (!select) return;

    const currentValue = select.value || 'ALL';
    select.replaceChildren();
    const allOption = document.createElement('option');
    allOption.value = 'ALL';
    allOption.textContent = 'Tất cả Độ khó';
    select.appendChild(allOption);
    window.AppState.settings.difficulties.forEach(difficulty => {
      const option = document.createElement('option');
      option.value = difficulty;
      option.textContent = difficulty;
      select.appendChild(option);
    });
    select.value = window.AppState.settings.difficulties.includes(currentValue) || currentValue === 'ALL'
      ? currentValue
      : 'ALL';
  });
}

function extractGlobalQuestions() {
  const questionsById = new Map(
    (window.AppState.allQuestions || [])
      .filter(question => question?.id)
      .map(question => [question.id, question])
  );

  window.AppState.allQuizzes.forEach(quiz => {
    if (!Array.isArray(quiz.questions)) return;

    quiz.questions.forEach(question => {
      if (!question || !question.id) return;
      questionsById.set(question.id, {
        ...question,
        topic: question.topic || quiz.topic || 'Chung',
        difficulty: question.difficulty || quiz.difficulty || 'Medium'
      });
    });
  });

  window.AppState.allQuestions = Array.from(questionsById.values());
}

function getDatabaseQuestionCatalogs(database) {
  const subjectsById = new Map(database.subjects.map(subject => [subject.subjectId, subject]));
  const subjectsByName = new Map(database.subjects.map(subject => [subject.name.trim().toLowerCase(), subject]));
  const skillsById = new Map(database.skills.map(skill => [skill.skillId, skill]));
  const difficultiesById = new Map(database.difficulties.map(difficulty => [difficulty.difficultyId, difficulty]));
  const difficultiesByLabel = new Map(database.difficulties.map(difficulty => [difficulty.label.trim().toLowerCase(), difficulty]));
  return { subjectsById, subjectsByName, skillsById, difficultiesById, difficultiesByLabel };
}

function getAverageQuizDifficulty(questions, difficulties) {
  if (!Array.isArray(questions) || questions.length === 0) return null;

  const difficultiesById = new Map(difficulties.map(item => [item.difficultyId, item]));
  const difficultiesByLabel = new Map(difficulties.map(item => [item.label.trim().toLowerCase(), item]));
  const questionDifficulties = questions.map(question =>
    difficultiesById.get(question.difficultyId) ||
    difficultiesByLabel.get(String(question.difficulty || '').trim().toLowerCase())
  );
  if (questionDifficulties.some(difficulty => !difficulty)) return null;

  const averageRank = questionDifficulties.reduce((sum, difficulty) => sum + difficulty.rank, 0) /
    questionDifficulties.length;
  return difficulties.slice().sort((left, right) =>
    Math.abs(left.rank - averageRank) - Math.abs(right.rank - averageRank) || right.rank - left.rank
  )[0] || null;
}

function updateQuizGenerationSpec(quiz) {
  if (!quiz || quiz.generationSpec === undefined) return;
  quiz.generationSpec = (quiz.questions || []).reduce((spec, question) => {
    if (question.skillId) spec[question.skillId] = (spec[question.skillId] || 0) + 1;
    return spec;
  }, {});
}

function normalizeLegacyQuestion(question, database, catalogs) {
  if (!question || typeof question !== 'object' || Array.isArray(question) ||
      typeof question.id !== 'string' || !question.id.trim()) {
    throw new Error('Dữ liệu đề/câu hỏi cũ có câu hỏi thiếu ID hợp lệ.');
  }
  if (!Array.isArray(question.options) || question.options.some(option => typeof option !== 'string')) {
    throw new Error(`Câu hỏi ${question.id} có danh sách phương án không hợp lệ.`);
  }
  if (typeof question.question !== 'string' || !question.question.trim()) {
    throw new Error(`Câu hỏi ${question.id} không có nội dung hợp lệ.`);
  }
  const originalOptionIndexes = question.options
    .map((option, index) => option.trim() ? index : -1)
    .filter(index => index >= 0);
  if (originalOptionIndexes.length < 2) {
    throw new Error(`Câu hỏi ${question.id} phải có ít nhất hai phương án không rỗng.`);
  }
  const rawAnswers = Array.isArray(question.correctAnswer) ? question.correctAnswer : [question.correctAnswer];
  if (!rawAnswers.length || rawAnswers.some(answer =>
    !Number.isInteger(answer) || answer < 0 || answer >= question.options.length || !originalOptionIndexes.includes(answer)
  )) {
    throw new Error(`Câu hỏi ${question.id} có đáp án đúng không hợp lệ.`);
  }
  const subject = catalogs.subjectsById.get(question.subjectId) ||
    catalogs.subjectsByName.get(String(question.topic || '').trim().toLowerCase());
  if (!subject) throw new Error(`Không xác định được môn học của câu hỏi ${question.id}.`);
  const skill = catalogs.skillsById.get(question.skillId);
  const matchingSkill = skill?.subjectId === subject.subjectId
    ? skill
    : database.skills.find(item => item.subjectId === subject.subjectId);
  if (!matchingSkill) throw new Error(`Môn học của câu hỏi ${question.id} chưa có kỹ năng liên kết.`);
  const difficulty = catalogs.difficultiesById.get(question.difficultyId) ||
    catalogs.difficultiesByLabel.get(String(question.difficulty || '').trim().toLowerCase());
  if (!difficulty) throw new Error(`Không xác định được độ khó của câu hỏi ${question.id}.`);

  return {
    questionId: question.id,
    subjectId: subject.subjectId,
    skillId: matchingSkill.skillId,
    difficultyId: difficulty.difficultyId,
    type: question.type === 'multiple' || rawAnswers.length > 1 ? 'multiple' : 'single',
    content: question.question,
    options: originalOptionIndexes.map((originalIndex, index) => ({
      optionId: `option_${question.id}_${index + 1}`,
      content: question.options[originalIndex]
    })),
    correctOptionIds: rawAnswers.map(answer =>
      `option_${question.id}_${originalOptionIndexes.indexOf(answer) + 1}`
    ),
    explanation: typeof question.explanation === 'string' ? question.explanation : '',
    remediation: question.remediation,
    ...(question.createdAt ? { createdAt: question.createdAt } : {}),
    topic: subject.name,
    subTopic: typeof question.subTopic === 'string' ? question.subTopic : '',
    status: 'active'
  };
}

function normalizeLegacyQuiz(quiz, database, catalogs, questionsById) {
  if (!quiz || typeof quiz !== 'object' || Array.isArray(quiz) ||
      typeof quiz.id !== 'string' || !quiz.id.trim()) {
    throw new Error('Dữ liệu đề thi cũ có đề thiếu ID hợp lệ.');
  }
  if (!Array.isArray(quiz.questions)) {
    throw new Error(`Đề thi ${quiz.id} có danh sách câu hỏi không hợp lệ.`);
  }
  const questions = quiz.questions.map(question => {
    const normalized = questionsById.get(question?.id);
    if (!normalized) throw new Error(`Đề thi ${quiz.id} tham chiếu câu hỏi không hợp lệ.`);
    return normalized;
  });
  const subject = catalogs.subjectsById.get(quiz.subjectId) ||
    catalogs.subjectsByName.get(String(quiz.topic || questions[0]?.topic || '').trim().toLowerCase());
  if (!subject) throw new Error(`Không xác định được môn học của đề thi ${quiz.id}.`);
  if (questions.some(question => question.subjectId !== subject.subjectId)) {
    throw new Error(`Đề thi ${quiz.id} có câu hỏi không thuộc cùng môn học.`);
  }

  const difficulty = getAverageQuizDifficulty(questions, database.difficulties);
  if (questions.length > 0 && !difficulty) {
    throw new Error(`Không thể tính độ khó trung bình của đề thi ${quiz.id}.`);
  }
  const timeLimitMinutes = Number(quiz.timeLimit);
  if (!Number.isFinite(timeLimitMinutes) || timeLimitMinutes <= 0) {
    throw new Error(`Đề thi ${quiz.id} có thời lượng không hợp lệ.`);
  }
  const generationSpec = quiz.generationSpec || questions.reduce((spec, question) => {
    if (question.skillId) spec[question.skillId] = (spec[question.skillId] || 0) + 1;
    return spec;
  }, {});
  if (quiz.assignedStudentIds !== undefined && !Array.isArray(quiz.assignedStudentIds)) {
    throw new Error(`Đề thi ${quiz.id} có danh sách học sinh được giao không hợp lệ.`);
  }

  return {
    quizId: quiz.id,
    subjectId: subject.subjectId,
    ...(difficulty ? { difficultyId: difficulty.difficultyId } : {}),
    title: quiz.title,
    timeLimitMinutes,
    status: 'active',
    questionIds: questions.map(question => question.questionId),
    ...(Object.keys(generationSpec).length > 0 ? { generationSpec } : {}),
    assignedStudentIds: quiz.assignedStudentIds === undefined ? [] : [...quiz.assignedStudentIds],
    maxAttempts: quiz.maxAttempts === undefined ? null : quiz.maxAttempts,
    scorePolicy: quiz.scorePolicy === undefined ? 'highest' : quiz.scorePolicy,
    dueAt: quiz.dueAt === undefined ? null : quiz.dueAt,
    ...(quiz.createdAt ? { createdAt: quiz.createdAt } : {})
  };
}

function legacyQuestionFromDatabase(question, catalogs) {
  const subject = catalogs.subjectsById.get(question.subjectId);
  const skill = catalogs.skillsById.get(question.skillId);
  const difficulty = catalogs.difficultiesById.get(question.difficultyId);
  const answerIndexes = question.correctOptionIds
    .map(optionId => question.options.findIndex(option => option.optionId === optionId));
  return {
    id: question.questionId,
    subjectId: question.subjectId,
    skillId: question.skillId,
    topic: subject?.name || 'Chung',
    subTopic: question.subTopic || skill?.name || '',
    difficulty: difficulty?.label || 'Medium',
    difficultyId: question.difficultyId,
    difficultyRank: difficulty?.rank,
    type: question.type,
    question: question.content,
    options: question.options.map(option => option.content),
    correctAnswer: answerIndexes,
    explanation: question.explanation || '',
    remediation: question.remediation,
    ...(question.createdAt ? { createdAt: question.createdAt } : {})
  };
}

function legacyQuizFromDatabase(quiz, questionsById, catalogs) {
  const subject = catalogs.subjectsById.get(quiz.subjectId);
  const questions = quiz.questionIds.map(questionId => questionsById.get(questionId)).filter(Boolean);
  const difficulty = getAverageQuizDifficulty(questions, Array.from(catalogs.difficultiesById.values()));
  return {
    id: quiz.quizId,
    title: quiz.title,
    topic: subject?.name || 'Chung',
    subjectId: quiz.subjectId,
    ...(difficulty ? {
      difficulty: difficulty.label,
      difficultyId: difficulty.difficultyId,
      difficultyRank: difficulty.rank
    } : {}),
    timeLimit: quiz.timeLimitMinutes,
    generationSpec: quiz.generationSpec,
    assignedStudentIds: quiz.assignedStudentIds === undefined ? [] : [...quiz.assignedStudentIds],
    maxAttempts: quiz.maxAttempts === undefined ? null : quiz.maxAttempts,
    scorePolicy: quiz.scorePolicy === undefined ? 'highest' : quiz.scorePolicy,
    dueAt: quiz.dueAt === undefined ? null : quiz.dueAt,
    ...(quiz.createdAt ? { createdAt: quiz.createdAt } : {}),
    questions
  };
}

function loadQuizDataFromDatabase() {
  const database = window.LocalStorageDB.read();
  const catalogs = getDatabaseQuestionCatalogs(database);
  const questionsById = new Map(database.questions.map(question => [
    question.questionId,
    legacyQuestionFromDatabase(question, catalogs)
  ]));
  const quizzes = database.quizzes
    .filter(quiz => quiz.status === 'active')
    .map(quiz => legacyQuizFromDatabase(quiz, questionsById, catalogs));
  return { quizzes, questions: Array.from(questionsById.values()) };
}

function groupQuestionsIntoQuizzes(questions) {
  const quizzes = [];
  const quizCount = Math.floor(questions.length / 10);

  for (let index = 0; index < quizCount; index++) {
    const quizQuestions = questions.slice(index * 10, (index + 1) * 10);
    const firstQuestion = quizQuestions[0];

    quizzes.push({
      id: `quiz_${index + 1}`,
      title: firstQuestion.subTopic || `Đề thi ${firstQuestion.topic} #${index + 1}`,
      topic: firstQuestion.topic || 'Lập trình Web',
      difficulty: firstQuestion.difficulty || 'Medium',
      timeLimit: 15,
      questions: quizQuestions
    });
  }

  return quizzes;
}

function saveQuizzesAndQuestionsToStorage() {
  extractGlobalQuestions();
  const database = window.LocalStorageDB.read();
  const catalogs = getDatabaseQuestionCatalogs(database);
  const legacyQuestionsById = new Map();
  window.AppState.allQuestions.forEach(question => legacyQuestionsById.set(question.id, question));
  window.AppState.allQuizzes.forEach(quiz => {
    (quiz.questions || []).forEach(question => legacyQuestionsById.set(question.id, question));
  });
  const normalizedQuestions = Array.from(legacyQuestionsById.values())
    .map(question => normalizeLegacyQuestion(question, database, catalogs));
  const normalizedQuestionsById = new Map(normalizedQuestions.map(question => [question.questionId, question]));
  const normalizedQuizzes = window.AppState.allQuizzes
    .filter(quiz => Array.isArray(quiz.questions))
    .map(quiz => normalizeLegacyQuiz(quiz, database, catalogs, normalizedQuestionsById));
  window.LocalStorageDB.update(draft => {
    draft.questions = normalizedQuestions;
    draft.quizzes = normalizedQuizzes;
  });
  const normalizedDifficultyByQuizId = new Map(normalizedQuizzes.map(quiz => [
    quiz.quizId,
    catalogs.difficultiesById.get(quiz.difficultyId) || null
  ]));
  window.AppState.allQuizzes.forEach(quiz => {
    const difficulty = normalizedDifficultyByQuizId.get(quiz.id);
    if (difficulty) {
      quiz.difficulty = difficulty.label;
      quiz.difficultyId = difficulty.difficultyId;
      quiz.difficultyRank = difficulty.rank;
    } else {
      delete quiz.difficulty;
      delete quiz.difficultyId;
      delete quiz.difficultyRank;
    }
  });
  removeLegacyStorageKeys([
    window.AppStorageKeys.quizzes,
    window.AppStorageKeys.questions,
    ...LEGACY_STORAGE_KEYS.quizzes,
    ...LEGACY_STORAGE_KEYS.questions
  ]);
  if (typeof filterAndRenderQuizzes === 'function') filterAndRenderQuizzes();
}

async function loadQuestionsData() {
  try {
    let cachedQuizzes = readStoredArray(window.AppStorageKeys.quizzes, LEGACY_STORAGE_KEYS.quizzes);
    let cachedQuestions = readStoredArray(window.AppStorageKeys.questions, LEGACY_STORAGE_KEYS.questions);

    if (cachedQuizzes === null && cachedQuestions === null) {
      const fromDatabase = loadQuizDataFromDatabase();
      if (fromDatabase.quizzes.length > 0) {
        window.AppState.allQuizzes = fromDatabase.quizzes;
        window.AppState.allQuestions = fromDatabase.questions;
        return;
      }
      const response = await fetch('./data/questions.json');
      if (!response.ok) throw new Error(`Không thể tải data/questions.json (Status: ${response.status})`);
      cachedQuestions = await response.json();
      if (!Array.isArray(cachedQuestions)) throw new Error('data/questions.json phải chứa một mảng câu hỏi');
      cachedQuizzes = groupQuestionsIntoQuizzes(cachedQuestions);
    } else if (cachedQuizzes === null) {
      cachedQuizzes = groupQuestionsIntoQuizzes(cachedQuestions);
    } else if (cachedQuestions === null) {
      cachedQuestions = [];
    }

    window.AppState.allQuizzes = cachedQuizzes;
    window.AppState.allQuestions = cachedQuestions;
    extractGlobalQuestions();
    saveQuizzesAndQuestionsToStorage();
  } catch (error) {
    console.error('Không thể chuyển/nạp dữ liệu đề thi trong database demo:', error);
    if (typeof Swal !== 'undefined') {
      Swal.fire({
        icon: 'error',
        title: 'Không thể nạp dữ liệu đề thi',
        text: `${error.message} Dữ liệu cũ được giữ nguyên.`
      });
    }
    const fromDatabase = loadQuizDataFromDatabase();
    window.AppState.allQuizzes = fromDatabase.quizzes;
    window.AppState.allQuestions = fromDatabase.questions;
  }
}
