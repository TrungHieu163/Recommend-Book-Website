'use strict';

/**
 * ai.controller.js — Điều khiển các tính năng AI, Chatbot & Đề xuất (AI-1, AI-4, C sở hữu)
 */

const chatbotService = require('../services/ai/chatbot.service');
const recommendService = require('../services/ai/recommend.service');

class AiController {
  /**
   * Endpoint trò chuyện với Trợ lý AI (POST /api/ai/chat)
   */
  async chat(req, res) {
    const { message, history } = req.body;
    const result = await chatbotService.chat({
      message,
      history,
      user: req.user,
    });

    return res.json({
      success: true,
      data: result,
    });
  }

  /**
   * Endpoint đề xuất sách tương tự (GET /api/books/:id/similar)
   */
  async getSimilarBooks(req, res) {
    const { id } = req.params;
    const { limit } = req.query;
    const books = await recommendService.getSimilarBooks(id, limit);
    return res.json({ data: books });
  }

  /**
   * Endpoint đề xuất "Dành cho bạn" (GET /api/ai/recommend/for-me)
   */
  async getForYou(req, res) {
    const { limit } = req.query;
    const books = await recommendService.getForYouRecommendations({
      user: req.user,
      limit,
    });
    return res.json({ data: books });
  }
}

module.exports = new AiController();
