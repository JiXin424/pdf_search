import { useState } from 'react';
import { pdfjs } from 'react-pdf';
import FileUpload from './components/FileUpload';
import PDFViewer from './components/PDFViewer';
import QuestionModal from './components/QuestionModal';
import AdvancedAreaSelector from './components/AdvancedAreaSelector';
// import Chat from './components/Chat'; // 备选方案1 - 悬浮按钮聊天
import ChatV2 from './components/ChatV2'; // 方案2 - 箭头展开聊天
import { captureAreaScreenshot } from './utils/screenshot';
import { submitQuestion } from './utils/api';

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`;

function App() {
  const [pdfFile, setPdfFile] = useState(null);
  const [currentScreenshot, setCurrentScreenshot] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [isAreaSelecting, setIsAreaSelecting] = useState(false);
  const [chatExpanded, setChatExpanded] = useState(false);

  const handleFileUpload = (file) => {
    setPdfFile(file);
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
      const screenshot = await captureAreaScreenshot('pdf-viewer-container', area);

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

  const clearPDF = () => {
    setPdfFile(null);
    setQuestions([]);
    setCurrentScreenshot(null);
  };

  return (
    <div className="container">
      <header className="header">
        <h1>PDF智能问答系统</h1>
        <p>上传PDF文件，截图提问，获得智能回答</p>
      </header>

      {!pdfFile ? (
        <FileUpload onFileUpload={handleFileUpload} />
      ) : (
        <>
          <div style={{ marginBottom: '20px' }}>
            <button
              className="btn btn-secondary"
              onClick={clearPDF}
              style={{ marginRight: '10px' }}
            >
              重新选择文件
            </button>
            <span style={{ color: '#64748b' }}>
              当前文件: {pdfFile.name}
            </span>
          </div>

          <PDFViewer
            file={pdfFile}
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
          targetElement="pdf-viewer-container"
        />
      )}

      {/* 方案2 - 箭头展开聊天 */}
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