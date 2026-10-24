window.LocalStorageDB = (() => {
  const storageKey = 'adaptive_quiz_demo_db';
  const schemaVersion = 5;
  const migrations = new Map();
  const collectionIds = Object.freeze({
    users: 'userId',
    classes: 'classId',
    subjects: 'subjectId',
    skills: 'skillId',
    difficulties: 'difficultyId',
    questions: 'questionId',
    quizzes: 'quizId',
    attempts: 'attemptId',
    studentProgress: 'userId'
  });

  function createEmptyDatabase() {
    return {
      schemaVersion,
      users: [],
      classes: [],
      subjects: [],
      skills: [],
      difficulties: [],
      questions: [],
      quizzes: [],
      attempts: [],
      studentProgress: []
    };
  }

  function clone(value) {
    let serialized;
    try {
      serialized = JSON.stringify(value);
    } catch (error) {
      throw new Error(`Không thể tuần tự hóa database demo: ${error.message}`);
    }
    if (serialized === undefined) throw new Error('Database demo không thể chuyển thành JSON.');
    return JSON.parse(serialized);
  }

  function isValidBirthDate(value) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const [year, month, day] = value.split('-').map(Number);
    const parsed = new Date(Date.UTC(year, month - 1, day));
    const today = new Date();
    const localToday = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    return value <= localToday &&
      parsed.getUTCFullYear() === year &&
      parsed.getUTCMonth() === month - 1 &&
      parsed.getUTCDate() === day;
  }

  function isValidPhone(value) {
    if (typeof value !== 'string' || !/^[+()\d\s.-]+$/.test(value)) return false;
    const digits = value.replace(/\D/g, '');
    return digits.length >= 9 && digits.length <= 15;
  }

  function validate(database) {
    const errors = [];
    const requiredCollections = Object.keys(collectionIds);

    if (!database || typeof database !== 'object' || Array.isArray(database)) {
      throw new Error('Database demo phải là một object JSON.');
    }
    if (!Number.isInteger(database.schemaVersion) || database.schemaVersion !== schemaVersion) {
      throw new Error(
        `Phiên bản database ${String(database.schemaVersion)} không được hỗ trợ (ứng dụng hỗ trợ v${schemaVersion}). ` +
        'Dữ liệu đã lưu được giữ nguyên; cần có bước chuyển đổi tương ứng trước khi sử dụng.'
      );
    }

    const unknownKeys = Object.keys(database).filter(key =>
      key !== 'schemaVersion' && !requiredCollections.includes(key)
    );
    if (unknownKeys.length > 0) {
      errors.push(`Có trường database không được hỗ trợ: ${unknownKeys.join(', ')}.`);
    }

    requiredCollections.forEach(collection => {
      if (!Array.isArray(database[collection])) {
        errors.push(`Trường ${collection} phải là một mảng.`);
      }
    });
    if (errors.length > 0) throw new Error(errors.join(' '));

    const idsByCollection = {};
    requiredCollections.forEach(collection => {
      const idField = collectionIds[collection];
      const ids = new Set();
      idsByCollection[collection] = ids;
      database[collection].forEach((record, index) => {
        if (!record || typeof record !== 'object' || Array.isArray(record)) {
          errors.push(`${collection}[${index}] phải là một object.`);
          return;
        }
        const id = record[idField];
        if (typeof id !== 'string' || !id.trim()) {
          errors.push(`${collection}[${index}].${idField} phải là chuỗi không rỗng.`);
        } else if (ids.has(id)) {
          errors.push(`${collection} có ID bị trùng: ${id}.`);
        } else {
          ids.add(id);
        }
      });
    });

    const hasReference = (collection, id) =>
      typeof id === 'string' && idsByCollection[collection].has(id);
    const findRecord = (collection, idField, id) =>
      database[collection].find(record =>
        record && typeof record === 'object' && !Array.isArray(record) && record[idField] === id
      );
    const isCatalogStatusValid = value => ['active', 'inactive'].includes(value);

    const usernames = new Set();
    database.users.forEach((user, index) => {
      if (!user || typeof user !== 'object' || Array.isArray(user)) return;
      if (typeof user.username !== 'string' || !/^[a-z0-9._-]{3,40}$/i.test(user.username)) {
        errors.push(`users[${index}].username phải có từ 3 đến 40 ký tự chữ, số, dấu chấm, gạch dưới hoặc gạch ngang.`);
      } else {
        const normalizedUsername = user.username.trim().toLocaleLowerCase();
        if (usernames.has(normalizedUsername)) {
          errors.push(`Username bị trùng: ${user.username}.`);
        } else {
          usernames.add(normalizedUsername);
        }
      }
      if (typeof user.password !== 'string' || !user.password) {
        errors.push(`users[${index}].password không được để trống.`);
      }
      if (typeof user.nickname !== 'string') {
        errors.push(`users[${index}].nickname phải là chuỗi.`);
      }
      if (typeof user.avatar !== 'string' || !user.avatar) {
        errors.push(`users[${index}].avatar phải là chuỗi không rỗng.`);
      }
      if (typeof user.birthDate !== 'string' ||
          (user.birthDate !== '' && !isValidBirthDate(user.birthDate))) {
        errors.push(`users[${index}].birthDate phải là ngày hợp lệ dạng YYYY-MM-DD hoặc chuỗi rỗng.`);
      }
      if (typeof user.phone !== 'string' ||
          (user.phone !== '' && !isValidPhone(user.phone))) {
        errors.push(`users[${index}].phone phải là số điện thoại hợp lệ hoặc chuỗi rỗng.`);
      }
      if (!['admin', 'student'].includes(user.role)) {
        errors.push(`users[${index}].role phải là admin hoặc student.`);
      }
      if (!['active', 'inactive', 'locked'].includes(user.status)) {
        errors.push(`users[${index}].status không hợp lệ.`);
      }
      if (typeof user.fullName !== 'string' || !user.fullName.trim()) {
        errors.push(`users[${index}].fullName không được để trống.`);
      }
      const classIds = user.classIds;
      if (!Array.isArray(classIds)) {
        errors.push(`users[${index}].classIds phải là một mảng.`);
      } else {
        const seenClassIds = new Set();
        classIds.forEach(classId => {
          if (!hasReference('classes', classId)) {
            errors.push(`users[${index}].classIds tham chiếu lớp không hợp lệ: ${String(classId)}.`);
          }
          if (seenClassIds.has(classId)) {
            errors.push(`users[${index}].classIds có classId bị trùng: ${classId}.`);
          }
          seenClassIds.add(classId);
        });
        if (user.role !== 'student' && classIds.length > 0) {
          errors.push(`users[${index}].classIds chỉ được dùng cho học viên.`);
        }
      }
    });

    const classNames = new Set();
    database.classes.forEach((classRecord, index) => {
      if (!classRecord || typeof classRecord !== 'object' || Array.isArray(classRecord)) return;
      const name = typeof classRecord.name === 'string'
        ? classRecord.name.trim().toLocaleLowerCase()
        : '';
      if (!name) {
        errors.push(`classes[${index}].name không được để trống.`);
      } else if (classNames.has(name)) {
        errors.push(`Tên lớp bị trùng: ${classRecord.name}.`);
      } else {
        classNames.add(name);
      }
      if (!isCatalogStatusValid(classRecord.status)) {
        errors.push(`classes[${index}].status không hợp lệ.`);
      }
    });

    const subjectNames = new Set();
    database.subjects.forEach((subject, index) => {
      if (!subject || typeof subject !== 'object' || Array.isArray(subject)) return;
      const name = typeof subject.name === 'string' ? subject.name.trim().toLocaleLowerCase() : '';
      if (!name) {
        errors.push(`subjects[${index}].name không được để trống.`);
      } else if (subjectNames.has(name)) {
        errors.push(`Tên môn học bị trùng: ${subject.name}.`);
      } else {
        subjectNames.add(name);
      }
      if (!isCatalogStatusValid(subject.status)) errors.push(`subjects[${index}].status không hợp lệ.`);
    });

    const skillNames = new Set();
    database.skills.forEach((skill, index) => {
      if (!skill || typeof skill !== 'object' || Array.isArray(skill)) return;
      if (!hasReference('subjects', skill.subjectId)) {
        errors.push(`skills[${index}].subjectId không tham chiếu môn học hợp lệ.`);
      }
      if (typeof skill.name !== 'string' || !skill.name.trim()) {
        errors.push(`skills[${index}].name không được để trống.`);
      }
      const normalizedName = typeof skill.name === 'string' ? skill.name.trim().toLocaleLowerCase() : '';
      const uniqueKey = `${skill.subjectId}\u0000${normalizedName}`;
      if (normalizedName && skillNames.has(uniqueKey)) {
        errors.push(`Tên kỹ năng bị trùng trong môn ${skill.subjectId}: ${skill.name}.`);
      } else if (normalizedName) {
        skillNames.add(uniqueKey);
      }
      if (!isCatalogStatusValid(skill.status)) errors.push(`skills[${index}].status không hợp lệ.`);
    });

    const difficultyLabels = new Set();
    const difficultyRanks = new Set();
    database.difficulties.forEach((difficulty, index) => {
      if (!difficulty || typeof difficulty !== 'object' || Array.isArray(difficulty)) return;
      const label = typeof difficulty.label === 'string' ? difficulty.label.trim().toLocaleLowerCase() : '';
      const rank = difficulty.rank;
      if (!label) errors.push(`difficulties[${index}].label không được để trống.`);
      else if (difficultyLabels.has(label)) errors.push(`Nhãn độ khó bị trùng: ${difficulty.label}.`);
      else difficultyLabels.add(label);
      if (!Number.isInteger(rank) || rank < 1) {
        errors.push(`difficulties[${index}].rank phải là số nguyên dương.`);
      } else if (difficultyRanks.has(rank)) {
        errors.push(`Rank độ khó bị trùng: ${rank}.`);
      } else {
        difficultyRanks.add(rank);
      }
      if (!isCatalogStatusValid(difficulty.status)) errors.push(`difficulties[${index}].status không hợp lệ.`);
    });

    const optionIdsAcrossDatabase = new Set();
    database.questions.forEach((question, index) => {
      if (!question || typeof question !== 'object' || Array.isArray(question)) return;
      if (!hasReference('subjects', question.subjectId)) {
        errors.push(`questions[${index}].subjectId không tham chiếu môn học hợp lệ.`);
      }
      const skill = findRecord('skills', 'skillId', question.skillId);
      if (!skill || skill.subjectId !== question.subjectId) {
        errors.push(`questions[${index}].skillId không thuộc môn học của câu hỏi.`);
      }
      if (!hasReference('difficulties', question.difficultyId)) {
        errors.push(`questions[${index}].difficultyId không tham chiếu độ khó hợp lệ.`);
      }
      if (!['single', 'multiple'].includes(question.type)) {
        errors.push(`questions[${index}].type phải là single hoặc multiple.`);
      }
      if (typeof question.content !== 'string' || !question.content.trim()) {
        errors.push(`questions[${index}].content không được để trống.`);
      }
      if (question.explanation !== undefined && typeof question.explanation !== 'string') {
        errors.push(`questions[${index}].explanation phải là chuỗi.`);
      }
      if (!isCatalogStatusValid(question.status)) {
        errors.push(`questions[${index}].status không hợp lệ.`);
      }
      if (!Array.isArray(question.options) || question.options.length < 2) {
        errors.push(`questions[${index}].options phải có ít nhất hai phương án.`);
      } else {
        const optionIds = new Set();
        question.options.forEach((option, optionIndex) => {
          if (!option || typeof option !== 'object' || Array.isArray(option)) {
            errors.push(`questions[${index}].options[${optionIndex}] phải là một object.`);
            return;
          }
          if (typeof option.optionId !== 'string' || !option.optionId.trim()) {
            errors.push(`questions[${index}].options[${optionIndex}].optionId không hợp lệ.`);
          } else if (optionIds.has(option.optionId)) {
            errors.push(`questions[${index}] có optionId bị trùng: ${option.optionId}.`);
          } else {
            optionIds.add(option.optionId);
            if (optionIdsAcrossDatabase.has(option.optionId)) {
              errors.push(`optionId bị trùng trong database: ${option.optionId}.`);
            } else {
              optionIdsAcrossDatabase.add(option.optionId);
            }
          }
          if (typeof option?.content !== 'string' || !option.content.trim()) {
            errors.push(`questions[${index}].options[${optionIndex}].content không được để trống.`);
          }
        });
        if (!Array.isArray(question.correctOptionIds) || question.correctOptionIds.length === 0) {
          errors.push(`questions[${index}].correctOptionIds phải có ít nhất một đáp án đúng.`);
        } else {
          const uniqueCorrectIds = new Set(question.correctOptionIds);
          if (uniqueCorrectIds.size !== question.correctOptionIds.length) {
            errors.push(`questions[${index}].correctOptionIds không được trùng ID.`);
          }
          if (question.correctOptionIds.some(id => !optionIds.has(id))) {
            errors.push(`questions[${index}].correctOptionIds phải tham chiếu phương án hiện có.`);
          }
          if (question.type === 'single' && question.correctOptionIds.length !== 1) {
            errors.push(`questions[${index}] dạng single phải có đúng một đáp án đúng.`);
          }
        }
      }
    });

    database.quizzes.forEach((quiz, index) => {
      if (!quiz || typeof quiz !== 'object' || Array.isArray(quiz)) return;
      if (!hasReference('subjects', quiz.subjectId)) {
        errors.push(`quizzes[${index}].subjectId không tham chiếu môn học hợp lệ.`);
      }
      if (typeof quiz.title !== 'string' || !quiz.title.trim()) {
        errors.push(`quizzes[${index}].title không được để trống.`);
      }
      if (!Number.isFinite(quiz.timeLimitMinutes) || quiz.timeLimitMinutes <= 0) {
        errors.push(`quizzes[${index}].timeLimitMinutes phải là số dương.`);
      }
      const assignedStudentIds = quiz.assignedStudentIds === undefined ? [] : quiz.assignedStudentIds;
      if (!Array.isArray(assignedStudentIds)) {
        errors.push(`quizzes[${index}].assignedStudentIds phải là một mảng.`);
      } else {
        const assignedIds = new Set();
        assignedStudentIds.forEach(userId => {
          const user = findRecord('users', 'userId', userId);
          if (!user || user.role !== 'student') {
            errors.push(`quizzes[${index}].assignedStudentIds tham chiếu học viên không hợp lệ: ${String(userId)}.`);
          }
          if (assignedIds.has(userId)) {
            errors.push(`quizzes[${index}].assignedStudentIds có userId bị trùng: ${userId}.`);
          }
          assignedIds.add(userId);
        });
      }
      const maxAttempts = quiz.maxAttempts === undefined ? null : quiz.maxAttempts;
      if (maxAttempts !== null && (!Number.isInteger(maxAttempts) || maxAttempts < 1)) {
        errors.push(`quizzes[${index}].maxAttempts phải là null hoặc số nguyên dương.`);
      }
      const scorePolicy = quiz.scorePolicy === undefined ? 'highest' : quiz.scorePolicy;
      if (!['highest', 'average', 'latest'].includes(scorePolicy)) {
        errors.push(`quizzes[${index}].scorePolicy phải là highest, average hoặc latest.`);
      }
      const dueAt = quiz.dueAt === undefined ? null : quiz.dueAt;
      if (dueAt !== null &&
          (typeof dueAt !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/.test(dueAt) ||
           !Number.isFinite(Date.parse(dueAt)))) {
        errors.push(`quizzes[${index}].dueAt phải là null hoặc thời điểm ISO 8601 hợp lệ.`);
      }
      if (quiz.difficultyId !== undefined && !hasReference('difficulties', quiz.difficultyId)) {
        errors.push(`quizzes[${index}].difficultyId không tham chiếu độ khó hợp lệ.`);
      }
      if (!isCatalogStatusValid(quiz.status)) errors.push(`quizzes[${index}].status không hợp lệ.`);
      if (!Array.isArray(quiz.questionIds)) {
        errors.push(`quizzes[${index}].questionIds phải là một mảng.`);
      } else {
        const questionIds = new Set();
        quiz.questionIds.forEach(questionId => {
          if (questionIds.has(questionId)) errors.push(`quizzes[${index}] có questionId bị trùng: ${questionId}.`);
          questionIds.add(questionId);
          const question = findRecord('questions', 'questionId', questionId);
          if (!question) errors.push(`quizzes[${index}] tham chiếu câu hỏi không tồn tại: ${questionId}.`);
          else if (question.subjectId !== quiz.subjectId) {
            errors.push(`Câu hỏi ${questionId} không thuộc môn học của đề ${quiz.quizId}.`);
          }
        });
      }
      if (quiz.generationSpec !== undefined) {
        if (!quiz.generationSpec || typeof quiz.generationSpec !== 'object' || Array.isArray(quiz.generationSpec)) {
          errors.push(`quizzes[${index}].generationSpec phải là object.`);
        } else {
          const specifiedQuestionCount = Object.values(quiz.generationSpec)
            .reduce((total, count) => total + (Number.isInteger(count) && count > 0 ? count : 0), 0);
          const actualQuestionCountBySkill = new Map();
          Object.entries(quiz.generationSpec).forEach(([skillId, count]) => {
            const skill = findRecord('skills', 'skillId', skillId);
            if (!skill || skill.subjectId !== quiz.subjectId) {
              errors.push(`quizzes[${index}].generationSpec tham chiếu kỹ năng không hợp lệ: ${skillId}.`);
            }
            if (!Number.isInteger(count) || count < 1) {
              errors.push(`quizzes[${index}].generationSpec.${skillId} phải là số nguyên dương.`);
            }
          });
          if (Array.isArray(quiz.questionIds)) {
            quiz.questionIds.forEach(questionId => {
              const question = findRecord('questions', 'questionId', questionId);
              if (question?.skillId) {
                actualQuestionCountBySkill.set(
                  question.skillId,
                  (actualQuestionCountBySkill.get(question.skillId) || 0) + 1
                );
              }
            });
            if (specifiedQuestionCount !== quiz.questionIds.length) {
              errors.push(`quizzes[${index}].generationSpec không khớp tổng số câu hỏi.`);
            }
            Object.entries(quiz.generationSpec).forEach(([skillId, count]) => {
              if (actualQuestionCountBySkill.get(skillId) !== count) {
                errors.push(`quizzes[${index}].generationSpec.${skillId} không khớp số câu hỏi theo kỹ năng.`);
              }
            });
            actualQuestionCountBySkill.forEach((count, skillId) => {
              if (!Object.prototype.hasOwnProperty.call(quiz.generationSpec, skillId)) {
                errors.push(`quizzes[${index}].questionIds có câu hỏi ngoài generationSpec: ${skillId}.`);
              }
            });
          }
        }
      }
    });

    database.attempts.forEach((attempt, index) => {
      if (!attempt || typeof attempt !== 'object' || Array.isArray(attempt)) return;
      if (!hasReference('users', attempt.userId)) {
        errors.push(`attempts[${index}].userId không tham chiếu tài khoản hợp lệ.`);
      }
      if (attempt.quizId !== null && attempt.quizId !== undefined && !hasReference('quizzes', attempt.quizId)) {
        errors.push(`attempts[${index}].quizId không tham chiếu đề thi hợp lệ.`);
      }
      if (!['EXAM', 'PRACTICE'].includes(attempt.mode)) {
        errors.push(`attempts[${index}].mode không hợp lệ.`);
      }
      const startedAt = Date.parse(attempt.startedAt);
      const completedAt = Date.parse(attempt.completedAt);
      if (typeof attempt.startedAt !== 'string' || !Number.isFinite(startedAt)) {
        errors.push(`attempts[${index}].startedAt phải là thời gian hợp lệ.`);
      }
      if (typeof attempt.completedAt !== 'string' || !Number.isFinite(completedAt)) {
        errors.push(`attempts[${index}].completedAt phải là thời gian hợp lệ.`);
      } else if (Number.isFinite(startedAt) && completedAt < startedAt) {
        errors.push(`attempts[${index}].completedAt không được trước startedAt.`);
      }
      if (!Number.isFinite(attempt.score) || attempt.score < 0 || attempt.score > 10) {
        errors.push(`attempts[${index}].score phải nằm trong khoảng 0 đến 10.`);
      }
      if (!Number.isInteger(attempt.correctCount) || attempt.correctCount < 0 ||
          !Number.isInteger(attempt.totalQuestions) || attempt.totalQuestions < 1 ||
          attempt.correctCount > attempt.totalQuestions) {
        errors.push(`attempts[${index}] có số câu đúng/tổng số câu không hợp lệ.`);
      }
      if (!Array.isArray(attempt.items) || attempt.items.length !== attempt.totalQuestions) {
        errors.push(`attempts[${index}].items phải khớp totalQuestions.`);
      } else {
        let itemCorrectCount = 0;
        const attemptQuestionIds = new Set();
        attempt.items.forEach((item, itemIndex) => {
          if (!item || typeof item !== 'object' || Array.isArray(item)) {
            errors.push(`attempts[${index}].items[${itemIndex}] phải là một object.`);
            return;
          }
          if (typeof item.questionId !== 'string' || !item.questionId.trim()) {
            errors.push(`attempts[${index}].items[${itemIndex}].questionId không hợp lệ.`);
          } else if (attemptQuestionIds.has(item.questionId)) {
            errors.push(`attempts[${index}].items có questionId bị trùng: ${item.questionId}.`);
          } else {
            attemptQuestionIds.add(item.questionId);
          }
          if (!item.questionSnapshot || typeof item.questionSnapshot !== 'object' ||
              Array.isArray(item.questionSnapshot) || typeof item.questionSnapshot.content !== 'string' ||
              !item.questionSnapshot.content.trim()) {
            errors.push(`attempts[${index}].items[${itemIndex}].questionSnapshot phải có nội dung câu hỏi.`);
          }
          if (!Array.isArray(item.optionsSnapshot) || item.optionsSnapshot.length < 2) {
            errors.push(`attempts[${index}].items[${itemIndex}].optionsSnapshot phải có ít nhất hai phương án.`);
          } else {
            const snapshotOptionIds = new Set();
            item.optionsSnapshot.forEach((option, optionIndex) => {
              if (!option || typeof option !== 'object' || Array.isArray(option) ||
                  typeof option.optionId !== 'string' || !option.optionId.trim() ||
                  typeof option.content !== 'string' || !option.content.trim()) {
                errors.push(`attempts[${index}].items[${itemIndex}].optionsSnapshot[${optionIndex}] không hợp lệ.`);
                return;
              }
              if (snapshotOptionIds.has(option.optionId)) {
                errors.push(`attempts[${index}].items[${itemIndex}].optionsSnapshot có ID trùng.`);
              }
              snapshotOptionIds.add(option.optionId);
            });
            if (Array.isArray(item.correctOptionIdsSnapshot) &&
                item.correctOptionIdsSnapshot.some(id => !snapshotOptionIds.has(id))) {
              errors.push(`attempts[${index}].items[${itemIndex}].correctOptionIdsSnapshot không tham chiếu phương án snapshot.`);
            }
            if (Array.isArray(item.correctOptionIdsSnapshot) &&
                new Set(item.correctOptionIdsSnapshot).size !== item.correctOptionIdsSnapshot.length) {
              errors.push(`attempts[${index}].items[${itemIndex}].correctOptionIdsSnapshot không được trùng ID.`);
            }
            if (Array.isArray(item.selectedOptionIds) &&
                item.selectedOptionIds.some(id => !snapshotOptionIds.has(id))) {
              errors.push(`attempts[${index}].items[${itemIndex}].selectedOptionIds không tham chiếu phương án snapshot.`);
            }
            if (Array.isArray(item.selectedOptionIds) &&
                new Set(item.selectedOptionIds).size !== item.selectedOptionIds.length) {
              errors.push(`attempts[${index}].items[${itemIndex}].selectedOptionIds không được trùng ID.`);
            }
            if (Array.isArray(item.correctOptionIdsSnapshot) && Array.isArray(item.selectedOptionIds) &&
                typeof item.isCorrect === 'boolean') {
              const correctIds = new Set(item.correctOptionIdsSnapshot);
              const selectedIds = new Set(item.selectedOptionIds);
              const expectedCorrect = correctIds.size === selectedIds.size &&
                [...correctIds].every(id => selectedIds.has(id));
              if (item.isCorrect !== expectedCorrect) {
                errors.push(`attempts[${index}].items[${itemIndex}].isCorrect không khớp các đáp án đã chọn.`);
              }
            }
          }
          if (!Array.isArray(item.correctOptionIdsSnapshot) || item.correctOptionIdsSnapshot.length === 0) {
            errors.push(`attempts[${index}].items[${itemIndex}].correctOptionIdsSnapshot phải có ít nhất một ID.`);
          }
          if (!Array.isArray(item.selectedOptionIds)) {
            errors.push(`attempts[${index}].items[${itemIndex}].selectedOptionIds phải là mảng.`);
          }
          if (typeof item.isCorrect !== 'boolean') {
            errors.push(`attempts[${index}].items[${itemIndex}].isCorrect phải là boolean.`);
          } else if (item.isCorrect) {
            itemCorrectCount++;
          }
          if (item.skillIdSnapshot !== null && item.skillIdSnapshot !== undefined &&
              !hasReference('skills', item.skillIdSnapshot)) {
            errors.push(`attempts[${index}].items[${itemIndex}].skillIdSnapshot không hợp lệ.`);
          }
          if (item.difficultyRankSnapshot !== null && item.difficultyRankSnapshot !== undefined &&
              (!Number.isInteger(item.difficultyRankSnapshot) || item.difficultyRankSnapshot < 1)) {
            errors.push(`attempts[${index}].items[${itemIndex}].difficultyRankSnapshot phải là số nguyên dương hoặc null.`);
          }
        });
        if (itemCorrectCount !== attempt.correctCount) {
          errors.push(`attempts[${index}].correctCount không khớp số item đúng.`);
        }
        if (Number.isFinite(attempt.score) && Number.isInteger(attempt.correctCount) &&
            Number.isInteger(attempt.totalQuestions) && attempt.totalQuestions > 0) {
          const expectedScore = Number(((attempt.correctCount / attempt.totalQuestions) * 10).toFixed(1));
          if (attempt.score !== expectedScore) {
            errors.push(`attempts[${index}].score không khớp correctCount/totalQuestions.`);
          }
        }
      }
    });

    database.studentProgress.forEach((progress, index) => {
      if (!progress || typeof progress !== 'object' || Array.isArray(progress)) return;
      if (!hasReference('users', progress.userId)) {
        errors.push(`studentProgress[${index}].userId không tham chiếu tài khoản hợp lệ.`);
      }
      if (!Number.isFinite(progress.currentExp) || progress.currentExp < 0) {
        errors.push(`studentProgress[${index}].currentExp phải là số không âm.`);
      }
      if (!Number.isInteger(progress.treeStage) || progress.treeStage < 1 || progress.treeStage > 4) {
        errors.push(`studentProgress[${index}].treeStage phải là số nguyên từ 1 đến 4.`);
      }
      if (!Number.isInteger(progress.streakCount) || progress.streakCount < 0) {
        errors.push(`studentProgress[${index}].streakCount phải là số nguyên không âm.`);
      }
      if (typeof progress.lastActiveDate !== 'string' || !progress.lastActiveDate.trim()) {
        errors.push(`studentProgress[${index}].lastActiveDate không được để trống.`);
      }
      if (!Number.isInteger(progress.waterProgress) || progress.waterProgress < 0 || progress.waterProgress > 4) {
        errors.push(`studentProgress[${index}].waterProgress phải là số nguyên từ 0 đến 4.`);
      }
      if (!Number.isInteger(progress.fullBucketCount) || progress.fullBucketCount < 0) {
        errors.push(`studentProgress[${index}].fullBucketCount phải là số nguyên không âm.`);
      }
      if (!Number.isInteger(progress.bucketsWatered) || progress.bucketsWatered < 0) {
        errors.push(`studentProgress[${index}].bucketsWatered phải là số nguyên không âm.`);
      }
    });

    if (errors.length > 0) throw new Error(`Database demo không hợp lệ: ${errors.join(' ')}`);
    return true;
  }

  function registerMigration(fromVersion, migration) {
    if (!Number.isInteger(fromVersion) || fromVersion < 0 || fromVersion >= schemaVersion) {
      throw new Error(`Phiên bản migration nguồn không hợp lệ: ${String(fromVersion)}.`);
    }
    if (typeof migration !== 'function') throw new Error('Migration phải là một hàm đồng bộ.');
    if (migrations.has(fromVersion)) throw new Error(`Migration từ phiên bản ${fromVersion} đã được đăng ký.`);
    migrations.set(fromVersion, migration);
  }

  migrations.set(1, database => ({
    ...database,
    schemaVersion: 2,
    users: database.users.map(user => ({
      ...user,
      classIds: user.classIds === undefined ? [] : user.classIds
    })),
    classes: []
  }));

  migrations.set(2, database => ({
    ...database,
    schemaVersion: 3,
    users: database.users.map(user => ({
      ...user,
      username: user.username || user.userId,
      password: user.password || '123',
      nickname: user.nickname || '',
      avatar: user.avatar || 'seedling'
    }))
  }));

  migrations.set(3, database => ({
    ...database,
    schemaVersion: 4,
    users: database.users.map(user => ({
      ...user,
      birthDate: user.birthDate || ''
    }))
  }));

  migrations.set(4, database => ({
    ...database,
    schemaVersion: 5,
    users: database.users.map(user => ({
      ...user,
      phone: user.phone || ''
    }))
  }));

  function migrate(database) {
    let migrated = clone(database);
    if (!Number.isInteger(migrated?.schemaVersion) || migrated.schemaVersion < 0) {
      throw new Error('Database thiếu schemaVersion hợp lệ; dữ liệu gốc được giữ nguyên.');
    }
    if (migrated.schemaVersion > schemaVersion) {
      throw new Error(
        `Phiên bản database ${migrated.schemaVersion} mới hơn phiên bản ứng dụng ${schemaVersion}; ` +
        'dữ liệu gốc được giữ nguyên.'
      );
    }

    while (migrated.schemaVersion < schemaVersion) {
      const fromVersion = migrated.schemaVersion;
      const migration = migrations.get(fromVersion);
      if (!migration) {
        throw new Error(
          `Chưa có migration từ database v${fromVersion} lên v${fromVersion + 1}; dữ liệu gốc được giữ nguyên.`
        );
      }
      const next = migration(clone(migrated));
      if (!next || typeof next !== 'object' || Array.isArray(next) ||
          next.schemaVersion !== fromVersion + 1) {
        throw new Error(`Migration từ v${fromVersion} phải trả về database v${fromVersion + 1}.`);
      }
      migrated = clone(next);
    }

    validate(migrated);
    return migrated;
  }

  function persistMigration(original, migrated) {
    const backupKey = `${storageKey}_backup_v${original.schemaVersion}`;
    try {
      if (window.localStorage.getItem(backupKey) === null) {
        window.localStorage.setItem(backupKey, JSON.stringify(original));
      }
      window.localStorage.setItem(storageKey, JSON.stringify(migrated));
    } catch (error) {
      throw new Error(`Không thể lưu database sau migration; bản gốc được giữ nếu chưa ghi đè: ${error.message}`);
    }
  }

  function read() {
    let serialized;
    try {
      serialized = window.localStorage.getItem(storageKey);
    } catch (error) {
      throw new Error(`Không thể đọc database demo từ localStorage: ${error.message}`);
    }
    if (serialized === null) return createEmptyDatabase();

    let database;
    try {
      database = JSON.parse(serialized);
    } catch (error) {
      throw new Error(`Database demo không phải JSON hợp lệ: ${error.message}`);
    }
    const migratedDatabase = migrate(database);
    if (migratedDatabase.schemaVersion !== database.schemaVersion) {
      persistMigration(database, migratedDatabase);
    }
    return clone(migratedDatabase);
  }

  function write(database) {
    const snapshot = clone(database);
    validate(snapshot);
    let serialized;
    try {
      serialized = JSON.stringify(snapshot);
      window.localStorage.setItem(storageKey, serialized);
    } catch (error) {
      throw new Error(`Không thể ghi database demo vào localStorage: ${error.message}`);
    }
    return clone(snapshot);
  }

  function normalizeSeedUsers(users) {
    if (!Array.isArray(users)) throw new Error('data/users.json phải chứa một mảng tài khoản.');
    return users.map((user, index) => {
      if (!user || typeof user !== 'object' || Array.isArray(user)) {
        throw new Error(`data/users.json[${index}] phải là một object.`);
      }
      if (user.classIds !== undefined && !Array.isArray(user.classIds)) {
        throw new Error(`data/users.json[${index}].classIds phải là một mảng.`);
      }
      return {
        userId: user.userId,
        username: user.username || user.userId,
        password: user.password || '123',
        fullName: user.fullName,
        nickname: user.nickname || '',
        avatar: user.avatar || 'seedling',
        birthDate: user.birthDate || '',
        phone: user.phone || '',
        role: user.role,
        status: user.status || 'active',
        classIds: user.classIds ? [...user.classIds] : []
      };
    });
  }

  function normalizeSeedQuestions(questions) {
    if (!Array.isArray(questions)) throw new Error('data/questions.json phải chứa một mảng câu hỏi.');

    const topicIds = new Map();
    const difficultyByLabel = new Map([
      ['easy', { difficultyId: 'difficulty_easy', label: 'Easy', rank: 1, status: 'active' }],
      ['medium', { difficultyId: 'difficulty_medium', label: 'Medium', rank: 2, status: 'active' }],
      ['hard', { difficultyId: 'difficulty_hard', label: 'Hard', rank: 3, status: 'active' }]
    ]);
    const subjects = [];
    const skills = [];
    const normalizedQuestions = [];
    const quizzesByLegacyGroup = new Map();

    questions.forEach((question, index) => {
      if (!question || typeof question !== 'object' || Array.isArray(question)) {
        throw new Error(`data/questions.json[${index}] phải là một object.`);
      }
      const topic = typeof question.topic === 'string' ? question.topic.trim() : '';
      if (!topic) throw new Error(`data/questions.json[${index}].topic không được để trống.`);

      let subject = topicIds.get(topic);
      if (!subject) {
        const subjectId = `subject_${topicIds.size + 1}`;
        const skillId = `skill_${topicIds.size + 1}_general`;
        subject = { subjectId, skillId, name: topic };
        topicIds.set(topic, subject);
        subjects.push({ subjectId, name: topic, status: 'active' });
        skills.push({
          skillId,
          subjectId,
          name: 'Kiến thức tổng hợp',
          status: 'active'
        });
      }

      const difficultyLabel = typeof question.difficulty === 'string' ? question.difficulty.trim() : '';
      const difficulty = difficultyByLabel.get(difficultyLabel.toLocaleLowerCase());
      if (!difficulty) {
        throw new Error(`data/questions.json[${index}] có độ khó chưa hỗ trợ: ${difficultyLabel || '(trống)'}.`);
      }
      if (typeof question.id !== 'string' || !question.id.trim()) {
        throw new Error(`data/questions.json[${index}].id phải là chuỗi không rỗng.`);
      }
      if (!Array.isArray(question.options) || question.options.length < 2) {
        throw new Error(`data/questions.json[${index}].options phải có ít nhất hai phương án.`);
      }
      const correctAnswer = Array.isArray(question.correctAnswer)
        ? question.correctAnswer
        : [question.correctAnswer];
      if (correctAnswer.length === 0 || correctAnswer.some(answer =>
        !Number.isInteger(answer) || answer < 0 || answer >= question.options.length
      )) {
        throw new Error(`data/questions.json[${index}].correctAnswer chứa chỉ số phương án không hợp lệ.`);
      }

      const normalizedQuestion = {
        questionId: question.id,
        subjectId: subject.subjectId,
        skillId: subject.skillId,
        difficultyId: difficulty.difficultyId,
        type: question.type === 'multiple' ? 'multiple' : 'single',
        content: question.question,
        options: question.options.map((content, optionIndex) => ({
          optionId: `option_${question.id}_${optionIndex + 1}`,
          content
        })),
        correctOptionIds: correctAnswer.map(answer => `option_${question.id}_${answer + 1}`),
        explanation: question.explanation || '',
        status: 'active'
      };
      normalizedQuestions.push(normalizedQuestion);

      const groupName = typeof question.subTopic === 'string' && question.subTopic.trim()
        ? question.subTopic.trim()
        : `${topic} - Câu hỏi mẫu`;
      const groupKey = `${subject.subjectId}\u0000${groupName}`;
      let quiz = quizzesByLegacyGroup.get(groupKey);
      if (!quiz) {
        quiz = {
          quizId: `quiz_seed_${quizzesByLegacyGroup.size + 1}`,
          subjectId: subject.subjectId,
          title: groupName,
          timeLimitMinutes: 15,
          status: 'active',
          questionIds: []
        };
        quizzesByLegacyGroup.set(groupKey, quiz);
      }
      quiz.questionIds.push(normalizedQuestion.questionId);
    });

    return {
      subjects,
      skills,
      difficulties: Array.from(difficultyByLabel.values()),
      questions: normalizedQuestions,
      quizzes: Array.from(quizzesByLegacyGroup.values())
    };
  }

  async function initializeFromJson({
    usersUrl = './data/users.json',
    questionsUrl = './data/questions.json'
  } = {}) {
    const currentDatabase = read();
    if (window.localStorage.getItem(storageKey) !== null) {
      return { initialized: false, database: currentDatabase };
    }

    const responses = await Promise.all([fetch(usersUrl), fetch(questionsUrl)]);
    const urls = [usersUrl, questionsUrl];
    responses.forEach((response, index) => {
      if (!response.ok) {
        throw new Error(`Không thể tải ${urls[index]} (HTTP ${response.status}).`);
      }
    });

    const [seedUsers, seedQuestions] = await Promise.all(responses.map(response => response.json()));
    const normalized = normalizeSeedQuestions(seedQuestions);
    const database = createEmptyDatabase();
    database.users = normalizeSeedUsers(seedUsers);
    database.subjects = normalized.subjects;
    database.skills = normalized.skills;
    database.difficulties = normalized.difficulties;
    database.questions = normalized.questions;
    database.quizzes = normalized.quizzes;
    validate(database);

    if (window.localStorage.getItem(storageKey) !== null) {
      return { initialized: false, database: read() };
    }
    return { initialized: true, database: write(database) };
  }

  function mergeSampleRecords(database, collection, records, idField, { preserveExisting = false } = {}) {
    records.forEach(record => {
      const existing = database[collection].find(item => item[idField] === record[idField]);
      if (!existing) database[collection].push(clone(record));
      else if (!preserveExisting && JSON.stringify(existing) !== JSON.stringify(record)) {
        throw new Error(`Bộ dữ liệu demo xung đột ${collection}.${idField}=${record[idField]}; dữ liệu hiện có được giữ nguyên.`);
      }
    });
  }

  function applyStudentProgressUpdates(database, updates, sampleProgress, samplePackUrl) {
    updates.forEach(progressUpdate => {
      if (!progressUpdate || typeof progressUpdate.userId !== 'string' ||
          !Number.isInteger(progressUpdate.waterProgress) ||
          progressUpdate.waterProgress < 0 || progressUpdate.waterProgress > 4) {
        throw new Error(`${samplePackUrl}.studentProgressUpdates chứa cập nhật tiến độ không hợp lệ.`);
      }
      if (!database.users.some(user => user.userId === progressUpdate.userId)) {
        throw new Error(`${samplePackUrl}.studentProgressUpdates không tìm thấy học viên ${progressUpdate.userId}.`);
      }
      let progress = database.studentProgress.find(item => item.userId === progressUpdate.userId);
      if (!progress) {
        const sampleRecord = sampleProgress.find(item => item.userId === progressUpdate.userId);
        if (!sampleRecord) {
          throw new Error(`${samplePackUrl}.studentProgressUpdates không tìm thấy dữ liệu mẫu của ${progressUpdate.userId}.`);
        }
        progress = clone({
          ...sampleRecord,
          lastActiveDate: new Date().toISOString().slice(0, 10)
        });
        database.studentProgress.push(progress);
      }
      progress.waterProgress = progressUpdate.waterProgress;
    });
  }

  function isCorruptedDemoText(value) {
    return typeof value === 'string' &&
      (/[?\uFFFD]/.test(value) || /(?:Ã.|Â.|áº|á»|â€)/.test(value));
  }

  function createSampleAttempt(scenario, database) {
    const quiz = database.quizzes.find(item => item.quizId === scenario.quizId);
    const user = database.users.find(item => item.userId === scenario.userId);
    if (!quiz) throw new Error(`Lượt làm mẫu tham chiếu đề không tồn tại: ${scenario.quizId}.`);
    if (!user) throw new Error(`Lượt làm mẫu tham chiếu tài khoản không tồn tại: ${scenario.userId}.`);
    if (!Array.isArray(scenario.selectedOptionIndexes) ||
        scenario.selectedOptionIndexes.length !== quiz.questionIds.length) {
      throw new Error(`Lượt làm mẫu ${scenario.attemptId} phải có đáp án cho toàn bộ câu hỏi.`);
    }

    const questionsById = new Map(database.questions.map(question => [question.questionId, question]));
    const difficultyRanks = new Map(database.difficulties.map(item => [item.difficultyId, item.rank]));
    const items = quiz.questionIds.map((questionId, index) => {
      const question = questionsById.get(questionId);
      const selectedIndex = scenario.selectedOptionIndexes[index];
      const selectedIndexes = question?.type === 'multiple'
        ? (Array.isArray(selectedIndex) ? selectedIndex : [selectedIndex])
        : [selectedIndex];
      if (!question || (question.type === 'single' && Array.isArray(selectedIndex)) ||
          selectedIndexes.length === 0 || selectedIndexes.some(optionIndex =>
            !Number.isInteger(optionIndex) || optionIndex < 0 || optionIndex >= question.options.length
          )) {
        throw new Error(`Lượt làm mẫu ${scenario.attemptId} có câu hỏi hoặc lựa chọn không hợp lệ.`);
      }
      const selectedOptionIds = selectedIndexes.map(optionIndex => question.options[optionIndex].optionId);
      const correctIds = new Set(question.correctOptionIds);
      const selectedIds = new Set(selectedOptionIds);
      const isCorrect = correctIds.size === selectedIds.size &&
        [...correctIds].every(optionId => selectedIds.has(optionId));
      return {
        questionId,
        questionSnapshot: {
          content: question.content,
          legacyOptionCount: question.options.length
        },
        optionsSnapshot: question.options.map((option, optionIndex) => ({
          optionId: option.optionId,
          content: option.content,
          legacyIndex: optionIndex
        })),
        correctOptionIdsSnapshot: [...question.correctOptionIds],
        selectedOptionIds,
        isCorrect,
        skillIdSnapshot: question.skillId,
        difficultyRankSnapshot: difficultyRanks.get(question.difficultyId) || null
      };
    });
    const completedAtDate = new Date(Date.now() - scenario.daysAgo * 24 * 60 * 60 * 1000);
    const completedAt = completedAtDate.toISOString();
    const startedAt = new Date(completedAtDate.getTime() - 15 * 60 * 1000).toISOString();
    const correctCount = items.filter(item => item.isCorrect).length;
    const subject = database.subjects.find(item => item.subjectId === quiz.subjectId);
    return {
      attemptId: scenario.attemptId,
      userId: scenario.userId,
      quizId: quiz.quizId,
      mode: scenario.mode,
      startedAt,
      completedAt,
      timestamp: completedAtDate.toLocaleString('vi-VN'),
      username: user.fullName,
      ownerUsername: user.userId,
      quizTitle: quiz.title,
      topic: subject?.name || 'Chung',
      score: Number(((correctCount / items.length) * 10).toFixed(1)),
      correctCount,
      totalQuestions: items.length,
      items
    };
  }

  async function importDemoSamplePack({ samplePackUrl = './data/demo-sample-pack.json' } = {}) {
    const markerKey = `${storageKey}_sample_pack_version`;
    const currentVersion = Number(window.localStorage.getItem(markerKey) || 0);
    const database = read();
    if (Number.isInteger(currentVersion) && currentVersion >= 9) {
      return { imported: false, database };
    }

    const response = await fetch(samplePackUrl);
    if (!response.ok) {
      throw new Error(`Không thể tải ${samplePackUrl} (HTTP ${response.status}).`);
    }
    const samplePack = await response.json();
    if (!samplePack || ![1, 2, 3, 4, 5, 6, 7, 8, 9].includes(samplePack.version)) {
      throw new Error(`${samplePackUrl} phải có version từ 1 đến 9.`);
    }
    const requiredCollections = ['subjects', 'skills', 'questions', 'quizzes', 'attemptScenarios', 'studentProgress'];
    if (samplePack.version >= 2) requiredCollections.push('classes', 'users');
    if (samplePack.version >= 8) requiredCollections.push('studentProgressUpdates');
    requiredCollections
      .forEach(collection => {
        if (!Array.isArray(samplePack[collection])) {
          throw new Error(`${samplePackUrl}.${collection} phải là một mảng.`);
        }
      });
    if (samplePack.version >= 9) {
      const incrementalUpdates = samplePack.incrementalUpdates;
      if (!incrementalUpdates ||
          !Array.isArray(incrementalUpdates.questionIds) ||
          !Array.isArray(incrementalUpdates.quizIds)) {
        throw new Error(`${samplePackUrl}.incrementalUpdates phải chứa questionIds và quizIds.`);
      }
      incrementalUpdates.questionIds.forEach(questionId => {
        if (!samplePack.questions.some(item => item.questionId === questionId)) {
          throw new Error(`${samplePackUrl}.incrementalUpdates tham chiếu câu hỏi không tồn tại: ${questionId}.`);
        }
      });
      incrementalUpdates.quizIds.forEach(quizId => {
        if (!samplePack.quizzes.some(item => item.quizId === quizId)) {
          throw new Error(`${samplePackUrl}.incrementalUpdates tham chiếu đề không tồn tại: ${quizId}.`);
        }
      });
    }

    if (currentVersion >= 7 && samplePack.version >= 8) {
      const updatedDatabase = update(draft => {
        applyStudentProgressUpdates(
          draft,
          samplePack.studentProgressUpdates,
          samplePack.studentProgress,
          samplePackUrl
        );
        if (samplePack.version >= 9) {
          const incrementalUpdates = samplePack.incrementalUpdates;
          incrementalUpdates.questionIds.forEach(questionId => {
            const question = samplePack.questions.find(item => item.questionId === questionId);
            mergeSampleRecords(draft, 'questions', [question], 'questionId');
          });
          incrementalUpdates.quizIds.forEach(quizId => {
            const quiz = samplePack.quizzes.find(item => item.quizId === quizId);
            mergeSampleRecords(draft, 'quizzes', [quiz], 'quizId');
          });
        }
      });
      try {
        window.localStorage.setItem(markerKey, String(samplePack.version));
      } catch (error) {
        throw new Error(`Đã cập nhật tiến độ mẫu nhưng không thể lưu dấu phiên bản: ${error.message}`);
      }
      return { imported: true, database: updatedDatabase };
    }

    const updatedDatabase = update(draft => {
      const preserveExisting = samplePack.version >= 3;
      if (samplePack.version >= 2) {
        mergeSampleRecords(draft, 'classes', samplePack.classes, 'classId', { preserveExisting });
        mergeSampleRecords(draft, 'users', samplePack.users, 'userId', { preserveExisting });
      }
      mergeSampleRecords(draft, 'subjects', samplePack.subjects, 'subjectId', { preserveExisting });
      mergeSampleRecords(draft, 'skills', samplePack.skills, 'skillId', { preserveExisting });
      mergeSampleRecords(draft, 'questions', samplePack.questions, 'questionId', { preserveExisting });
      mergeSampleRecords(draft, 'quizzes', samplePack.quizzes, 'quizId', { preserveExisting });
      if (samplePack.version >= 5) {
        const sampleTitles = new Map(samplePack.quizzes.map(quiz => [quiz.quizId, quiz.title]));
        draft.quizzes.forEach(quiz => {
          const sampleTitle = sampleTitles.get(quiz.quizId);
          if (sampleTitle && isCorruptedDemoText(quiz.title)) {
            quiz.title = sampleTitle;
          }
        });
        if (samplePack.version >= 7) {
          draft.attempts.forEach(attempt => {
            const sampleTitle = sampleTitles.get(attempt.quizId);
            if (sampleTitle && isCorruptedDemoText(attempt.quizTitle)) {
              attempt.quizTitle = sampleTitle;
            }
          });
        }
      }
      samplePack.attemptScenarios.forEach(scenario => {
        if (!draft.attempts.some(item => item.attemptId === scenario.attemptId)) {
          draft.attempts.push(createSampleAttempt(scenario, draft));
        }
      });
      if (samplePack.version >= 6) {
        const demo = samplePack.perfectAttemptDemo;
        if (!demo || typeof demo.userId !== 'string' || !Number.isInteger(demo.attemptCount) ||
            demo.attemptCount < 1 || typeof demo.quizId !== 'string') {
          throw new Error(`${samplePackUrl}.perfectAttemptDemo không hợp lệ.`);
        }
        const user = draft.users.find(item => item.userId === demo.userId && item.role === 'student');
        const quiz = draft.quizzes.find(item => item.quizId === demo.quizId);
        if (!user || !quiz || quiz.maxAttempts !== null ||
            !Array.isArray(quiz.assignedStudentIds) || !quiz.assignedStudentIds.includes(user.userId)) {
          throw new Error(`${samplePackUrl}.perfectAttemptDemo phải tham chiếu học viên và đề được giao không giới hạn lượt.`);
        }
        const questionsById = new Map(draft.questions.map(question => [question.questionId, question]));
        const selectedOptionIndexes = quiz.questionIds.map(questionId => {
          const question = questionsById.get(questionId);
          if (!question) throw new Error(`Đề ${quiz.quizId} tham chiếu câu hỏi không tồn tại: ${questionId}.`);
          return question.correctOptionIds.map(optionId =>
            question.options.findIndex(option => option.optionId === optionId)
          );
        }).map((indexes, index) => {
          const question = questionsById.get(quiz.questionIds[index]);
          if (indexes.some(optionIndex => optionIndex < 0)) {
            throw new Error(`Câu hỏi ${question.questionId} có đáp án đúng không hợp lệ.`);
          }
          return question.type === 'multiple' ? indexes : indexes[0];
        });
        for (let index = 1; index <= demo.attemptCount; index += 1) {
          const attemptId = `attempt_demo_perfect_${demo.userId}_${String(index).padStart(3, '0')}`;
          if (draft.attempts.some(item => item.attemptId === attemptId)) continue;
          draft.attempts.push(createSampleAttempt({
            attemptId,
            userId: user.userId,
            quizId: quiz.quizId,
            mode: 'EXAM',
            daysAgo: index,
            selectedOptionIndexes
          }, draft));
        }
      }
      if (samplePack.version >= 3) {
        const retainedSubjectIds = new Set([
          'subject_math_grade_3',
          'subject_math_grade_4',
          'subject_math_grade_5'
        ]);
        const replacedDemoQuizIds = new Set([
          'quiz_math_grade_3',
          'quiz_math_grade_4',
          'quiz_math_grade_5'
        ]);
        const retainedSkillIds = new Set(
          draft.skills.filter(skill => retainedSubjectIds.has(skill.subjectId)).map(skill => skill.skillId)
        );
        const retainedQuestionIds = new Set(
          draft.questions.filter(question => retainedSubjectIds.has(question.subjectId)).map(question => question.questionId)
        );
        const retainedQuizIds = new Set(
          draft.quizzes.filter(quiz =>
            retainedSubjectIds.has(quiz.subjectId) && !replacedDemoQuizIds.has(quiz.quizId)
          ).map(quiz => quiz.quizId)
        );
        draft.subjects = draft.subjects.filter(subject => retainedSubjectIds.has(subject.subjectId));
        draft.skills = draft.skills.filter(skill => retainedSkillIds.has(skill.skillId));
        draft.questions = draft.questions.filter(question => retainedQuestionIds.has(question.questionId));
        draft.quizzes = draft.quizzes.filter(quiz => retainedQuizIds.has(quiz.quizId));
        draft.attempts = draft.attempts.filter(attempt =>
          retainedQuizIds.has(attempt.quizId) &&
          attempt.items.every(item =>
            retainedQuestionIds.has(item.questionId) &&
            (item.skillIdSnapshot == null || retainedSkillIds.has(item.skillIdSnapshot))
          )
        );
      }
      samplePack.studentProgress.forEach(progress => {
        if (!draft.studentProgress.some(item => item.userId === progress.userId)) {
          draft.studentProgress.push(clone({
            ...progress,
            lastActiveDate: new Date().toISOString().slice(0, 10)
          }));
        }
      });
      if (samplePack.version >= 8) {
        applyStudentProgressUpdates(
          draft,
          samplePack.studentProgressUpdates,
          samplePack.studentProgress,
          samplePackUrl
        );
      }
      return draft;
    });

    try {
      window.localStorage.setItem(markerKey, String(samplePack.version));
    } catch (error) {
      throw new Error(`Đã nhập dữ liệu demo nhưng không thể lưu dấu phiên bản: ${error.message}`);
    }
    return { imported: true, database: updatedDatabase };
  }

  function update(mutator) {
    if (typeof mutator !== 'function') throw new Error('update cần một hàm mutator.');
    const draft = read();
    const result = mutator(draft);
    if (result && typeof result.then === 'function') {
      throw new Error('Mutator của database phải đồng bộ; không được trả về Promise.');
    }
    return write(result === undefined ? draft : result);
  }

  return Object.freeze({
    storageKey,
    schemaVersion,
    createEmptyDatabase,
    validate,
    registerMigration,
    migrate,
    read,
    write,
    initializeFromJson,
    importDemoSamplePack,
    update
  });
})();
