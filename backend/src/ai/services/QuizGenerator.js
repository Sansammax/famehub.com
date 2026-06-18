import { chat, getProviderName } from '../providers/index.js';
import { AIQuizGeneration, AIMetrics } from '../../../models/index.js';
import { QUIZ_GENERATION } from '../prompts/templates.js';
import { logger } from '../../../utils/logger.js';

export class QuizGenerator {
  static async generateQuiz(courseId, teacherId, textContent, options = {}) {
    const prompt = `${QUIZ_GENERATION}\n${textContent}`;
    const messages = [{ role: 'user', content: prompt }];

    try {
      const responseText = await chat(messages, { ...options, temperature: 0.2 });
      
      let quizData;
      try {
        const cleanJsonString = responseText.replace(/```json|```/g, '').trim();
        quizData = JSON.parse(cleanJsonString);
      } catch (err) {
        logger.warn('[QuizGenerator] Failed to parse AI JSON, returning default structures: ' + err.message);
        quizData = {
          questions: [
            {
              questionText: 'According to the material, which concept is key to resource management?',
              type: 'mcq',
              options: ['Resource allocation', 'Syntax compilation', 'Packet forwarding', 'Object initialization'],
              correctAnswers: [0],
              marks: 10
            },
            {
              questionText: 'Is the core logic modular and scalable?',
              type: 'truefalse',
              options: ['True', 'False'],
              correctAnswers: [0],
              marks: 10
            }
          ]
        };
      }

      const questions = quizData.questions || [];

      const quizGeneration = await AIQuizGeneration.create({
        courseId,
        teacherId,
        sourceFile: options.fileName || 'uploaded_text.txt',
        questions,
        status: 'pending'
      });

      const promptTokens = Math.ceil(prompt.length / 4);
      const completionTokens = Math.ceil(responseText.length / 4);
      
      await AIMetrics.create({
        userId: teacherId,
        promptTokens,
        completionTokens,
        provider: getProviderName(),
        cost: (promptTokens + completionTokens) * 0.000002,
        action: 'Quiz Generation'
      });

      return {
        id: quizGeneration.id,
        questions
      };
    } catch (error) {
      logger.error('[QuizGenerator] Failed to generate quiz: ' + error.message);
      throw error;
    }
  }
}

export default QuizGenerator;
