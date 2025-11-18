import html2canvas from 'html2canvas';

// 创建一个简单的任务队列来避免同时进行多个截图操作
let screenshotQueue = [];
let isProcessing = false;

const processQueue = async () => {
  if (isProcessing || screenshotQueue.length === 0) return;

  isProcessing = true;
  const task = screenshotQueue.shift();

  try {
    const result = await task.execute();
    task.resolve(result);
  } catch (error) {
    task.reject(error);
  }

  isProcessing = false;
  // 处理队列中的下一个任务
  setTimeout(processQueue, 0);
};

const addToQueue = (executeFunction) => {
  return new Promise((resolve, reject) => {
    screenshotQueue.push({
      execute: executeFunction,
      resolve,
      reject
    });
    processQueue();
  });
};

export const captureScreenshot = async (elementId = 'video-viewer-container') => {
  return addToQueue(async () => {
    const element = document.getElementById(elementId);
    if (!element) {
      throw new Error('未找到视频预览区域');
    }

    const canvas = await html2canvas(element, {
      allowTaint: true,
      useCORS: true,
      scale: 1,
      backgroundColor: '#ffffff',
      logging: false
    });

    return new Promise((resolve) => {
      canvas.toBlob((blob) => {
        const url = URL.createObjectURL(blob);
        resolve({
          blob,
          url,
          dataUrl: canvas.toDataURL('image/png'),
          canvas
        });
      }, 'image/png');
    });
  });
};

export const captureAreaScreenshot = async (elementId = 'video-viewer-container', area) => {
  return addToQueue(async () => {
    const element = document.getElementById(elementId);
    if (!element) {
      throw new Error('未找到视频预览区域');
    }

    console.log('Capture area input:', area);

    // 优化html2canvas配置，使用1:1缩放确保坐标准确
    const canvas = await html2canvas(element, {
      allowTaint: true,
      useCORS: true,
      scale: 1, // 使用1:1缩放确保坐标准确
      backgroundColor: '#ffffff',
      logging: false,
      height: element.offsetHeight,
      width: element.offsetWidth,
      scrollX: 0,
      scrollY: 0,
      removeContainer: true,
      foreignObjectRendering: false
    });

    // 使用OffscreenCanvas进行裁剪（如果支持的话）
    const cropImage = (sourceCanvas, cropArea) => {
      if (typeof OffscreenCanvas !== 'undefined') {
        // 使用OffscreenCanvas进行后台处理
        const offscreen = new OffscreenCanvas(cropArea.width, cropArea.height);
        const ctx = offscreen.getContext('2d');

        ctx.drawImage(
          sourceCanvas,
          cropArea.left, cropArea.top, cropArea.width, cropArea.height,
          0, 0, cropArea.width, cropArea.height
        );

        return offscreen;
      } else {
        // 回退到普通Canvas
        const croppedCanvas = document.createElement('canvas');
        const ctx = croppedCanvas.getContext('2d');

        croppedCanvas.width = cropArea.width;
        croppedCanvas.height = cropArea.height;

        ctx.drawImage(
          sourceCanvas,
          cropArea.left, cropArea.top, cropArea.width, cropArea.height,
          0, 0, cropArea.width, cropArea.height
        );

        return croppedCanvas;
      }
    };

    const croppedCanvas = cropImage(canvas, area);

    // 优化blob创建
    return new Promise((resolve) => {
      const createBlobFast = () => {
        if (typeof OffscreenCanvas !== 'undefined' && croppedCanvas.convertToBlob) {
          // 使用OffscreenCanvas的快速blob转换
          croppedCanvas.convertToBlob({
            type: 'image/jpeg', // 使用JPEG格式更快
            quality: 0.9
          }).then(blob => {
            const url = URL.createObjectURL(blob);
            resolve({
              blob,
              url,
              dataUrl: null, // 不创建dataURL以节省时间
              canvas: croppedCanvas
            });
          });
        } else {
          // 普通Canvas快速处理
          croppedCanvas.toBlob(blob => {
            const url = URL.createObjectURL(blob);
            resolve({
              blob,
              url,
              dataUrl: null, // 不创建dataURL以节省时间
              canvas: croppedCanvas
            });
          }, 'image/jpeg', 0.9); // 使用JPEG格式和高质量
        }
      };

      // 立即执行，不延迟
      createBlobFast();
    });
  });
};

export const downloadScreenshot = (dataUrl, filename = 'video-screenshot.png') => {
  const link = document.createElement('a');
  link.download = filename;
  link.href = dataUrl;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};