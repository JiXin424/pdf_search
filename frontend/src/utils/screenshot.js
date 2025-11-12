import html2canvas from 'html2canvas';

export const captureScreenshot = async (elementId = 'pdf-viewer-container') => {
  try {
    const element = document.getElementById(elementId);
    if (!element) {
      throw new Error('未找到PDF预览区域');
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
  } catch (error) {
    console.error('截图失败:', error);
    throw error;
  }
};

export const captureAreaScreenshot = async (elementId = 'pdf-viewer-container', area) => {
  try {
    const element = document.getElementById(elementId);
    if (!element) {
      throw new Error('未找到PDF预览区域');
    }

    const canvas = await html2canvas(element, {
      allowTaint: true,
      useCORS: true,
      scale: 1,
      backgroundColor: '#ffffff',
      logging: false
    });

    // 创建新的canvas来裁剪选定区域
    const croppedCanvas = document.createElement('canvas');
    const ctx = croppedCanvas.getContext('2d');

    croppedCanvas.width = area.width;
    croppedCanvas.height = area.height;

    // 从原始canvas中裁剪指定区域
    ctx.drawImage(
      canvas,
      area.left, area.top, area.width, area.height,  // 源区域
      0, 0, area.width, area.height                    // 目标区域
    );

    return new Promise((resolve) => {
      croppedCanvas.toBlob((blob) => {
        const url = URL.createObjectURL(blob);
        resolve({
          blob,
          url,
          dataUrl: croppedCanvas.toDataURL('image/png'),
          canvas: croppedCanvas
        });
      }, 'image/png');
    });
  } catch (error) {
    console.error('区域截图失败:', error);
    throw error;
  }
};

export const downloadScreenshot = (dataUrl, filename = 'pdf-screenshot.png') => {
  const link = document.createElement('a');
  link.download = filename;
  link.href = dataUrl;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};