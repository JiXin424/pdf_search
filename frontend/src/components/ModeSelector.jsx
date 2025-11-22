import React from 'react';

const ModeSelector = ({ selectedMode, onModeChange }) => {
  const modes = [
    {
      id: 'pdf',
      name: 'PDF文档',
      icon: '📄'
    },
    {
      id: 'video',
      name: '视频文件',
      icon: '🎬'
    }
  ];

  return (
    <div className="mode-selector-container">
      <div className="mode-selector-header">
        <h2>请选择模式</h2>
      </div>

      <div className="mode-options-simple">
        {modes.map((mode) => (
          <button
            key={mode.id}
            className={`mode-button ${selectedMode === mode.id ? 'selected' : ''}`}
            onClick={() => onModeChange(mode.id)}
          >
            <div className="mode-button-icon">{mode.icon}</div>
            <div className="mode-button-text">{mode.name}</div>
          </button>
        ))}
      </div>
    </div>
  );
};

export default ModeSelector;