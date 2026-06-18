import { chat, getProviderName } from '../providers/index.js';
import { AIChatHistory, AIMetrics } from '../../../models/index.js';
import { SYSTEM_CHATS } from '../prompts/templates.js';

export class ChatService {
  static async sendMessage(userId, message, courseId = null, options = {}) {
    // Save user message to database
    await AIChatHistory.create({ userId, role: 'user', message, courseId });

    // Fetch conversation context
    const history = await AIChatHistory.findAll({
      where: { userId, ...(courseId && { courseId }) },
      order: [['createdAt', 'ASC']],
      limit: 15
    });

    const formattedMessages = [
      { role: 'system', content: SYSTEM_CHATS },
      ...history.map(h => ({ role: h.role, content: h.message }))
    ];

    const providerResponse = await chat(formattedMessages, options);

    if (options.stream) {
      return providerResponse;
    } else {
      // Save assistant response
      await AIChatHistory.create({ userId, role: 'assistant', message: providerResponse, courseId });

      // Approximate token usage (1 token = ~4 characters)
      const promptTokens = Math.ceil(JSON.stringify(formattedMessages).length / 4);
      const completionTokens = Math.ceil(providerResponse.length / 4);
      
      await AIMetrics.create({
        userId,
        promptTokens,
        completionTokens,
        provider: getProviderName(),
        cost: (promptTokens + completionTokens) * 0.000002,
        action: 'Chat'
      });

      return providerResponse;
    }
  }

  static async getHistory(userId, courseId = null) {
    const where = { userId };
    if (courseId) where.courseId = courseId;
    return AIChatHistory.findAll({
      where,
      order: [['createdAt', 'ASC']]
    });
  }
}

export default ChatService;
