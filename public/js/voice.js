/**
 * voice.js — Trợ lý giọng nói bằng Web Speech API (B sở hữu, AI-5 tùy chọn)
 *
 * Nhận diện giọng nói tiếng Việt (vi-VN) qua SpeechRecognition
 * Gửi nội dung nhận diện vào Chatbot (window.BookChatbot.sendMessage)
 * Phát âm thanh phản hồi nếu người dùng bật
 */
(function () {
  'use strict';

  class VoiceAssistant {
    constructor() {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      this.isSupported = !!SpeechRecognition;
      this.recognition = null;
      this.isListening = false;

      if (this.isSupported) {
        this.recognition = new SpeechRecognition();
        this.recognition.lang = 'vi-VN';
        this.recognition.continuous = false;
        this.recognition.interimResults = false;

        this.initEvents();
      }
    }

    initEvents() {
      this.recognition.onstart = () => {
        this.isListening = true;
        this.updateUiState(true);
        if (window.showToast) {
          window.showToast('info', 'Đang lắng nghe giọng nói tiếng Việt... Hãy nói câu hỏi về sách của bạn.');
        }
      };

      this.recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        if (transcript && transcript.trim()) {
          // Gửi tin nhắn vào chatbot theo hợp đồng
          if (window.BookChatbot && typeof window.BookChatbot.sendMessage === 'function') {
            window.BookChatbot.sendMessage(transcript.trim());
          } else if (window.showToast) {
            window.showToast('success', `Đã nghe: "${transcript.trim()}"`);
          }
        }
      };

      this.recognition.onerror = (event) => {
        this.isListening = false;
        this.updateUiState(false);
        if (event.error === 'not-allowed') {
          if (window.showToast) window.showToast('warning', 'Quyền truy cập Micro bị từ chối.');
        } else if (event.error !== 'no-speech') {
          if (window.showToast) window.showToast('error', `Lỗi nhận diện giọng nói: ${event.error}`);
        }
      };

      this.recognition.onend = () => {
        this.isListening = false;
        this.updateUiState(false);
      };
    }

    start() {
      if (!this.isSupported) {
        if (window.showToast) {
          window.showToast('warning', 'Trình duyệt của bạn không hỗ trợ nhận diện giọng nói Web Speech API.');
        }
        return;
      }

      if (this.isListening) {
        this.stop();
        return;
      }

      try {
        this.recognition.start();
      } catch (err) {
        console.warn('[VoiceAssistant] Lỗi khởi động mic:', err.message);
      }
    }

    stop() {
      if (this.recognition && this.isListening) {
        this.recognition.stop();
      }
    }

    updateUiState(listening) {
      const btn = document.getElementById('btnVoiceInput');
      if (btn) {
        if (listening) {
          btn.classList.add('btn-danger', 'animate-pulse');
          btn.classList.remove('btn-outline-secondary');
        } else {
          btn.classList.remove('btn-danger', 'animate-pulse');
          btn.classList.add('btn-outline-secondary');
        }
      }
    }

    /**
     * Đọc văn bản bằng tiếng Việt
     * @param {string} text
     */
    speak(text) {
      if (!window.speechSynthesis || !text) return;
      window.speechSynthesis.cancel(); // Dừng câu trước

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'vi-VN';
      utterance.rate = 1.0;
      window.speechSynthesis.speak(utterance);
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    window.VoiceAssistant = new VoiceAssistant();
  });
})();
