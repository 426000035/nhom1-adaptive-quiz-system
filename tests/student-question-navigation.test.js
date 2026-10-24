const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.join(__dirname, '..');
const template = fs.readFileSync(path.join(root, 'views', 'student', 'quiz.html'), 'utf8');
const script = fs.readFileSync(path.join(root, 'js', 'features', 'student', 'student-view.js'), 'utf8');
const componentStyles = fs.readFileSync(path.join(root, 'css', 'components.css'), 'utf8');
const responsiveStyles = fs.readFileSync(path.join(root, 'css', 'responsive.css'), 'utf8');

test('student quiz places an accessible question navigator beside the question card', () => {
  assert.match(template, /class="quiz-question-layout"[\s\S]*class="question-card"[\s\S]*<aside class="question-navigation-card"/);
  assert.match(template, /id="question-navigation" class="question-number-grid" aria-label="Chọn câu hỏi"/);
  assert.match(template, /id="question-navigation-progress"[^>]*aria-live="polite"/);
});

test('previous and next controls appear directly below the question options', () => {
  assert.match(template, /id="options-container"[\s\S]*<nav class="question-step-navigation"[\s\S]*id="btn-prev-question"[\s\S]*id="btn-next-question"/);
  assert.doesNotMatch(template, /class="quiz-action-bar"[\s\S]*id="btn-(?:prev|next)-question"/);
  assert.match(template, /class="quiz-action-bar"[\s\S]*id="btn-exit-quiz"[\s\S]*id="btn-submit-quiz"/);
});

