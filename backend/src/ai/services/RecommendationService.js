import { chat, getProviderName } from '../providers/index.js';
import { AIRecommendations, AIMetrics, Attendance, QuizAttempt, AssignmentSubmission, CourseEnrollment, User } from '../../../models/index.js';
import { RECOMMENDATIONS } from '../prompts/templates.js';
import { logger } from '../../../utils/logger.js';

export class RecommendationService {
  static async getRecommendations(studentId, options = {}) {
    const studentUser = await User.findByPk(studentId);
    const userEmail = studentUser ? studentUser.email : '';

    const [enrollments, submissions, attempts, attendance] = await Promise.all([
      CourseEnrollment.count({ where: { studentId } }),
      AssignmentSubmission.count({ where: { studentId } }),
      QuizAttempt.count({ where: { studentId, status: 'submitted' } }),
      Attendance.count({ where: { userEmail } })
    ]);

    const gradedSubs = await AssignmentSubmission.findAll({
      where: { studentId, status: 'graded' },
      attributes: ['marks']
    });
    const avgAssignmentScore = gradedSubs.length
      ? Math.round(gradedSubs.reduce((sum, s) => sum + (s.marks || 0), 0) / gradedSubs.length)
      : 75;

    const passedAttempts = await QuizAttempt.count({ where: { studentId, passed: true } });
    const totalAttempts = await QuizAttempt.count({ where: { studentId } });
    const avgQuizScore = totalAttempts ? Math.round((passedAttempts / totalAttempts) * 100) : 80;

    const completionRate = enrollments ? Math.min(100, Math.round((submissions / (enrollments * 2)) * 100)) : 50;
    const attendanceRate = enrollments ? Math.min(100, Math.round((attendance / (enrollments * 5)) * 100)) : 85;

    const prompt = RECOMMENDATIONS
      .replace('{attendanceRate}', attendanceRate)
      .replace('{avgQuizScore}', avgQuizScore)
      .replace('{avgAssignmentScore}', avgAssignmentScore)
      .replace('{completionRate}', completionRate);

    const messages = [{ role: 'user', content: prompt }];

    try {
      const responseText = await chat(messages, { ...options, temperature: 0.4 });

      let recData;
      try {
        const cleanJsonString = responseText.replace(/```json|```/g, '').trim();
        recData = JSON.parse(cleanJsonString);
      } catch (err) {
        logger.warn('[RecommendationService] Failed to parse JSON, using defaults: ' + err.message);
        recData = {
          weakTopics: ['Calculus limits', 'Zookeeper broker syncing'],
          nextLessons: ['Limits and derivatives 102', 'Advanced Kafka Topics'],
          practiceQuizzes: ['Math Fundamentals Quiz'],
          schedule: 'Spend 20 minutes on limits, then review Kafka guides on weekends.'
        };
      }

      let recommendations = await AIRecommendations.findOne({ where: { studentId } });
      if (recommendations) {
        await recommendations.update({
          weakTopics: recData.weakTopics,
          nextLessons: recData.nextLessons,
          practiceQuizzes: recData.practiceQuizzes,
          schedule: recData.schedule
        });
      } else {
        recommendations = await AIRecommendations.create({
          studentId,
          weakTopics: recData.weakTopics,
          nextLessons: recData.nextLessons,
          practiceQuizzes: recData.practiceQuizzes,
          schedule: recData.schedule
        });
      }

      const promptTokens = Math.ceil(prompt.length / 4);
      const completionTokens = Math.ceil(responseText.length / 4);
      
      await AIMetrics.create({
        userId: studentId,
        promptTokens,
        completionTokens,
        provider: getProviderName(),
        cost: (promptTokens + completionTokens) * 0.000002,
        action: 'Recommendations'
      });

      return recommendations;
    } catch (error) {
      logger.error('[RecommendationService] Recommendations failed: ' + error.message);
      throw error;
    }
  }
}

export default RecommendationService;
