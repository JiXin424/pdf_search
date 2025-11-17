import React, { useState, useRef, useEffect } from 'react';
import { sendChatMessage, getChatHistory } from '../utils/api';

const ChatV2 = ({ isExpanded: propExpanded, onToggle, screenshot, onClearScreenshot }) => {
  const [isExpanded, setIsExpanded] = useState(propExpanded || false);
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [screenshotLoaded, setScreenshotLoaded] = useState(false);
  const messagesEndRef = useRef(null);
  const imgRef = useRef(null);

  // 同步外部状态
  useEffect(() => {
    if (propExpanded !== undefined && propExpanded !== isExpanded) {
      setIsExpanded(propExpanded);
    }
  }, [propExpanded, isExpanded]);

  // 优化截图加载
  useEffect(() => {
    setScreenshotLoaded(false);
    if (screenshot?.url) {
      // 预加载图片
      const img = new Image();
      img.onload = () => {
        requestAnimationFrame(() => {
          setScreenshotLoaded(true);
        });
      };
      img.onerror = () => {
        console.warn('Screenshot loading failed');
        setScreenshotLoaded(true); // 即使失败也显示，避免卡住
      };
      img.src = screenshot.url;
    }
  }, [screenshot?.url]);

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
      timestamp: new Date(),
      hasScreenshot: !!screenshot
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      // 发送消息和截图（如果有的话）
      const response = await sendChatMessage(inputValue, screenshot);

      const botMessage = {
        id: Date.now() + 1,
        type: 'bot',
        content: response.message || response.reply || '抱歉，我暂时无法回答这个问题。',
        timestamp: new Date()
      };

      setMessages(prev => [...prev, botMessage]);

      // 发送成功后清除截图
      if (screenshot && onClearScreenshot) {
        onClearScreenshot();
      }
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

  const toggleExpand = () => {
    const newExpanded = !isExpanded;
    setIsExpanded(newExpanded);
    if (onToggle) {
      onToggle(newExpanded);
    }
  };

  const clearChat = () => {
    setMessages([]);
  };

  const handleRemoveScreenshot = () => {
    if (onClearScreenshot) {
      // 使用requestAnimationFrame确保UI更新流畅
      requestAnimationFrame(() => {
        onClearScreenshot();
      });
    }
  };

  return (
    <>
      {/* 箭头切换按钮 */}
      <div className="chatv2-container">
        <button
          className={`chatv2-arrow-btn ${isExpanded ? 'expanded' : ''}`}
          onClick={toggleExpand}
          title={isExpanded ? '收起聊天' : '展开聊天'}
        >
          {isExpanded ? '→' : '←'}
        </button>

        {/* 聊天面板 */}
        <div className={`chatv2-panel ${isExpanded ? 'expanded' : ''}`}>
          <div className="chatv2-header">
            <h3>智能助手</h3>
            <div className="chatv2-header-actions">
              <button
                className="chatv2-clear-btn"
                onClick={clearChat}
                title="清空聊天记录"
              >
                🗑️
              </button>
            </div>
          </div>

          <div className="chatv2-messages">
            {messages.length === 0 ? (
              <div className="chatv2-welcome">
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
                    <div className="message-text">
                      {message.hasScreenshot && <span className="screenshot-indicator">📎 </span>}
                      {message.content}
                    </div>
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

          <div className="chatv2-input-area">
            {/* 截图缓冲区 */}
            {screenshot && (
              <div className={`chatv2-screenshot-buffer ${!screenshotLoaded ? 'loading' : ''}`}>
                {!screenshotLoaded ? (
                  <div className="screenshot-loading">
                    <div className="loading-spinner"></div>
                    <span>加载截图中...</span>
                  </div>
                ) : (
                  <div className="screenshot-preview-container">
                    <img
                      ref={imgRef}
                      src={screenshot.url}
                      alt="截图预览"
                      className="screenshot-preview-image"
                      style={{
                        opacity: screenshotLoaded ? 1 : 0,
                        transition: 'opacity 0.3s ease'
                      }}
                      loading="eager"
                      decoding="async"
                    />
                    <button
                      className="screenshot-remove-btn"
                      onClick={handleRemoveScreenshot}
                      title="删除截图"
                    >
                      ✕
                    </button>
                  </div>
                )}
              </div>
            )}

            <div className="chatv2-input-wrapper">
              <textarea
                className="chatv2-input"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="输入您的问题..."
                rows="1"
                disabled={isLoading}
              />
              <button
                className="chatv2-send-btn"
                onClick={handleSendMessage}
                disabled={!inputValue.trim() || isLoading}
                title="发送消息"
              >
                {isLoading ? '⏳' : '📤'}
              </button>
            </div>
            <div className="chatv2-input-hint">
              按 Enter 发送，Shift + Enter 换行
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default ChatV2;