test('manual submission asks for confirmation and warns when questions are unanswered', () => {
  assert.match(script, /getElementById\('btn-submit-quiz'\)\?\.addEventListener\('click', confirmQuizSubmission\)/);
  assert.match(script, /async function confirmQuizSubmission\(\)/);
  assert.match(script, /const unansweredCount = questions\.filter\([\s\S]*selectedAnswers\.length === 0/);
  assert.match(script, /Còn \$\{unansweredCount\} câu chưa trả lời/);
  assert.match(script, /confirmButtonText: hasUnansweredQuestions \? 'Vẫn nộp bài' : 'Nộp bài'/);
  assert.match(script, /cancelButtonText: hasUnansweredQuestions \? 'Làm tiếp' : 'Kiểm tra lại'/);
  assert.match(script, /if \(confirmation\.isConfirmed\) finishAndEvaluateQuiz\(\)/);
});

test('left and right arrows change questions while up and down arrows move through answers', () => {
  assert.match(script, /document\.addEventListener\?\.?\('keydown', \(event\) => \{[\s\S]*\['ArrowLeft', 'ArrowRight'\]\.includes\(event\.key\)[\s\S]*getElementById\('view-quiz'\)\?\.classList\.contains\('hidden'\)[\s\S]*renderCurrentQuestion\(true\)/);
  assert.match(script, /event\.target\.closest\('input:not\(\[type="radio"\]\):not\(\[type="checkbox"\]\), textarea, select, \[contenteditable="true"\]'\)/);
  assert.match(script, /getElementById\('options-container'\)\?\.addEventListener\('keydown'/);
  assert.match(script, /const answerInputs = Array\.from\(optionsContainer\.querySelectorAll\('input:not\(:disabled\)'\)\)/);
  assert.match(script, /const direction = event\.key === 'ArrowRight' \? 1 : -1/);
  assert.match(script, /\['ArrowUp', 'ArrowDown'\]\.includes\(event\.key\)/);
  assert.match(script, /const direction = event\.key === 'ArrowDown' \? 1 : -1/);
  assert.match(script, /answerInputs\[nextIndex\]\.focus\(\)/);
  assert.match(script, /event\.key !== 'Enter' \|\| event\.repeat/);
  assert.match(script, /answerInputs\[activeIndex\]\.click\(\)/);
  assert.match(script, /window\.AppState\.currentQuestionIndex\+\+;[\s\S]*renderCurrentQuestion\(true\);[\s\S]*querySelector\('#options-container input:not\(:disabled\)'\)\?\.focus\(\)/);
});

test('question navigator reflects answer state and supports direct navigation', () => {
  assert.match(script, /questionIndex === currentIndex[\s\S]*button\.setAttribute\('aria-current', 'step'\)/);
  assert.match(script, /isAnswered \? ', đã trả lời' : ', chưa trả lời'/);
  assert.match(script, /navigationProgress\.textContent = `\$\{answeredCount\}\/\$\{qList\.length\} đã trả lời`/);
  assert.match(script, /window\.AppState\.currentQuestionIndex = targetIndex;[\s\S]*window\.AppState\.questionNavigationPage = Math\.floor\(targetIndex \/ QUESTION_NAVIGATION_PAGE_SIZE\);[\s\S]*renderCurrentQuestion\(true\)/);
});

test('quiz progress is calculated from answered questions, not the current question index', () => {
  assert.match(script, /const answeredCount = qList\.reduce\([\s\S]*Array\.isArray\(savedAnswers\) && savedAnswers\.length > 0/);
  assert.match(script, /Math\.round\(\(answeredCount \/ qList\.length\) \* 100\)/);
  assert.doesNotMatch(script, /Math\.round\(\(\(idx \+ 1\) \/ qList\.length\) \* 100\)/);
});

test('practice mode shows a circular score that advances only for correct answers', () => {
  assert.match(template, /id="practice-score"[^>]*role="img"[^>]*hidden/);
  assert.match(template, /id="practice-score-ring-fill"[^>]*stroke-dashoffset="100"/);
  assert.match(template, /Mỗi câu đúng \+1 điểm/);
  assert.match(script, /const correctCount = qList\.reduce\([\s\S]*savedAnswers\.length === correctAnswers\.length[\s\S]*savedAnswers\.every\(answer => correctAnswers\.includes\(answer\)\)/);
  assert.match(script, /practiceScore\.hidden = !isPracticeMode/);
  assert.match(script, /practiceScoreValue\.textContent = `\$\{correctCount\}\/\$\{qList\.length\}`/);
  assert.match(script, /practiceScoreRing\.setAttribute\('stroke-dashoffset', String\(100 - scoreProgress\)\)/);
  assert.match(componentStyles, /\.practice-score-ring-fill\s*\{[^}]*stroke:\s*var\(--success\)/s);
  assert.match(componentStyles, /transition:\s*stroke-dashoffset var\(--transition-normal\)/);
  assert.match(componentStyles, /\.practice-score-meter\s*\{[^}]*4\.5rem/s);
});

test('practice multiple-choice answers remain editable until explicit grading', () => {
  assert.match(script, /const isPracticeMultiSelect = isPracticeMode && q\.type !== 'single'/);
  assert.match(script, /window\.AppState\.practiceDraftAnswers\[q\.id\] = selectedIndices;\s*renderCurrentQuestion\(\);\s*return;/);
  assert.match(script, /checkAnswerButton\.textContent = '✓'/);
  assert.match(script, /checkAnswerButton\.setAttribute\('aria-label', 'Kiểm tra đáp án'\)/);
  assert.match(script, /checkAnswerButton\.disabled = draftAnswers\.length === 0/);
  assert.match(script, /window\.QuizEngine\.recordAnswer\(q\.id, selectedIndices\)[\s\S]*delete window\.AppState\.practiceDraftAnswers\[q\.id\]/);
  assert.match(script, /window\.MascotEngine\?\.recordAnswer\?\.\(isCorrect\)/);
  assert.match(script, /insertBefore\(explanationBox, stepNavigation \|\| null\)/);
  assert.match(componentStyles, /\.practice-check-answer\s*\{[^}]*width:\s*2\.5rem/s);
});

test('practice navigation indicates correct and incorrect answers with text and semantic colors', () => {
  assert.match(script, /savedAnswers\.length === correctAnswers\.length/);
  assert.match(script, /savedAnswers\.every\(answer => correctAnswers\.includes\(answer\)\)/);
  assert.match(script, /if \(isPracticeMode\) button\.classList\.add\(isCorrect \? 'is-correct' : 'is-incorrect'\)/);
  assert.match(script, /isPracticeMode && isAnswered[\s\S]*trả lời đúng[\s\S]*trả lời sai/);
  assert.doesNotMatch(template, /question-navigation-legend|question-navigation-(?:correct|incorrect)-legend/);
  assert.match(componentStyles, /\.question-number-button\.is-correct:not\(\.is-current\)[\s\S]*var\(--success-soft\)/);
  assert.match(componentStyles, /\.question-number-button\.is-incorrect:not\(\.is-current\)[\s\S]*var\(--danger-soft\)/);
});

test('question navigator has a side-by-side desktop layout and stacks on mobile', () => {
  assert.match(componentStyles, /\.quiz-question-layout\s*\{[^}]*grid-template-columns:\s*minmax\(0,\s*1fr\)\s+18rem/s);
  assert.match(responsiveStyles, /@media screen and \(max-width: 768px\)[\s\S]*\.quiz-question-layout\s*\{[^}]*grid-template-columns:\s*minmax\(0,\s*1fr\)/s);
});

test('question navigator paginates in groups of at most 30 questions', () => {
  assert.match(script, /const QUESTION_NAVIGATION_PAGE_SIZE = 30/);
  assert.match(script, /Math\.ceil\(qList\.length \/ QUESTION_NAVIGATION_PAGE_SIZE\)/);
  assert.match(script, /const pageStart = page \* QUESTION_NAVIGATION_PAGE_SIZE/);
  assert.match(script, /const pageEnd = Math\.min\(pageStart \+ QUESTION_NAVIGATION_PAGE_SIZE, qList\.length\)/);
  assert.match(script, /questionIndex < pageStart \|\| questionIndex >= pageEnd/);
  assert.match(template, /id="question-navigation-pagination"/);
  assert.match(template, /id="question-navigation-page-status"/);
  assert.match(script, /pageStatus\.textContent = `Trang \$\{page \+ 1\} \/ \$\{pageCount \|\| 1\}`/);
});
