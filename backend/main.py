from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routes import pdf_routes

app = FastAPI(
    title="PDF搜索系统API",
    description="PDF上传、预览和智能问答系统后端API",
    version="1.0.0"
)

# 配置CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001"],
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
    uvicorn.run(app, host="0.0.0.0", port=8001)