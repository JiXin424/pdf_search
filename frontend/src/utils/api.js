const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8001/api';

export const submitQuestion = async ({ question, screenshot }) => {
  const formData = new FormData();
  formData.append('question', question);

  if (screenshot && screenshot.blob) {
    formData.append('screenshot', screenshot.blob, 'screenshot.png');
  }

  console.log('Submitting to:', `${API_BASE_URL}/ask`);
  console.log('Question:', question);
  console.log('Screenshot blob size:', screenshot?.blob?.size);

  try {
    const response = await fetch(`${API_BASE_URL}/ask`, {
      method: 'POST',
      body: formData,
    });

    console.log('Response status:', response.status);
    console.log('Response ok:', response.ok);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Error response:', errorText);
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    console.log('Success result:', result);
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

export const sendChatMessage = async (message, screenshot = null) => {
  try {
    console.log('Sending chat message to:', `${API_BASE_URL}/chat`);
    console.log('Message:', message);
    console.log('Screenshot:', screenshot ? 'included' : 'none');

    // 统一使用FormData格式，兼容有无截图的情况
    const formData = new FormData();
    formData.append('message', message);
    formData.append('timestamp', new Date().toISOString());

    if (screenshot && screenshot.blob) {
      formData.append('screenshot', screenshot.blob, 'screenshot.png');
    }

    const response = await fetch(`${API_BASE_URL}/chat`, {
      method: 'POST',
      body: formData,
    });

    console.log('Chat response status:', response.status);
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Chat error response:', errorText);
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    console.log('Chat success result:', result);
    return result;
  } catch (error) {
    console.error('聊天请求失败:', error);
    throw new Error('发送消息失败，请检查网络连接');
  }
};

export const getChatHistory = async (limit = 50) => {
  try {
    console.log('Fetching chat history from:', `${API_BASE_URL}/chat/history`);

    const response = await fetch(`${API_BASE_URL}/chat/history?limit=${limit}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    console.log('Chat history response status:', response.status);
    console.log('Chat history response ok:', response.ok);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Chat history error response:', errorText);
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    console.log('Chat history success result:', result);
    return result;
  } catch (error) {
    console.error('获取聊天历史失败:', error);
    throw new Error('获取聊天历史失败，请检查网络连接');
  }
};