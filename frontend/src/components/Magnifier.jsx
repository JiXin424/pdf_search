import React, { useEffect, useRef, useState } from 'react';

const Magnifier = ({ mousePosition, targetElement, isVisible }) => {
  const canvasRef = useRef(null);
  const [magnifierWidth] = useState(140);
  const [magnifierHeight] = useState(140);
  const [zoomLevel] = useState(3);
  const [targetRect, setTargetRect] = useState(null);
  const animationFrameRef = useRef(null);

  // 获取目标元素位置信息
  useEffect(() => {
    if (targetElement && isVisible) {
      const targetEl = document.getElementById(targetElement);
      if (targetEl) {
        const rect = targetEl.getBoundingClientRect();
        setTargetRect(rect);
      }
    }
  }, [targetElement, isVisible]);

  // 直接从屏幕截取像素进行放大显示
  useEffect(() => {
    if (!isVisible || !mousePosition || !targetRect || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    canvas.width = magnifierWidth;
    canvas.height = magnifierHeight;

    // 取消之前的动画帧
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }

    // 使用requestAnimationFrame优化绘制
    animationFrameRef.current = requestAnimationFrame(() => {
      try {
        // 清除画布
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, magnifierWidth, magnifierHeight);

        // 使用传入的相对坐标，如果没有则计算
        let mouseRelativeX, mouseRelativeY;

        if (mousePosition.relativeX !== undefined && mousePosition.relativeY !== undefined) {
          // 使用预计算的相对坐标
          mouseRelativeX = mousePosition.relativeX;
          mouseRelativeY = mousePosition.relativeY;
        } else {
          // 回退到原来的计算方式
          mouseRelativeX = mousePosition.x - targetRect.left;
          mouseRelativeY = mousePosition.y - targetRect.top;
        }

        // 计算要截取的区域大小，确保中心对齐
        const sourceSize = magnifierWidth / zoomLevel;
        // 修正：确保放大镜中心正好对应鼠标位置
        const sourceX = mouseRelativeX - sourceSize / 2;
        const sourceY = mouseRelativeY - sourceSize / 2;

        // 获取目标元素
        const targetEl = document.getElementById(targetElement);
        if (targetEl) {
          // 查找PDF页面canvas元素
          const pdfCanvas = targetEl.querySelector('canvas') ||
                            targetEl.querySelector('.react-pdf__Page__canvas') ||
                            targetEl.querySelector('.react-pdf__Page canvas');

          if (pdfCanvas && pdfCanvas.tagName === 'CANVAS') {
            try {
              // 简化逻辑：直接检查PDF canvas的实际显示尺寸
              const canvasStyle = window.getComputedStyle(pdfCanvas);
              const actualCanvasWidth = parseFloat(canvasStyle.width);
              const actualCanvasHeight = parseFloat(canvasStyle.height);

              // 如果获取不到样式，回退到容器尺寸
              const displayWidth = actualCanvasWidth || targetRect.width;
              const displayHeight = actualCanvasHeight || targetRect.height;

              // 计算PDF canvas相对于容器的实际位置
              const canvasRect = pdfCanvas.getBoundingClientRect();
              const containerRect = targetRect;

              // PDF canvas相对于容器的偏移
              const offsetX = canvasRect.left - containerRect.left;
              const offsetY = canvasRect.top - containerRect.top;

              // 调整鼠标坐标 - 减去偏移量得到在PDF canvas内的位置
              const adjustedMouseX = mouseRelativeX - offsetX;
              const adjustedMouseY = mouseRelativeY - offsetY;

              // 检查鼠标是否在PDF显示区域内
              if (adjustedMouseX < 0 || adjustedMouseX > displayWidth ||
                  adjustedMouseY < 0 || adjustedMouseY > displayHeight) {
                drawPlaceholder(ctx);
                return;
              }

              // 计算统一的缩放比例
              const scaleX = pdfCanvas.width / displayWidth;
              const scaleY = pdfCanvas.height / displayHeight;

              // 计算源区域
              const adjustedSourceX = adjustedMouseX - sourceSize / 2;
              const adjustedSourceY = adjustedMouseY - sourceSize / 2;

              const scaledSourceX = adjustedSourceX * scaleX;
              const scaledSourceY = adjustedSourceY * scaleY;
              const scaledSourceWidth = sourceSize * scaleX;
              const scaledSourceHeight = sourceSize * scaleY;

              // 计算实际可绘制的区域，处理边界情况
              let drawSourceX = Math.max(0, scaledSourceX);
              let drawSourceY = Math.max(0, scaledSourceY);
              let drawWidth = scaledSourceWidth;
              let drawHeight = scaledSourceHeight;

              // 如果超出左/上边界，调整绘制参数
              let destOffsetX = 0;
              let destOffsetY = 0;
              if (scaledSourceX < 0) {
                destOffsetX = -scaledSourceX / scaleX * zoomLevel;
                drawWidth += scaledSourceX;
              }
              if (scaledSourceY < 0) {
                destOffsetY = -scaledSourceY / scaleY * zoomLevel;
                drawHeight += scaledSourceY;
              }

              // 确保不超出canvas右/下边界
              const maxX = Math.min(drawSourceX + drawWidth, pdfCanvas.width);
              const maxY = Math.min(drawSourceY + drawHeight, pdfCanvas.height);
              const actualWidth = maxX - drawSourceX;
              const actualHeight = maxY - drawSourceY;

              ctx.imageSmoothingEnabled = false;
              ctx.drawImage(
                pdfCanvas,
                drawSourceX, drawSourceY, actualWidth, actualHeight,
                destOffsetX, destOffsetY,
                actualWidth / scaleX * zoomLevel, actualHeight / scaleY * zoomLevel
              );
            } catch (e) {
              console.warn('Canvas access failed:', e);
              drawPlaceholder(ctx);
            }
          } else {
            // 没有找到PDF canvas，绘制占位符
            drawPlaceholder(ctx);
          }
        }

        // 绘制十字线
        drawCrosshair(ctx);
      } catch (error) {
        console.warn('Magnifier draw error:', error);
        drawPlaceholder(ctx);
      }
    });

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [mousePosition, targetRect, targetElement, isVisible, magnifierWidth, magnifierHeight, zoomLevel]);

  const drawPlaceholder = (ctx) => {
    ctx.fillStyle = '#f0f0f0';
    ctx.fillRect(0, 0, magnifierWidth, magnifierHeight);
    ctx.fillStyle = '#666';
    ctx.font = '12px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Loading...', magnifierWidth / 2, magnifierHeight / 2);
  };

  const drawCrosshair = (ctx) => {
    const centerX = magnifierWidth / 2;
    const centerY = magnifierHeight / 2;

    ctx.strokeStyle = '#ff0000';
    ctx.lineWidth = 1;

    // 垂直线
    ctx.beginPath();
    ctx.moveTo(centerX, 0);
    ctx.lineTo(centerX, magnifierHeight);
    ctx.stroke();

    // 水平线
    ctx.beginPath();
    ctx.moveTo(0, centerY);
    ctx.lineTo(magnifierWidth, centerY);
    ctx.stroke();

    // 中心点
    ctx.fillStyle = '#ff0000';
    ctx.beginPath();
    ctx.arc(centerX, centerY, 2, 0, 2 * Math.PI);
    ctx.fill();
  };

  if (!isVisible || !mousePosition) return null;

  // 计算放大镜位置
  const magnifierStyle = {
    position: 'fixed',
    left: mousePosition.x + 15,
    top: mousePosition.y + 15,
    width: magnifierWidth,
    height: magnifierHeight,
    borderRadius: '8px',
    overflow: 'hidden',
    border: '3px solid #2563eb',
    boxShadow: '0 4px 16px rgba(0, 0, 0, 0.3)',
    pointerEvents: 'none',
    zIndex: 2010,
  };

  // 确保放大镜不超出屏幕边界
  if (magnifierStyle.left + magnifierWidth > window.innerWidth) {
    magnifierStyle.left = mousePosition.x - magnifierWidth - 15;
  }
  if (magnifierStyle.top + magnifierHeight > window.innerHeight) {
    magnifierStyle.top = mousePosition.y - magnifierHeight - 15;
  }

  return (
    <div style={magnifierStyle}>
      <canvas
        ref={canvasRef}
        style={{
          width: '100%',
          height: '100%',
          display: 'block'
        }}
      />
      <div style={{
        position: 'absolute',
        bottom: '5px',
        right: '8px',
        color: '#2563eb',
        fontSize: '10px',
        fontWeight: 'bold',
        background: 'rgba(255, 255, 255, 0.9)',
        padding: '2px 4px',
        borderRadius: '8px',
        pointerEvents: 'none'
      }}>
        3x
      </div>
    </div>
  );
};

export default Magnifier;