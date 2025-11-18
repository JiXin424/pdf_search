import { useState } from 'react';
import FileUpload from './components/FileUpload';
import VideoPlayer from './components/VideoPlayer';
import QuestionModal from './components/QuestionModal';
import AdvancedAreaSelector from './components/AdvancedAreaSelector';
import ChatV2 from './components/ChatV2'; // 右侧聊天界面（支持流式）
import { captureAreaScreenshot } from './utils/screenshot';
import { submitQuestion } from './utils/api';

function App() {
  const [videoFile, setVideoFile] = useState(null);
  const [currentScreenshot, setCurrentScreenshot] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [isAreaSelecting, setIsAreaSelecting] = useState(false);
  const [chatExpanded, setChatExpanded] = useState(false);

  const handleFileUpload = (file) => {
    setVideoFile(file);
  };

  const handleScreenshot = () => {
    setIsAreaSelecting(true);
  };

  const handleAreaSelect = async (area) => {
    try {
      // 先设置loading状态，给用户反馈
      setIsAreaSelecting(false);

      // 立即展开聊天界面，给用户即时反馈
      setChatExpanded(true);

      // 使用异步处理截图，避免阻塞UI
      const screenshot = await captureAreaScreenshot('video-viewer-container', area);

      // 设置截图
      setCurrentScreenshot(screenshot);
    } catch (error) {
      alert('区域截图失败: ' + error.message);
      setIsAreaSelecting(false);
      // 如果截图失败，收起聊天界面
      setChatExpanded(false);
    }
  };

  const handleAreaCancel = () => {
    setIsAreaSelecting(false);
  };

  const handleChatToggle = (expanded) => {
    setChatExpanded(expanded);
  };

  const handleClearScreenshot = () => {
    // 优化截图清理，避免UI卡顿
    requestAnimationFrame(() => {
      setCurrentScreenshot(null);
    });
  };

  const clearVideo = () => {
    setVideoFile(null);
    setQuestions([]);
    setCurrentScreenshot(null);
  };

  return (
    <div className="container">
      <header className="header">
        <h1>MP4智能问答系统</h1>
        <p>上传MP4文件，截图提问，获得智能回答</p>
      </header>

      {!videoFile ? (
        <FileUpload onFileUpload={handleFileUpload} />
      ) : (
        <>
          <div style={{ marginBottom: '20px' }}>
            <button
              className="btn btn-secondary"
              onClick={clearVideo}
              style={{ marginRight: '10px' }}
            >
              重新选择文件
            </button>
            <span style={{ color: '#64748b' }}>
              当前文件: {videoFile.name}
            </span>
          </div>

          <VideoPlayer
            file={videoFile}
            onAreaScreenshot={handleScreenshot}
          />

          {questions.length > 0 && (
            <div style={{ marginTop: '20px' }}>
              <h3>问答记录</h3>
              {questions.map((qa) => (
                <div key={qa.id} style={{
                  background: 'white',
                  padding: '16px',
                  marginBottom: '16px',
                  borderRadius: '8px',
                  boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
                }}>
                  <div style={{ display: 'flex', gap: '16px' }}>
                    <img
                      src={qa.screenshot}
                      alt="问题截图"
                      style={{
                        width: '120px',
                        height: 'auto',
                        borderRadius: '4px',
                        flexShrink: 0
                      }}
                    />
                    <div style={{ flex: 1 }}>
                      <div style={{
                        fontWeight: 'bold',
                        marginBottom: '8px',
                        color: '#1e293b'
                      }}>
                        问题: {qa.question}
                      </div>
                      <div style={{
                        color: '#475569',
                        lineHeight: '1.5'
                      }}>
                        回答: {qa.answer}
                      </div>
                      <div style={{
                        fontSize: '12px',
                        color: '#94a3b8',
                        marginTop: '8px'
                      }}>
                        {qa.timestamp}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {isAreaSelecting && (
        <AdvancedAreaSelector
          onAreaSelect={handleAreaSelect}
          onCancel={handleAreaCancel}
          targetElement="video-viewer-container"
        />
      )}

      {/* 右侧聊天界面（支持流式） */}
      <ChatV2
        isExpanded={chatExpanded}
        onToggle={handleChatToggle}
        screenshot={currentScreenshot}
        onClearScreenshot={handleClearScreenshot}
      />
    </div>
  );
}

export default App;