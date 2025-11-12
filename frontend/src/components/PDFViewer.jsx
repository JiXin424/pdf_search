import React, { useState } from 'react';
import { Document, Page } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

const PDFViewer = ({ file, onAreaScreenshot }) => {
  const [numPages, setNumPages] = useState(null);
  const [scale, setScale] = useState(1.0);
  const [isLoading, setIsLoading] = useState(false);
  const [pageInputValue, setPageInputValue] = useState('1');

  const onDocumentLoadSuccess = ({ numPages }) => {
    setNumPages(numPages);
    setIsLoading(false);
    setPageInputValue('1');
  };

  const onDocumentLoadError = (error) => {
    console.error('PDF加载错误:', error);
    setIsLoading(false);
  };

  const zoomIn = () => {
    setScale(prev => Math.min(3.0, prev + 0.2));
  };

  const zoomOut = () => {
    setScale(prev => Math.max(0.5, prev - 0.2));
  };

  const resetZoom = () => {
    setScale(1.0);
  };

  const handleAreaScreenshot = () => {
    onAreaScreenshot();
  };

  const handlePageInputChange = (e) => {
    setPageInputValue(e.target.value);
  };

  const handlePageInputKeyPress = (e) => {
    if (e.key === 'Enter') {
      jumpToPage();
    }
  };

  const jumpToPage = () => {
    const pageNum = parseInt(pageInputValue);
    if (pageNum >= 1 && pageNum <= numPages) {
      // 跳转到指定页面
      const pageElement = document.getElementById(`pdf-page-${pageNum}`);
      if (pageElement) {
        pageElement.scrollIntoView({
          behavior: 'smooth',
          block: 'start'
        });
      }
    } else {
      // 无效页码，重置为1
      setPageInputValue('1');
      alert(`请输入1到${numPages}之间的页码`);
    }
  };

  // 渲染所有页面用于滚动预览
  const renderAllPages = () => {
    if (!numPages) return null;

    const pages = [];
    for (let i = 1; i <= numPages; i++) {
      pages.push(
        <div key={i} id={`pdf-page-${i}`} className="pdf-page-container">
          <div className="page-number-indicator">第 {i} 页</div>
          <Page
            pageNumber={i}
            scale={scale}
            className="pdf-page"
          />
        </div>
      );
    }
    return pages;
  };

  if (!file) {
    return null;
  }

  return (
    <div className="pdf-container">
      <div className="pdf-toolbar">
        <div className="pdf-controls">
          <div className="page-navigation">
            <input
              type="number"
              min="1"
              max={numPages || 1}
              value={pageInputValue}
              onChange={handlePageInputChange}
              onKeyPress={handlePageInputKeyPress}
              className="page-input"
              placeholder="页码"
            />
            <span className="page-info">
              / {numPages || '?'}
            </span>
            <button
              className="btn btn-secondary btn-small"
              onClick={jumpToPage}
              title="跳转到指定页面"
            >
              跳转
            </button>
          </div>
        </div>

        <div className="pdf-controls">
          <button className="btn btn-secondary" onClick={zoomOut}>
            缩小
          </button>
          <span className="page-info">
            {Math.round(scale * 100)}%
          </span>
          <button className="btn btn-secondary" onClick={zoomIn}>
            放大
          </button>
          <button className="btn btn-secondary" onClick={resetZoom}>
            重置
          </button>
          <button className="btn btn-primary" onClick={handleAreaScreenshot}>
            📷 截图
          </button>
        </div>
      </div>

      <div className="pdf-viewer-scroll" id="pdf-viewer-container">
        {isLoading && <div className="loading">PDF加载中...</div>}
        <Document
          file={file}
          onLoadSuccess={onDocumentLoadSuccess}
          onLoadError={onDocumentLoadError}
          onLoadStart={() => setIsLoading(true)}
        >
          {renderAllPages()}
        </Document>
      </div>
    </div>
  );
};

export default PDFViewer;