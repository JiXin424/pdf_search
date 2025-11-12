import { useState } from 'react';
import { pdfjs } from 'react-pdf';
import FileUpload from './components/FileUpload';
import PDFViewer from './components/PDFViewer';
import QuestionModal from './components/QuestionModal';
import AdvancedAreaSelector from './components/AdvancedAreaSelector';
import { captureAreaScreenshot } from './utils/screenshot';
import { submitQuestion } from './utils/api';

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`;

function App() {
  const [pdfFile, setPdfFile] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentScreenshot, setCurrentScreenshot] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [isAreaSelecting, setIsAreaSelecting] = useState(false);

  const handleFileUpload = (file) => {
    setPdfFile(file);
  };

  const handleScreenshot = () => {
    setIsAreaSelecting(true);
  };

  const handleAreaSelect = async (area) => {
    try {
      const screenshot = await captureAreaScreenshot('pdf-viewer-container', area);
      setCurrentScreenshot(screenshot);
      setIsAreaSelecting(false);
      setIsModalOpen(true);
    } catch (error) {
      alert('区域截图失败: ' + error.message);
      setIsAreaSelecting(false);
    }
  };

  const handleAreaCancel = () => {
    setIsAreaSelecting(false);
  };

  const handleQuestionSubmit = async (data) => {
    try {
      const response = await submitQuestion(data);

      setQuestions(prev => [...prev, {
        id: Date.now(),
        question: data.question,
        screenshot: data.screenshot.url,
        answer: response.answer || '正在处理您的问题...',
        timestamp: new Date().toLocaleString()
      }]);

      // 显示成功弹窗
      alert(response.answer || 'Hello World!');

    } catch (error) {
      throw error;
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setCurrentScreenshot(null);
  };

  const clearPDF = () => {
    setPdfFile(null);
    setQuestions([]);
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

      <QuestionModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        screenshot={currentScreenshot}
        onSubmit={handleQuestionSubmit}
      />
    </div>
  );
}

export default App;