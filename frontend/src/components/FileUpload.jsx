import React, { useState, useRef } from 'react';

const FileUpload = ({ onFileUpload }) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef(null);

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);

    const files = e.dataTransfer.files;
    if (files.length > 0 && files[0].type.startsWith('video/')) {
      onFileUpload(files[0]);
    } else {
      alert('请上传MP4视频文件');
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file && file.type.startsWith('video/')) {
      onFileUpload(file);
    } else {
      alert('请上传MP4视频文件');
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div
      className={`upload-area ${isDragOver ? 'dragover' : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={handleClick}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept=".mp4,video/*"
        onChange={handleFileSelect}
        className="upload-input"
      />
      <div className="upload-icon">🎬</div>
      <div className="upload-text">
        拖拽MP4视频文件到这里，或点击选择文件
      </div>
      <div className="upload-hint">
        支持MP4格式，最大100MB
      </div>
    </div>
  );
};

export default FileUpload;