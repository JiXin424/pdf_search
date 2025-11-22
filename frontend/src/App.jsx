import { useState } from 'react';
import FileUpload from './components/FileUpload';
import VideoPlayer from './components/VideoPlayer';
import PdfViewer from './components/PdfViewer';
import ModeSelector from './components/ModeSelector';
import AreaSelector from './components/AreaSelector';
import ChatPanel from './components/ChatPanel'; // 右侧聊天界面（支持流式）
import { captureAreaScreenshot } from './utils/screenshot';
import { submitQuestion } from './utils/api';

function App() {
  // 模式管理
  const [mode, setMode] = useState(''); // 'pdf' 或 'video'，空字符串表示未选择

  // 文件管理
  const [file, setFile] = useState(null);

  // 截图和问答
  const [currentScreenshot, setCurrentScreenshot] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [isAreaSelecting, setIsAreaSelecting] = useState(false);
  const [chatExpanded, setChatExpanded] = useState(false);

  const handleModeChange = (selectedMode) => {
    // 切换模式时清除当前状态
    if (mode !== selectedMode) {
      setFile(null);
      setQuestions([]);
      setCurrentScreenshot(null);
      setChatExpanded(false);
    }
    setMode(selectedMode);
  };

  const handleFileUpload = (uploadedFile) => {
    setFile(uploadedFile);
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
      const containerId = mode === 'video' ? 'video-viewer-container' : 'pdf-viewer-container';
      const screenshot = await captureAreaScreenshot(containerId, area);

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

  const clearFile = () => {
    setFile(null);
    setQuestions([]);
    setCurrentScreenshot(null);
  };

  const goBackToModeSelection = () => {
    setMode('');
    setFile(null);
    setQuestions([]);
    setCurrentScreenshot(null);
    setChatExpanded(false);
  };

  // 获取动态标题
  const getTitle = () => {
    if (!mode) return '学魁榜智能AI助手';
    return mode === 'video' ? 'MP4智能问答系统' : 'PDF智能问答系统';
  };

  const getDescription = () => {
    if (!mode) return '学魁榜智能AI助手，请选择您要使用的模式。';
    return mode === 'video' ? '上传MP4文件，截图提问，获得智能回答' : '上传PDF文档，截图提问，获得智能回答';
  };

  return (
    <div className="container">
      <header className="header">
        <h1>{getTitle()}</h1>
        <p>{getDescription()}</p>
      </header>

      {/* 模式选择阶段 */}
      {!mode && (
        <ModeSelector selectedMode={mode} onModeChange={handleModeChange} />
      )}

      {/* 选择了模式但还没有文件 */}
      {mode && !file && (
        <>
          <div style={{ marginBottom: '20px', display: 'flex', gap: '10px', alignItems: 'center' }}>
            <button
              className="btn btn-secondary"
              onClick={goBackToModeSelection}
            >
              ← 重新选择模式
            </button>
            <span style={{ color: '#64748b' }}>
              当前模式: {mode === 'video' ? 'MP4视频' : 'PDF文档'}
            </span>
          </div>
          <FileUpload onFileUpload={handleFileUpload} mode={mode} />
        </>
      )}

      {/* 有文件后的主要界面 */}
      {mode && file && (
        <>
          <div style={{ marginBottom: '20px', display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
            <button
              className="btn btn-secondary"
              onClick={goBackToModeSelection}
            >
              ← 重新选择模式
            </button>
            <button
              className="btn btn-secondary"
              onClick={clearFile}
            >
              重新选择文件
            </button>
            <span style={{ color: '#64748b' }}>
              当前文件: {file.name} ({mode === 'video' ? 'MP4视频' : 'PDF文档'})
            </span>
          </div>

          {/* 根据模式渲染不同的查看器 */}
          {mode === 'video' ? (
            <VideoPlayer
              file={file}
              onAreaScreenshot={handleScreenshot}
            />
          ) : (
            <PdfViewer
              file={file}
              onAreaScreenshot={handleScreenshot}
            />
          )}

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

      {/* 区域选择器 */}
      {isAreaSelecting && (
        <AreaSelector
          onAreaSelect={handleAreaSelect}
          onCancel={handleAreaCancel}
          targetElement={mode === 'video' ? 'video-viewer-container' : 'pdf-viewer-container'}
        />
      )}

      {/* 右侧聊天界面（支持流式） - 始终显示，但功能根据状态调整 */}
      <ChatPanel
        isExpanded={chatExpanded}
        onToggle={handleChatToggle}
        screenshot={currentScreenshot}
        onClearScreenshot={handleClearScreenshot}
        mode={mode || 'video'}
        disabled={!file} // 没有文件时禁用输入
      />
    </div>
  );
}

export default App;