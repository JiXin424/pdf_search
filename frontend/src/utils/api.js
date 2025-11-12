const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

export const submitQuestion = async ({ question, screenshot }) => {
  const formData = new FormData();
  formData.append('question', question);

  if (screenshot && screenshot.blob) {
    formData.append('screenshot', screenshot.blob, 'screenshot.png');
  }

  try {
    const response = await fetch(`${API_BASE_URL}/ask`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    return result;
  } catch (error) {
    console.error('API请求失败:', error);
    throw new Error('发送问题失败，请检查网络连接');
  }
};

export const uploadPDF = async (file) => {
  const formData = new FormData();
  formData.append('pdf', file);

  try {
    const response = await fetch(`${API_BASE_URL}/upload`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    return result;
  } catch (error) {
    console.error('PDF上传失败:', error);
    throw new Error('PDF上传失败，请重试');
  }
};