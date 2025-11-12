import React, { useState, useRef, useCallback, useEffect } from 'react';
import Magnifier from './Magnifier';

const AdvancedAreaSelector = ({ onAreaSelect, onCancel, targetElement }) => {
  const [isSelecting, setIsSelecting] = useState(true);
  const [isConfirmMode, setIsConfirmMode] = useState(false);
  const [startPoint, setStartPoint] = useState(null);
  const [rect, setRect] = useState(null);
  const [dragInfo, setDragInfo] = useState(null);
  const [mousePosition, setMousePosition] = useState(null);
  const overlayRef = useRef(null);

  // 初始选择
  const handleInitialMouseDown = useCallback((e) => {
    if (!isSelecting || e.target !== overlayRef.current) return;

    e.preventDefault();
    const overlayRect = overlayRef.current.getBoundingClientRect();
    const point = {
      x: e.clientX - overlayRect.left,
      y: e.clientY - overlayRect.top
    };

    setStartPoint(point);
  }, [isSelecting]);

  const handleInitialMouseMove = useCallback((e) => {
    if (!isSelecting || !startPoint) return;

    const overlayRect = overlayRef.current.getBoundingClientRect();
    const point = {
      x: e.clientX - overlayRect.left,
      y: e.clientY - overlayRect.top
    };

    const newRect = {
      left: Math.min(startPoint.x, point.x),
      top: Math.min(startPoint.y, point.y),
      width: Math.abs(point.x - startPoint.x),
      height: Math.abs(point.y - startPoint.y)
    };

    setRect(newRect);
  }, [isSelecting, startPoint]);

  const handleInitialMouseUp = useCallback(() => {
    if (!isSelecting || !rect || rect.width < 10 || rect.height < 10) {
      setIsSelecting(true);
      setStartPoint(null);
      setRect(null);
      return;
    }

    setIsSelecting(false);
    setIsConfirmMode(true);
    setStartPoint(null);
  }, [isSelecting, rect]);

  // 确认模式下的事件处理
  const handleRectMouseDown = useCallback((e) => {
    if (!isConfirmMode) return;
    e.preventDefault();
    e.stopPropagation();

    setDragInfo({
      type: 'move',
      startX: e.clientX,
      startY: e.clientY,
      originalRect: { ...rect }
    });
  }, [isConfirmMode, rect]);

  const handleResizeMouseDown = useCallback((e, handle) => {
    if (!isConfirmMode) return;
    e.preventDefault();
    e.stopPropagation();

    setDragInfo({
      type: 'resize',
      handle,
      startX: e.clientX,
      startY: e.clientY,
      originalRect: { ...rect }
    });
  }, [isConfirmMode, rect]);

  // 统一的鼠标移动处理
  useEffect(() => {
    const handleMouseMove = (e) => {
      // 更新鼠标位置用于放大镜
      if (isSelecting) {
        setMousePosition({ x: e.clientX, y: e.clientY });
      }

      if (isSelecting && startPoint) {
        handleInitialMouseMove(e);
      } else if (dragInfo) {
        const deltaX = e.clientX - dragInfo.startX;
        const deltaY = e.clientY - dragInfo.startY;
        const originalRect = dragInfo.originalRect;

        if (dragInfo.type === 'move') {
          const overlayRect = overlayRef.current?.getBoundingClientRect();
          if (!overlayRect) return;

          const newLeft = Math.max(0, Math.min(
            overlayRect.width - originalRect.width,
            originalRect.left + deltaX
          ));
          const newTop = Math.max(0, Math.min(
            overlayRect.height - originalRect.height,
            originalRect.top + deltaY
          ));

          setRect({
            ...originalRect,
            left: newLeft,
            top: newTop
          });
        } else if (dragInfo.type === 'resize') {
          let newRect = { ...originalRect };

          switch (dragInfo.handle) {
            case 'nw':
              newRect.left = originalRect.left + deltaX;
              newRect.top = originalRect.top + deltaY;
              newRect.width = originalRect.width - deltaX;
              newRect.height = originalRect.height - deltaY;
              break;
            case 'ne':
              newRect.top = originalRect.top + deltaY;
              newRect.width = originalRect.width + deltaX;
              newRect.height = originalRect.height - deltaY;
              break;
            case 'sw':
              newRect.left = originalRect.left + deltaX;
              newRect.width = originalRect.width - deltaX;
              newRect.height = originalRect.height + deltaY;
              break;
            case 'se':
              newRect.width = originalRect.width + deltaX;
              newRect.height = originalRect.height + deltaY;
              break;
            case 'n':
              newRect.top = originalRect.top + deltaY;
              newRect.height = originalRect.height - deltaY;
              break;
            case 's':
              newRect.height = originalRect.height + deltaY;
              break;
            case 'w':
              newRect.left = originalRect.left + deltaX;
              newRect.width = originalRect.width - deltaX;
              break;
            case 'e':
              newRect.width = originalRect.width + deltaX;
              break;
          }

          // 确保最小尺寸和边界
          if (newRect.width >= 20 && newRect.height >= 20 &&
              newRect.left >= 0 && newRect.top >= 0) {
            setRect(newRect);
          }
        }
      }
    };

    const handleMouseUp = () => {
      if (isSelecting && startPoint) {
        handleInitialMouseUp();
      } else if (dragInfo) {
        setDragInfo(null);
      }
    };

    // ESC键取消截图
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        handleCancel();
      }
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isSelecting, startPoint, dragInfo, handleInitialMouseMove, handleInitialMouseUp]);

  const handleConfirm = () => {
    onAreaSelect(rect);
  };

  const handleCancel = () => {
    setIsSelecting(false);
    setIsConfirmMode(false);
    setStartPoint(null);
    setRect(null);
    setDragInfo(null);
    setMousePosition(null);
    onCancel();
  };

  return (
    <div className="area-selector-container">
      {/* 遮罩层 */}
      <div
        ref={overlayRef}
        className="area-selector-overlay"
        onMouseDown={handleInitialMouseDown}
      >
        {/* 暗化区域 */}
        {rect && (
          <>
            {/* 上方暗化 */}
            <div
              className="overlay-mask"
              style={{
                top: 0,
                left: 0,
                right: 0,
                height: rect.top
              }}
            />
            {/* 下方暗化 */}
            <div
              className="overlay-mask"
              style={{
                top: rect.top + rect.height,
                left: 0,
                right: 0,
                bottom: 0
              }}
            />
            {/* 左侧暗化 */}
            <div
              className="overlay-mask"
              style={{
                top: rect.top,
                left: 0,
                width: rect.left,
                height: rect.height
              }}
            />
            {/* 右侧暗化 */}
            <div
              className="overlay-mask"
              style={{
                top: rect.top,
                left: rect.left + rect.width,
                right: 0,
                height: rect.height
              }}
            />
          </>
        )}

        {/* 选择框 */}
        {rect && (
          <div
            className={`selection-rectangle ${isConfirmMode ? 'confirm-mode' : ''}`}
            style={{
              left: rect.left,
              top: rect.top,
              width: rect.width,
              height: rect.height
            }}
            onMouseDown={isConfirmMode ? handleRectMouseDown : undefined}
          >
            {isConfirmMode && (
              <>
                {/* 四个角的调整句柄 */}
                <div
                  className="resize-handle nw"
                  onMouseDown={(e) => handleResizeMouseDown(e, 'nw')}
                />
                <div
                  className="resize-handle ne"
                  onMouseDown={(e) => handleResizeMouseDown(e, 'ne')}
                />
                <div
                  className="resize-handle sw"
                  onMouseDown={(e) => handleResizeMouseDown(e, 'sw')}
                />
                <div
                  className="resize-handle se"
                  onMouseDown={(e) => handleResizeMouseDown(e, 'se')}
                />

                {/* 四条边的调整句柄 */}
                <div
                  className="resize-handle n"
                  onMouseDown={(e) => handleResizeMouseDown(e, 'n')}
                />
                <div
                  className="resize-handle s"
                  onMouseDown={(e) => handleResizeMouseDown(e, 's')}
                />
                <div
                  className="resize-handle w"
                  onMouseDown={(e) => handleResizeMouseDown(e, 'w')}
                />
                <div
                  className="resize-handle e"
                  onMouseDown={(e) => handleResizeMouseDown(e, 'e')}
                />

                {/* 底部确认按钮 */}
                <div
                  className="bottom-confirm-buttons"
                  style={{
                    top: rect.height + 10,
                    left: '50%',
                    transform: 'translateX(-50%)'
                  }}
                >
                  <button
                    className="confirm-btn confirm"
                    onClick={handleConfirm}
                    title="确认截图"
                  >
                    ✓
                  </button>
                  <button
                    className="confirm-btn cancel"
                    onClick={handleCancel}
                    title="取消截图"
                  >
                    ✕
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* 放大镜 */}
      <Magnifier
        key={isSelecting ? 'magnifier-active' : 'magnifier-inactive'}
        mousePosition={mousePosition}
        targetElement={targetElement}
        isVisible={isSelecting && !startPoint}
      />

      <div className="area-selector-controls">
        <div className="area-selector-hint">
          {isSelecting && '拖拽鼠标选择要截图的区域，按ESC取消'}
          {isConfirmMode && '拖拽选择框移动位置，拖拽角落调整大小，点击下方按钮确认'}
        </div>
        {!isConfirmMode && (
          <div className="control-buttons">
            <button
              className="btn btn-secondary"
              onClick={handleCancel}
            >
              取消截图
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdvancedAreaSelector;