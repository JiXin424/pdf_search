import React, { useState, useRef, useEffect, useCallback } from 'react';

const VideoPlayer = ({ file, onAreaScreenshot }) => {
  const [error, setError] = useState(null);
  const [videoUrl, setVideoUrl] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volumeDisplay, setVolumeDisplay] = useState({ show: false, volume: 100, muted: false });
  const [seekDisplay, setSeekDisplay] = useState({ show: false, direction: '', time: 0 });
  const videoRef = useRef(null);
  const volumeTimeoutRef = useRef(null);
  const seekTimeoutRef = useRef(null);

  // 简化视频URL创建
  useEffect(() => {
    if (file) {
      console.log('创建视频URL:', file.name, 'size:', file.size);
      setError(null);

      const url = URL.createObjectURL(file);
      setVideoUrl(url);
      console.log('视频URL已创建:', url);

      return () => {
        URL.revokeObjectURL(url);
        console.log('视频URL已释放');
      };
    }
  }, [file]);

  const handleError = useCallback((e) => {
    console.error('视频加载错误:', e.target?.error);
    setError('视频加载失败，请检查文件格式或重新选择文件');
  }, []);

  const handleLoadedMetadata = useCallback(() => {
    console.log('视频元数据加载完成');
  }, []);

  const handleCanPlay = useCallback(() => {
    console.log('视频可以播放');
  }, []);

  // 显示音量反馈
  const showVolumeDisplay = useCallback((volume, muted = false) => {
    const volumePercent = Math.round(volume * 100);
    setVolumeDisplay({ show: true, volume: volumePercent, muted });

    // 清除上一个定时器
    if (volumeTimeoutRef.current) {
      clearTimeout(volumeTimeoutRef.current);
    }

    // 2秒后隐藏显示
    volumeTimeoutRef.current = setTimeout(() => {
      setVolumeDisplay(prev => ({ ...prev, show: false }));
    }, 2000);
  }, []);

  // 显示快进快退反馈
  const showSeekDisplay = useCallback((direction, currentTime) => {
    const minutes = Math.floor(currentTime / 60);
    const seconds = Math.floor(currentTime % 60);
    const timeString = `${minutes}:${seconds.toString().padStart(2, '0')}`;

    setSeekDisplay({ show: true, direction, time: timeString });

    // 清除上一个定时器
    if (seekTimeoutRef.current) {
      clearTimeout(seekTimeoutRef.current);
    }

    // 1.5秒后隐藏显示
    seekTimeoutRef.current = setTimeout(() => {
      setSeekDisplay(prev => ({ ...prev, show: false }));
    }, 1500);
  }, []);

  // 快捷键支持
  const handleKeyDown = useCallback((e) => {
    if (!videoRef.current) return;

    const video = videoRef.current;

    switch (e.code) {
      case 'Space':
        e.preventDefault();
        if (video.paused) {
          video.play();
        } else {
          video.pause();
        }
        break;
      case 'ArrowLeft':
        e.preventDefault();
        video.currentTime = Math.max(0, video.currentTime - 10);
        showSeekDisplay('backward', video.currentTime);
        break;
      case 'ArrowRight':
        e.preventDefault();
        video.currentTime = Math.min(video.duration, video.currentTime + 10);
        showSeekDisplay('forward', video.currentTime);
        break;
      case 'ArrowUp':
        e.preventDefault();
        video.volume = Math.min(1, video.volume + 0.1);
        showVolumeDisplay(video.volume, video.muted);
        break;
      case 'ArrowDown':
        e.preventDefault();
        video.volume = Math.max(0, video.volume - 0.1);
        showVolumeDisplay(video.volume, video.muted);
        break;
      case 'KeyM':
        e.preventDefault();
        video.muted = !video.muted;
        showVolumeDisplay(video.volume, video.muted);
        break;
      case 'KeyF':
        e.preventDefault();
        if (document.fullscreenElement) {
          document.exitFullscreen();
        } else {
          video.requestFullscreen?.();
        }
        break;
      default:
        // 数字键 1-9 跳转到相应百分比位置
        if (e.code >= 'Digit1' && e.code <= 'Digit9') {
          e.preventDefault();
          const percent = parseInt(e.code.slice(-1)) * 0.1;
          video.currentTime = video.duration * percent;
        }
        break;
    }
  }, [showVolumeDisplay, showSeekDisplay]);

  // 添加键盘监听器
  useEffect(() => {
    const handleGlobalKeyDown = (e) => {
      // 只在视频获得焦点或鼠标在视频上时响应快捷键
      if (videoRef.current &&
          (document.activeElement === videoRef.current ||
           videoRef.current.contains(document.activeElement))) {
        handleKeyDown(e);
      }
    };

    document.addEventListener('keydown', handleGlobalKeyDown);
    return () => {
      document.removeEventListener('keydown', handleGlobalKeyDown);
    };
  }, [handleKeyDown]);

  // 清理定时器
  useEffect(() => {
    return () => {
      if (volumeTimeoutRef.current) {
        clearTimeout(volumeTimeoutRef.current);
      }
      if (seekTimeoutRef.current) {
        clearTimeout(seekTimeoutRef.current);
      }
    };
  }, []);

  const togglePlay = () => {
    if (videoRef.current) {
      if (videoRef.current.paused) {
        videoRef.current.play();
      } else {
        videoRef.current.pause();
      }
    }
  };

  const handleAreaScreenshot = () => {
    // 暂停视频
    if (videoRef.current && !videoRef.current.paused) {
      videoRef.current.pause();
    }

    // 触发截图
    onAreaScreenshot();
  };

  if (!file) {
    return null;
  }

  return (
    <div className="video-container">
      <div className="video-toolbar">
        <div className="video-controls">
          <button className="btn btn-primary" onClick={handleAreaScreenshot}>
            📷 截图
          </button>
          <div className="keyboard-hint">
            快捷键: 空格(播放/暂停) • ← → (10秒) • ↑ ↓ (音量) • F(全屏) • M(静音)
          </div>
        </div>
      </div>

      <div className="video-viewer" id="video-viewer-container">
        {error && <div className="error">{error}</div>}

        {videoUrl && (
          <video
            ref={videoRef}
            src={videoUrl}
            controls
            autoPlay
            preload="metadata"
            tabIndex="0"
            onLoadedMetadata={handleLoadedMetadata}
            onCanPlay={handleCanPlay}
            onError={handleError}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            onKeyDown={handleKeyDown}
            style={{
              width: '100%',
              height: 'auto',
              maxHeight: '70vh',
              background: '#000',
              borderRadius: '8px',
              outline: 'none'
            }}
          />
        )}

        {/* 音量显示覆盖层 */}
        {volumeDisplay.show && (
          <div className="volume-overlay">
            <div className="volume-display">
              <div className="volume-icon">
                {volumeDisplay.muted ? '🔇' : volumeDisplay.volume === 0 ? '🔈' : volumeDisplay.volume < 50 ? '🔉' : '🔊'}
              </div>
              <div className="volume-bar">
                <div
                  className="volume-bar-fill"
                  style={{
                    width: volumeDisplay.muted ? '0%' : `${volumeDisplay.volume}%`
                  }}
                />
              </div>
              <div className="volume-text">
                {volumeDisplay.muted ? '静音' : `${volumeDisplay.volume}%`}
              </div>
            </div>
          </div>
        )}

        {/* 快进快退显示覆盖层 */}
        {seekDisplay.show && (
          <div className="seek-overlay">
            <div className="seek-display">
              <div className="seek-icon">
                {seekDisplay.direction === 'forward' ? '⏩' : '⏪'}
              </div>
              <div className="seek-text">
                {seekDisplay.direction === 'forward' ? '快进 +10秒' : '快退 -10秒'}
              </div>
              <div className="seek-time">
                {seekDisplay.time}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default VideoPlayer;