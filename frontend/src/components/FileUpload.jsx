import React, { useState, useRef } from 'react';

const FileUpload = ({ onFileUpload, mode = 'video' }) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef(null);

  // 根据模式定义文件类型配置
  const modeConfig = {
    video: {
      accept: '.mp4,video/*',
      icon: '🎬',
      title: '拖拽MP4视频文件到这里，或点击选择文件',
      hint: '支持MP4格式，最大100MB',
      validate: (file) => file.type.startsWith('video/'),
      errorMsg: '请上传MP4视频文件'
    },
    pdf: {
      accept: '.pdf,application/pdf',
      icon: '📄',
      title: '拖拽PDF文档到这里，或点击选择文件',
      hint: '支持PDF格式，最大50MB',
      validate: (file) => file.type === 'application/pdf',
      errorMsg: '请上传PDF文档'
    }
  };

  const config = modeConfig[mode];

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
    if (files.length > 0 && config.validate(files[0])) {
      onFileUpload(files[0]);
    } else {
      alert(config.errorMsg);
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file && config.validate(file)) {
      onFileUpload(file);
    } else {
      alert(config.errorMsg);
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
        accept={config.accept}
        onChange={handleFileSelect}
        className="upload-input"
      />
      <div className="upload-icon">{config.icon}</div>
      <div className="upload-text">
        {config.title}
      </div>
      <div className="upload-hint">
        {config.hint}
      </div>
    </div>
  );
};

export default FileUpload;