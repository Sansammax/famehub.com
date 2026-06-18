export const SYSTEM_CHATS = `You are FameHub AI, a helpful, context-aware learning assistant for students and teachers. 
You can answer course-related questions, explain complex concepts simply, guide students step-by-step to solve problems, recommend study resources, discuss the syllabus, and explain course assignments.`;

export const QUIZ_GENERATION = `Generate a educational quiz based on the following text. 
Return ONLY a JSON object containing a "questions" array. Do not wrap in markdown or backticks (no \`\`\`json).
Schema for each question in the array:
{
  "questionText": "Question string",
  "type": "mcq" | "multi" | "truefalse" | "fillblank" | "shortanswer",
  "options": ["Option 1", "Option 2", ...], (only for mcq, multi, truefalse; for truefalse it must be exactly ["True", "False"])
  "correctAnswers": [0], (array of indices of correct options; for truefalse: [0] for True, [1] for False; for fillblank: array of acceptable string answers; for shortanswer: leave empty)
  "marks": 10
}
Text to extract quiz from:
`;

export const EVALUATE_ASSIGNMENT = `Evaluate the student submission.
Compare the student's submission against the assignment description.
Return ONLY a JSON object structured exactly as follows. Do not wrap in backticks or markdown:
{
  "feedback": "Overall constructive review feedback text",
  "suggestedMarks": 85,
  "plagiarismScore": 0.05,
  "weakSections": ["Section A", "Section B"]
}
Assignment Description: {assignmentDescription}
Max Marks: {maxMarks}
Student Submission: {studentSubmission}
`;

export const RECOMMENDATIONS = `Analyze this student's performance metrics:
- Attendance rate: {attendanceRate}%
- Avg Quiz score: {avgQuizScore}%
- Avg Assignment score: {avgAssignmentScore}%
- Course completion: {completionRate}%

Return ONLY a JSON object structured exactly as follows. Do not wrap in backticks or markdown:
{
  "weakTopics": ["Topic 1", "Topic 2"],
  "nextLessons": ["Lesson 1", "Lesson 2"],
  "practiceQuizzes": ["Practice Quiz Topic"],
  "schedule": "Detailed suggested study schedule timeline"
}
`;

export const LECTURE_SUMMARY = `Summarize the following lecture transcript.
Return ONLY a JSON object structured exactly as follows. Do not wrap in backticks or markdown:
{
  "summary": "Detailed high level overview paragraph",
  "concepts": ["Key Concept 1", "Key Concept 2"],
  "questions": ["Important exam question 1", "Important exam question 2"],
  "notes": "Detailed study and revision notes in markdown format"
}
Lecture Transcript:
`;

export const ANALYTICS_INSIGHTS = `Predict student dropout risk, dropouts probability, course popularity, teacher engagement, and performance forecasting.
Return a structured JSON containing:
{
  "studentRisk": [{"email": "student@famehub.edu", "risk": "High", "probability": 0.85, "reason": "Low attendance and poor quiz scores"}],
  "popularCourses": [{"title": "Advanced Mathematics 101", "enrollments": 14, "trend": "Growing"}],
  "engagement": {"teacherClasses": 24, "hours": 36},
  "forecasting": "Summary of upcoming performance predictions"
}
`;
