import React, { useEffect, useRef, useState } from 'react';

const Magnifier = ({ mousePosition, targetElement, isVisible }) => {
  const magnifierRef = useRef(null);
  const [magnifierWidth] = useState(140);
  const [magnifierHeight] = useState(140);
  const [zoomLevel] = useState(3);
  const [backgroundUrl, setBackgroundUrl] = useState('');
  const [targetRect, setTargetRect] = useState(null);

  // 只在组件初始化时截取一次背景图
  useEffect(() => {
    if (targetElement && isVisible && !backgroundUrl) {
      const captureBackground = async () => {
        try {
          const targetEl = document.getElementById(targetElement);
          if (!targetEl) return;

          const rect = targetEl.getBoundingClientRect();
          setTargetRect(rect);

          const { default: html2canvas } = await import('html2canvas');
          const canvas = await html2canvas(targetEl, {
            allowTaint: true,
            useCORS: true,
            scale: 1,
            backgroundColor: null,
            logging: false
          });

          setBackgroundUrl(canvas.toDataURL());
        } catch (error) {
          console.warn('Background capture failed:', error);
        }
      };

      captureBackground();
    }
  }, [targetElement, isVisible, backgroundUrl]);

  if (!isVisible || !mousePosition || !targetRect || !backgroundUrl) return null;

  // 计算放大镜位置（右下角）
  const magnifierStyle = {
    left: mousePosition.x + 15,
    top: mousePosition.y + 15,
    width: magnifierWidth,
    height: magnifierHeight,
  };

  // 确保放大镜不超出屏幕边界
  if (magnifierStyle.left + magnifierWidth > window.innerWidth) {
    magnifierStyle.left = mousePosition.x - magnifierWidth - 15;
  }
  if (magnifierStyle.top + magnifierHeight > window.innerHeight) {
    magnifierStyle.top = mousePosition.y - magnifierHeight - 15;
  }

  // 计算背景位置
  const mouseRelativeX = mousePosition.x - targetRect.left;
  const mouseRelativeY = mousePosition.y - targetRect.top;

  const backgroundX = -(mouseRelativeX * zoomLevel - magnifierWidth / 2);
  const backgroundY = -(mouseRelativeY * zoomLevel - magnifierHeight / 2);

  return (
    <div
      className="magnifier rectangular"
      style={magnifierStyle}
      ref={magnifierRef}
    >
      {/* 背景图片放大显示 */}
      <div
        className="magnifier-content"
        style={{
          backgroundImage: `url(${backgroundUrl})`,
          backgroundSize: `${targetRect.width * zoomLevel}px ${targetRect.height * zoomLevel}px`,
          backgroundPosition: `${backgroundX}px ${backgroundY}px`,
          backgroundRepeat: 'no-repeat',
          width: '100%',
          height: '100%',
        }}
      />

      {/* 十字线 */}
      <div className="magnifier-crosshair">
        <div className="crosshair-vertical"></div>
        <div className="crosshair-horizontal"></div>
        <div className="center-dot"></div>
      </div>

      <div className="magnifier-border"></div>
      <div className="magnifier-label">3x</div>
    </div>
  );
};

export default Magnifier;