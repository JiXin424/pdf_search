from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routes import pdf_routes
from app.middleware import DebugMiddleware

app = FastAPI(
    title="PDF搜索系统API",
    description="PDF上传、预览和智能问答系统后端API",
    version="1.0.0"
)

# 添加调试中间件（在开发环境中）
import os
if os.getenv("DEBUG", "true").lower() == "true":
    app.add_middleware(DebugMiddleware)
    print("🔍 调试中间件已启用 - 将记录所有API请求和响应")

# 配置CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 暂时允许所有源，用于调试
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 包含路由
app.include_router(pdf_routes.router, prefix="/api", tags=["PDF"])

@app.get("/")
async def root():
    return {"message": "PDF搜索系统API服务正在运行"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8001)