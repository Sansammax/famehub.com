import { WebSocketServer } from 'ws';
import url from 'url';
import jwt from 'jsonwebtoken';
import { jwtConfig } from '../config/jwt.js';
import { NotificationService } from '../services/NotificationService.js';
import { logger } from '../utils/logger.js';
import { ChatService } from '../src/ai/services/ChatService.js';
import { AIChatHistory, AIMetrics } from '../models/index.js';
import { getProviderName } from '../src/ai/providers/index.js';
import { SYSTEM_CHATS } from '../src/ai/prompts/templates.js';

const clients = new Map();

const handleAiStreamRequest = async (ws, data) => {
  const { message, courseId } = data;
  const userId = ws.userId;

  if (!userId) {
    ws.send(JSON.stringify({ type: 'ERROR', message: 'Unauthorized socket connection' }));
    return;
  }

  try {
    // Save user query
    await AIChatHistory.create({ userId, role: 'user', message, courseId });

    // Fetch history context
    const history = await AIChatHistory.findAll({
      where: { userId, ...(courseId && { courseId }) },
      order: [['createdAt', 'ASC']],
      limit: 15
    });

    const formattedMessages = [
      { role: 'system', content: SYSTEM_CHATS },
      ...history.map(h => ({ role: h.role, content: h.message }))
    ];

    // Send typing start indicator
    ws.send(JSON.stringify({ type: 'AI_TYPING_START' }));

    // Call service to get stream
    const stream = await ChatService.sendMessage(userId, message, courseId, { stream: true });

    let completeResponse = '';
    const providerName = getProviderName();

    if (providerName === 'openai') {
      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || '';
        if (content) {
          completeResponse += content;
          ws.send(JSON.stringify({ type: 'AI_CHUNK', content }));
        }
      }
    } else if (providerName === 'gemini') {
      for await (const chunk of stream) {
        const content = chunk.text();
        if (content) {
          completeResponse += content;
          ws.send(JSON.stringify({ type: 'AI_CHUNK', content }));
        }
      }
    } else if (providerName === 'ollama') {
      for await (const chunk of stream) {
        const content = chunk.message?.content || '';
        if (content) {
          completeResponse += content;
          ws.send(JSON.stringify({ type: 'AI_CHUNK', content }));
        }
      }
    } else {
      // Mock fallback loop
      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || '';
        if (content) {
          completeResponse += content;
          ws.send(JSON.stringify({ type: 'AI_CHUNK', content }));
        }
      }
    }

    // Send typing stop and complete package
    ws.send(JSON.stringify({ type: 'AI_TYPING_STOP', response: completeResponse }));

    // Save assistant reply
    await AIChatHistory.create({ userId, role: 'assistant', message: completeResponse, courseId });

    // Save usage metrics
    const promptTokens = Math.ceil(JSON.stringify(formattedMessages).length / 4);
    const completionTokens = Math.ceil(completeResponse.length / 4);
    await AIMetrics.create({
      userId,
      promptTokens,
      completionTokens,
      provider: providerName,
      cost: (promptTokens + completionTokens) * 0.000002,
      action: 'Chat Stream'
    });

  } catch (err) {
    logger.error('[WS] AI stream processing error: ' + err.message);
    ws.send(JSON.stringify({ type: 'AI_TYPING_STOP', error: err.message }));
  }
};

