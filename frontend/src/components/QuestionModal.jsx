import React, { useState } from 'react';

const QuestionModal = ({ isOpen, onClose, screenshot, onSubmit }) => {
  const [question, setQuestion] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!question.trim()) {
      setError('请输入您的问题');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      await onSubmit({
        question: question.trim(),
        screenshot: screenshot
      });

      setQuestion('');
      onClose();
    } catch (err) {
      setError('提交失败，请重试');
      console.error('提交错误:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setQuestion('');
      setError('');
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal">
        <div className="modal-header">
          <h2 className="modal-title">对截图内容提问</h2>
          <button
            className="modal-close"
            onClick={handleClose}
            disabled={isSubmitting}
          >
            ×
          </button>
        </div>

        {error && (
          <div className="error">
            {error}
          </div>
        )}

        {screenshot && (
          <div className="form-group">
            <label className="form-label">截图预览：</label>
            <img
              src={screenshot.url}
              alt="PDF截图"
              className="screenshot-preview"
            />
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="question" className="form-label">
              您的问题：
            </label>
            <textarea
              id="question"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="请描述您对这个截图内容的问题..."
              className="form-input form-textarea"
              disabled={isSubmitting}
              rows="4"
            />
          </div>

          <div className="modal-actions">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleClose}
              disabled={isSubmitting}
            >
              取消
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isSubmitting || !question.trim()}
            >
              {isSubmitting ? '提交中...' : '提交问题'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default QuestionModal;