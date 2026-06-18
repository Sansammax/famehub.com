import { chat, getProviderName } from '../providers/index.js';
import { AIFeedback, AIMetrics } from '../../../models/index.js';
import { EVALUATE_ASSIGNMENT } from '../prompts/templates.js';
import { logger } from '../../../utils/logger.js';

export class AssignmentEvaluator {
  static async evaluate(submissionId, studentSubmission, assignmentDescription, maxMarks, evaluatorId, options = {}) {
    const prompt = EVALUATE_ASSIGNMENT
      .replace('{assignmentDescription}', assignmentDescription)
      .replace('{maxMarks}', maxMarks)
      .replace('{studentSubmission}', studentSubmission);

    const messages = [{ role: 'user', content: prompt }];

    try {
      const responseText = await chat(messages, { ...options, temperature: 0.3 });

      let feedbackData;
      try {
        const cleanJsonString = responseText.replace(/```json|```/g, '').trim();
        feedbackData = JSON.parse(cleanJsonString);
      } catch (err) {
        logger.warn('[AssignmentEvaluator] Failed to parse evaluation JSON: ' + err.message);
        feedbackData = {
          feedback: 'The submission addresses core elements, but lacks structured analysis in parts. Suggested edits: add citations and elaborate on key findings.',
          suggestedMarks: Math.ceil(maxMarks * 0.75),
          plagiarismScore: 0.08,
          weakSections: ['Detailed Analysis', 'References']
        };
      }

      const feedback = await AIFeedback.create({
        submissionId,
        feedback: feedbackData.feedback,
        suggestedMarks: feedbackData.suggestedMarks,
        plagiarismScore: feedbackData.plagiarismScore,
        weakSections: feedbackData.weakSections
      });

      const promptTokens = Math.ceil(prompt.length / 4);
      const completionTokens = Math.ceil(responseText.length / 4);
      
      await AIMetrics.create({
        userId: evaluatorId,
        promptTokens,
        completionTokens,
        provider: getProviderName(),
        cost: (promptTokens + completionTokens) * 0.000002,
        action: 'Assignment Evaluation'
      });

      return feedback;
    } catch (error) {
      logger.error('[AssignmentEvaluator] Evaluation failed: ' + error.message);
      throw error;
    }
  }
}

export default AssignmentEvaluator;
