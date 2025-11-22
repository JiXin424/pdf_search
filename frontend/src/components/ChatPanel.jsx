import React, { useState, useRef, useEffect, startTransition } from 'react';
import { flushSync } from 'react-dom';
import { sendChatMessage, getChatHistory } from '../utils/api';
import ReactMarkdown from 'react-markdown';

const ChatV2 = ({ isExpanded: propExpanded, onToggle, screenshot, onClearScreenshot, mode = 'video', disabled = false }) => {
  const [isExpanded, setIsExpanded] = useState(propExpanded || false);
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [screenshotLoaded, setScreenshotLoaded] = useState(false);
  const [streamingMessageId, setStreamingMessageId] = useState(null);
  const messagesEndRef = useRef(null);
  const imgRef = useRef(null);
  const aiMessageCreated = useRef(false); // 使用ref来同步跟踪
  const currentAiMessageId = useRef(null); // 使用ref存储消息ID

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
    if (!inputValue.trim() || isLoading || disabled) return;

    const userMessage = {
      id: Date.now(),
      type: 'user',
      content: inputValue,
      timestamp: new Date(),
      hasScreenshot: !!screenshot,
      screenshotUrl: screenshot?.url || null
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');

    // 发送消息后立即清除截图缓冲区
    if (screenshot && onClearScreenshot) {
      onClearScreenshot();
    }

    setIsLoading(true);
    setIsStreaming(true);
    aiMessageCreated.current = false; // 重置创建标志
    currentAiMessageId.current = null; // 重置消息ID

    // 立即创建AI消息占位符，显示思考状态
    const aiMessageId = Date.now() + 1;
    const aiMessage = {
      id: aiMessageId,
      type: 'bot',
      content: '小魁正在思考中...',
      timestamp: new Date(),
      isStreaming: true,
      isPreparing: true // 标记为准备状态
    };

    setMessages(prev => [...prev, aiMessage]);
    currentAiMessageId.current = aiMessageId;
    aiMessageCreated.current = true;

    try {
      // 创建FormData发送流式请求
      const formData = new FormData();
      formData.append('message', userMessage.content);
      formData.append('timestamp', userMessage.timestamp.toISOString());
      formData.append('mode', mode); // 添加模式信息

      // 如果有截图，添加到表单数据
      if (screenshot?.blob) {
        formData.append('screenshot', screenshot.blob, 'screenshot.png');
      }

      const response = await fetch('/api/chat/stream', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        console.log('📦 收到数据块:', buffer);

        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          console.log('📄 处理行:', line);
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              console.log('📊 解析的数据:', data);

              if (data.type === 'content') {
                // 直接更新已有的AI消息内容
                const messageId = currentAiMessageId.current;
                console.log('📝 更新消息ID:', messageId, '内容:', data.content);

                setMessages(prev => {
                  const updated = prev.map(msg => {
                    if (msg.id === messageId) {
                      // 如果是第一次收到内容，清除思考状态
                      if (msg.isPreparing) {
                        const updatedMsg = {
                          ...msg,
                          content: data.content,
                          isPreparing: false
                        };
                        console.log('📝 清除思考状态，开始流式内容:', updatedMsg.content);
                        return updatedMsg;
                      } else {
                        // 追加流式内容
                        const updatedMsg = { ...msg, content: msg.content + data.content };
                        console.log('📝 追加流式内容:', updatedMsg.content);
                        return updatedMsg;
                      }
                    }
                    return msg;
                  });
                  return updated;
                });
                console.log('📝 流式更新AI消息:', data.content);
              } else if (data.type === 'user_saved') {
                console.log('✅', data.message);
              } else if (data.type === 'processing') {
                console.log('🔄 忽略处理状态，已在AI消息中显示');
                // 不再设置单独的处理消息，因为AI消息本身显示思考状态
              } else if (data.type === 'done') {
                // 流式响应完成，标记消息为非流式状态
                const messageId = currentAiMessageId.current;
                if (messageId) {
                  setMessages(prev => prev.map(msg =>
                    msg.id === messageId
                      ? { ...msg, isStreaming: false, isPreparing: false }
                      : msg
                  ));
                }
                setStreamingMessageId(null);
                currentAiMessageId.current = null;
                aiMessageCreated.current = false;
                setIsStreaming(false);
                setIsLoading(false);
              } else if (data.error) {
                // 处理错误
                const messageId = currentAiMessageId.current;
                if (messageId) {
                  setMessages(prev => prev.map(msg =>
                    msg.id === messageId
                      ? { ...msg, content: `❌ ${data.error}`, isStreaming: false, isPreparing: false }
                      : msg
                  ));
                } else {
                  // 创建新的错误消息
                  const errorMessage = {
                    id: Date.now() + 2,
                    type: 'bot',
                    content: `❌ ${data.error}`,
                    timestamp: new Date(),
                    isStreaming: false
                  };
                  setMessages(prev => [...prev, errorMessage]);
                }
                setStreamingMessageId(null);
                currentAiMessageId.current = null;
                aiMessageCreated.current = false;
                setIsStreaming(false);
                setIsLoading(false);
              }
            } catch (e) {
              console.error('解析流式数据错误:', e);
            }
          }
        }
      }

    } catch (error) {
      console.error('流式聊天错误:', error);
      // 如果有流式消息ID，更新为错误状态
      const messageId = currentAiMessageId.current;
      if (messageId) {
        setMessages(prev => prev.map(msg =>
          msg.id === messageId
            ? { ...msg, content: '抱歉，发送消息时出现错误，请稍后重试。', isStreaming: false, isPreparing: false }
            : msg
        ));
      } else {
        // 否则添加新的错误消息
        const errorMessage = {
          id: Date.now() + 2,
          type: 'bot',
          content: '抱歉，发送消息时出现错误，请稍后重试。',
          timestamp: new Date(),
          isStreaming: false
        };
        setMessages(prev => [...prev, errorMessage]);
      }
    } finally {
      setIsLoading(false);
      setIsStreaming(false);
      setStreamingMessageId(null);
      currentAiMessageId.current = null;
      aiMessageCreated.current = false;
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
                  {disabled ? (
                    <p>请先选择模式并上传文件开始使用</p>
                  ) : (
                    <p>有什么可以帮助您的吗？</p>
                  )}
                </div>
              </div>
            ) : (
              messages.map((message) => (
                <div key={message.id} className={`message ${message.type} ${message.isStreaming ? 'streaming' : ''}`}>
                  <div className="message-avatar">
                    {message.type === 'user' ? '👤' : '🤖'}
                  </div>
                  <div className="message-content">
                    {/* 如果有截图，先显示图片 */}
                    {message.screenshotUrl && (
                      <div className="message-screenshot">
                        <img
                          src={message.screenshotUrl}
                          alt="用户截图"
                          className="screenshot-image"
                        />
                      </div>
                    )}
                    <div className="message-text">
                      {message.type === 'bot' ? (
                        <div className="markdown-content">
                          {message.isStreaming ? (
                            // 流式消息：检查是否为思考状态
                            message.isPreparing ? (
                              // 思考状态：显示思考提示
                              <div className="processing-message">
                                <div className="spinner"></div>
                                <span className="processing-text">{message.content}</span>
                              </div>
                            ) : (
                              // 流式输出：直接显示文本，不用ReactMarkdown避免性能问题
                              <div className="streaming-text">
                                <pre style={{whiteSpace: 'pre-wrap', fontFamily: 'inherit', margin: 0}}>
                                  {message.content}
                                </pre>
                                {message.content && <span className="stream-cursor">|</span>}
                              </div>
                            )
                          ) : (
                            // 完成的消息：使用ReactMarkdown渲染
                            <ReactMarkdown>
                              {message.content}
                            </ReactMarkdown>
                          )}
                        </div>
                      ) : (
                        message.content
                      )}
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
                placeholder={disabled ? "请先上传文件..." : "输入您的问题..."}
                rows="1"
                disabled={isLoading || disabled}
              />
              <button
                className="chatv2-send-btn"
                onClick={handleSendMessage}
                disabled={!inputValue.trim() || isLoading || disabled}
                title="发送消息"
              >
                {isLoading ? '⏳' : '📤'}
              </button>
            </div>
            <div className="chatv2-input-hint">
              {disabled ? "上传文件后即可开始对话" : "按 Enter 发送，Shift + Enter 换行"}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default ChatV2;