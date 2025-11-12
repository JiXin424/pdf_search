# PDF智能问答系统

一个基于React + FastAPI的PDF上传、预览和智能问答系统。

## 项目结构

```
pdf_search/
├── frontend/          # React前端
│   ├── src/           # 源代码
│   │   ├── components/ # React组件
│   │   ├── utils/     # 工具函数
│   │   └── App.jsx    # 主应用组件
│   ├── public/        # 静态资源
│   ├── package.json   # 前端依赖
│   ├── vite.config.js # Vite配置
│   └── .env           # 环境变量
├── backend/           # FastAPI后端
│   ├── app/           # 应用代码
│   │   ├── routes/    # API路由
│   │   ├── models/    # 数据模型
│   │   ├── services/  # 业务逻辑
│   │   └── utils/     # 工具函数
│   ├── uploads/       # 上传文件目录
│   ├── main.py        # 主应用文件
│   ├── test_server.py # 测试服务器
│   └── requirements.txt # 后端依赖
└── README.md          # 项目说明
```

## 功能特性

### 前端功能
- 📄 PDF文件上传（拖拽/点击）
- 📜 滚动式PDF预览
- 🔍 矩形放大镜（实时跟随鼠标）
- ✂️ 智能区域截图（可拖拽调整选择区域）
- 📱 页面跳转输入框
- 💬 截图问答界面（Modal弹窗）
- 🎯 实时问答记录展示
- ✅ 成功提交后弹窗提醒

### 后端功能
- 🚀 FastAPI异步框架
- 📤 文件上传处理（支持PDF和图片）
- 🔗 CORS跨域支持
- 📋 API文档自动生成
- 🔍 健康检查接口
- 💭 问答接口（接收问题和截图）

## 快速开始

### 前端启动

```bash
cd frontend
npm install
npm run dev
```

前端将运行在 `http://localhost:3000`

### 后端启动

```bash
cd backend
pip install -r requirements.txt
python main.py
```

后端将运行在 `http://localhost:8001`

API文档：`http://localhost:8001/docs`

## 端口配置

- **前端端口**：可在 `frontend/vite.config.js` 中修改
- **后端端口**：可在 `backend/main.py` 中修改
- **API地址**：在 `frontend/.env` 中配置 `VITE_API_URL`

## API接口

- `GET /` - 服务状态检查
- `GET /api/health` - 健康检查
- `POST /api/ask` - 提交问题和截图（返回Hello World响应）
- `POST /api/upload` - 上传PDF文件

## 技术栈

### 前端
- React 18
- Vite（构建工具）
- react-pdf（PDF渲染）
- html2canvas（截图功能）

### 后端
- FastAPI（Web框架）
- Uvicorn（ASGI服务器）
- Pydantic（数据验证）
- aiofiles（异步文件处理）
- python-multipart（文件上传支持）

## 使用流程

1. **启动服务**：先启动后端，再启动前端
2. **上传PDF**：拖拽或点击上传PDF文件
3. **预览文档**：滚动浏览PDF内容，使用放大镜查看细节
4. **智能截图**：点击截图按钮，拖拽选择感兴趣的区域
5. **提问互动**：在弹出的对话框中输入问题
6. **获取答案**：提交后会收到"Hello World"测试响应
7. **查看记录**：所有问答记录会保存在页面下方

## 开发说明

- 前端环境变量：`frontend/.env`
- 后端环境变量：`backend/.env`
- 上传文件存储：`backend/uploads/`
- 测试服务器：`backend/test_server.py`（用于调试）

## 故障排除

### 常见问题

1. **提交卡在"提交中"**
   - 检查后端是否启动
   - 确认端口配置正确（前端.env中的API地址）

2. **PDF无法显示**
   - 确保PDF文件格式正确
   - 检查浏览器控制台错误信息

3. **截图功能异常**
   - 检查html2canvas库是否正确加载
   - 确保PDF容器元素存在

## 许可证

MIT License
