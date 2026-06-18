import ChatService from '../services/ChatService.js';
import QuizGenerator from '../services/QuizGenerator.js';
import AssignmentEvaluator from '../services/AssignmentEvaluator.js';
import RecommendationService from '../services/RecommendationService.js';
import LectureSummarizer from '../services/LectureSummarizer.js';
import SemanticSearch from '../services/SemanticSearch.js';
import { AIMetrics, sequelize } from '../../../models/index.js';
import { getProviderName } from '../providers/index.js';
import { KafkaProducer } from '../../../services/KafkaProducer.js';

export const chatController = async (req, res, next) => {
  try {
    const { message, courseId } = req.body;
    if (!message) {
      return res.status(400).json({ success: false, message: 'Message is required.' });
    }
    const response = await ChatService.sendMessage(req.user.id, message, courseId);
    
    await KafkaProducer.publishEvent('ai-chat-events', 'AI Chat Message', {
      userId: req.user.id,
      email: req.user.email,
      messageLength: message.length,
      responseLength: response.length
    });

    res.json({ success: true, response });
  } catch (err) { next(err); }
};

export const generateQuizController = async (req, res, next) => {
  try {
    const { courseId, textContent, fileName } = req.body;
    if (!textContent || !courseId) {
      return res.status(400).json({ success: false, message: 'courseId and textContent are required.' });
    }
    const result = await QuizGenerator.generateQuiz(courseId, req.user.id, textContent, { fileName });

    await KafkaProducer.publishEvent('ai-quiz-events', 'AI Quiz Generated', {
      courseId,
      teacherId: req.user.id,
      questionsCount: result.questions.length
    });

    res.status(201).json({ success: true, quiz: result });
  } catch (err) { next(err); }
};

export const evaluateAssignmentController = async (req, res, next) => {
  try {
    const { submissionId, studentSubmission, assignmentDescription, maxMarks } = req.body;
    if (!submissionId || !studentSubmission || !assignmentDescription || !maxMarks) {
      return res.status(400).json({ success: false, message: 'All evaluation fields are required.' });
    }
    const feedback = await AssignmentEvaluator.evaluate(
      submissionId, studentSubmission, assignmentDescription, maxMarks, req.user.id
    );

    await KafkaProducer.publishEvent('ai-feedback-events', 'AI Feedback Generated', {
      submissionId,
      suggestedMarks: feedback.suggestedMarks,
      plagiarismScore: feedback.plagiarismScore
    });

    res.json({ success: true, feedback });
  } catch (err) { next(err); }
};

export const summarizeRecordingController = async (req, res, next) => {
  try {
    const { meetingId } = req.body;
    if (!meetingId) {
      return res.status(400).json({ success: false, message: 'meetingId is required.' });
    }
    const summary = await LectureSummarizer.summarize(meetingId, req.user.id);

    await KafkaProducer.publishEvent('ai-summary-events', 'AI Lecture Summarized', {
      meetingId,
      userId: req.user.id
    });

    res.json({ success: true, summary });
  } catch (err) { next(err); }
};

export const getRecommendationsController = async (req, res, next) => {
  try {
    const recommendations = await RecommendationService.getRecommendations(req.user.id);

    await KafkaProducer.publishEvent('ai-recommendation-events', 'AI Recommendation Dispatched', {
      studentId: req.user.id
    });

    res.json({ success: true, recommendations });
  } catch (err) { next(err); }
};

export const searchController = async (req, res, next) => {
  try {
    const { query } = req.body;
    if (!query) {
      return res.status(400).json({ success: false, message: 'Search query is required.' });
    }
    const results = await SemanticSearch.search(query);
    res.json({ success: true, results });
  } catch (err) { next(err); }
};

export const getHistoryController = async (req, res, next) => {
  try {
    const history = await ChatService.getHistory(req.user.id, req.query.courseId);
    res.json({ success: true, history });
  } catch (err) { next(err); }
};

export const getMetricsController = async (req, res, next) => {
  try {
    const promptCount = await AIMetrics.count();
    const tokenSum = await AIMetrics.sum('promptTokens') || 0;
    const completionSum = await AIMetrics.sum('completionTokens') || 0;

    const usageByAction = await AIMetrics.findAll({
      attributes: [
        'action',
        [sequelize.fn('count', sequelize.col('id')), 'count'],
        [sequelize.fn('sum', sequelize.col('promptTokens')), 'promptTokens'],
        [sequelize.fn('sum', sequelize.col('completionTokens')), 'completionTokens']
      ],
      group: ['action']
    });

    res.json({
      success: true,
      metrics: {
        totalRequests: promptCount,
        promptTokens: tokenSum,
        completionTokens: completionSum,
        provider: getProviderName(),
        usageByAction
      }
    });
  } catch (err) { next(err); }
};
