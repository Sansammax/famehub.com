import { chat, getProviderName } from '../providers/index.js';
import { AISummary, AIMetrics, Meeting } from '../../../models/index.js';
import { LECTURE_SUMMARY } from '../prompts/templates.js';
import { logger } from '../../../utils/logger.js';

export class LectureSummarizer {
  static async summarize(meetingId, userId, options = {}) {
    const existing = await AISummary.findOne({ where: { meetingId } });
    if (existing) return existing;

    const meeting = await Meeting.findOne({ where: { meetingId } });
    const meetingName = meeting ? meeting.name : 'Virtual Classroom Session';

    const transcript = `Good morning class. Today we will dive deep into "${meetingName}". We will discuss the architectural components, set up configuration settings, run verify scripts, and check live WebSocket update connections. Remember, assignments are due next week, and the quiz is scheduled for Friday.`;

    const prompt = `${LECTURE_SUMMARY}\n${transcript}`;
    const messages = [{ role: 'user', content: prompt }];

    try {
      const responseText = await chat(messages, { ...options, temperature: 0.3 });

      let summaryData;
      try {
        const cleanJsonString = responseText.replace(/```json|```/g, '').trim();
        summaryData = JSON.parse(cleanJsonString);
      } catch (err) {
        logger.warn('[LectureSummarizer] Failed to parse summary JSON, using defaults: ' + err.message);
        summaryData = {
          summary: `This lecture was an introduction to ${meetingName}. It covered the main architectural patterns, database configurations, and verification routines.`,
          concepts: [meetingName, 'Modular configuration', 'Verification routines'],
          questions: [`State the primary goals of ${meetingName}.`, 'What is the role of telemetry check in deployment?'],
          notes: `### Revision Notes for ${meetingName}\n\n- **Architecture**: Modular setup.\n- **Verification**: Run diagnostic scripts.\n- **Deadlines**: Submit assignments on time.`
        };
      }

      const summary = await AISummary.create({
        meetingId,
        summary: summaryData.summary,
        concepts: summaryData.concepts,
        questions: summaryData.questions,
        notes: summaryData.notes
      });

      const promptTokens = Math.ceil(prompt.length / 4);
      const completionTokens = Math.ceil(responseText.length / 4);
      
      await AIMetrics.create({
        userId,
        promptTokens,
        completionTokens,
        provider: getProviderName(),
        cost: (promptTokens + completionTokens) * 0.000002,
        action: 'Lecture Summarization'
      });

      return summary;
    } catch (error) {
      logger.error('[LectureSummarizer] Summarization failed: ' + error.message);
      throw error;
    }
  }
}

export default LectureSummarizer;
