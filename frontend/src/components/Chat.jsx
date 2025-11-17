import React, { useState, useRef, useEffect } from 'react';
import { sendChatMessage, getChatHistory } from '../utils/api';

const Chat = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage = {
      id: Date.now(),
      type: 'user',
      content: inputValue,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      const response = await sendChatMessage(inputValue);

      const botMessage = {
        id: Date.now() + 1,
        type: 'bot',
        content: response.message || response.reply || '抱歉，我暂时无法回答这个问题。',
        timestamp: new Date()
      };

      setMessages(prev => [...prev, botMessage]);
    } catch (error) {
      console.error('发送消息失败:', error);
      const errorMessage = {
        id: Date.now() + 1,
        type: 'bot',
        content: '抱歉，发送消息时出现错误，请稍后重试。',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const toggleChat = () => {
    setIsOpen(!isOpen);
  };

  const clearChat = () => {
    setMessages([]);
  };

  return (
    <>
      {/* 聊天切换按钮 */}
      <button
        className={`chat-toggle-btn ${isOpen ? 'open' : ''}`}
        onClick={toggleChat}
        title={isOpen ? '收起聊天' : '展开聊天'}
      >
        {isOpen ? '✕' : '💬'}
      </button>

      {/* 聊天面板 */}
      <div className={`chat-panel ${isOpen ? 'open' : ''}`}>
        <div className="chat-header">
          <h3>智能助手</h3>
          <div className="chat-header-actions">
            <button
              className="chat-clear-btn"
              onClick={clearChat}
              title="清空聊天记录"
            >
              🗑️
            </button>
            <button
              className="chat-close-btn"
              onClick={toggleChat}
              title="关闭聊天"
            >
              ✕
            </button>
          </div>
        </div>

        <div className="chat-messages">
          {messages.length === 0 ? (
            <div className="chat-welcome">
              <div className="welcome-icon">🤖</div>
              <div className="welcome-text">
                <p>您好！我是您的智能助手</p>
                <p>有什么可以帮助您的吗？</p>
              </div>
            </div>
          ) : (
            messages.map((message) => (
              <div key={message.id} className={`message ${message.type}`}>
                <div className="message-avatar">
                  {message.type === 'user' ? '👤' : '🤖'}
                </div>
                <div className="message-content">
                  <div className="message-text">{message.content}</div>
                  <div className="message-time">
                    {message.timestamp.toLocaleTimeString('zh-CN', {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </div>
                </div>
              </div>
            ))
          )}
          {isLoading && (
            <div className="message bot loading">
              <div className="message-avatar">🤖</div>
              <div className="message-content">
                <div className="typing-indicator">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="chat-input-area">
          <div className="chat-input-wrapper">
            <textarea
              className="chat-input"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="输入您的问题..."
              rows="1"
              disabled={isLoading}
            />
            <button
              className="chat-send-btn"
              onClick={handleSendMessage}
              disabled={!inputValue.trim() || isLoading}
              title="发送消息"
            >
              {isLoading ? '⏳' : '📤'}
            </button>
          </div>
          <div className="chat-input-hint">
            按 Enter 发送，Shift + Enter 换行
          </div>
        </div>
      </div>

      {/* 遮罩层 */}
      {isOpen && <div className="chat-overlay" onClick={toggleChat} />}
    </>
  );
};

export default Chat;