export const initWebSocket = (server) => {
  const wss = new WebSocketServer({ noServer: true });

  server.on('upgrade', (request, socket, head) => {
    const pathname = url.parse(request.url).pathname;

    if (pathname === '/sockets') {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
      });
    } else {
      socket.destroy();
    }
  });

  wss.on('connection', (ws, req) => {
    const parameters = url.parse(req.url, true).query;
    const token = parameters.token;

    let userEmail = 'anonymous';
    let userRole = 'unknown';
    let userId = null;

    if (token) {
      try {
        const decoded = jwt.verify(token, jwtConfig.secret);
        userEmail = decoded.email || decoded.id;
        userRole = decoded.role || 'student';
        userId = decoded.id;
        ws.userId = userId;
      } catch (err) {
        logger.warn('[WS] Authentication failed, closing connection: ' + err.message);
        ws.close(4001, 'Unauthorized');
        return;
      }
    }

    logger.info(`[WS] Client connected: ${userEmail} (${userRole})`);

    if (!clients.has(userEmail)) {
      clients.set(userEmail, []);
    }
    clients.get(userEmail).push(ws);

    const pingInterval = setInterval(() => {
      if (ws.readyState === ws.OPEN) {
        ws.ping();
      }
    }, 30000);

    ws.on('message', async (message) => {
      try {
        const parsed = JSON.parse(message);
        logger.info(`[WS] Message from ${userEmail}:`, parsed);

        if (parsed.type === 'AI_STREAM_REQUEST') {
          await handleAiStreamRequest(ws, parsed.data);
        }
      } catch (err) {
        // Ignored raw data parsing issues
      }
    });

    ws.on('close', () => {
      clearInterval(pingInterval);
      logger.info(`[WS] Client disconnected: ${userEmail}`);

      if (clients.has(userEmail)) {
        const userConnections = clients.get(userEmail);
        const index = userConnections.indexOf(ws);
        if (index > -1) {
          userConnections.splice(index, 1);
        }
        if (userConnections.length === 0) {
          clients.delete(userEmail);
        }
      }
    });
  });

  NotificationService.registerWsCallback((userEmail, notification) => {
    const payload = JSON.stringify({
      type: 'NOTIFICATION',
      data: notification
    });

    if (userEmail === 'all') {
      clients.forEach((userConnections) => {
        userConnections.forEach((ws) => {
          if (ws.readyState === ws.OPEN) {
            ws.send(payload);
          }
        });
      });
      logger.info(`[WS] Broadcasted notification to all users: "${notification.message}"`);
    } else {
      const userConnections = clients.get(userEmail);
      if (userConnections) {
        userConnections.forEach((ws) => {
          if (ws.readyState === ws.OPEN) {
            ws.send(payload);
          }
        });
        logger.info(`[WS] Routed notification directly to ${userEmail}: "${notification.message}"`);
      }
    }
  });

  // Tick loop (tick rate = 5s)
  setInterval(async () => {
    try {
      // 1. Dashboard stats update
      const statsPayload = JSON.stringify({
        type: 'DASHBOARD_STATS_UPDATE',
        timestamp: new Date().toISOString()
      });
      clients.forEach((userConnections) => {
        userConnections.forEach((ws) => {
          if (ws.readyState === ws.OPEN) {
            ws.send(statsPayload);
          }
        });
      });

      // 2. Live meetings update
      const { Meeting } = await import('../models/Meeting.js');
      const { BigBlueButtonService } = await import('../services/BigBlueButtonService.js');

      const activeMeetings = await Meeting.findAll({ where: { isActive: true } });
      const updates = [];

      for (const m of activeMeetings) {
        const info = await BigBlueButtonService.getMeetingInfo(m.meetingId, m.moderatorPW);

        if (!info.isRunning) {
          m.isRunning = false;
          m.isActive = false;
          m.endedAt = new Date();
          await m.save();
        } else {
          updates.push({
            meetingId: m.meetingId,
            isRunning: info.isRunning,
            participantCount: info.participantCount
          });
        }
      }

      if (updates.length > 0) {
        const livePayload = JSON.stringify({
          type: 'LIVE_MEETINGS_UPDATE',
          meetings: updates
        });
        clients.forEach((userConnections) => {
          userConnections.forEach((ws) => {
            if (ws.readyState === ws.OPEN) {
              ws.send(livePayload);
            }
          });
        });
      }
    } catch (err) {
      // Ignored
    }
  }, 5000);
};

export const getActiveWebSocketCount = () => {
  let count = 0;
  clients.forEach((userConnections) => {
    count += userConnections.length;
  });
  return count;
};

export default initWebSocket;
