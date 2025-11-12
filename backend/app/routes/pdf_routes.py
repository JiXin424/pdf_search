from fastapi import APIRouter, File, UploadFile, Form, HTTPException
from fastapi.responses import JSONResponse
import aiofiles
import os

router = APIRouter()

@router.post("/ask")
async def ask_question(
    question: str = Form(...),
    screenshot: UploadFile = File(...)
):
    """
    处理用户问题和截图
    """
    # 验证文件类型
    if not screenshot.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="文件必须是图片格式")

    # 简单的hello world响应
    return JSONResponse({
        "answer": f"Hello World! 我收到了你的问题：'{question}' 和一张截图文件：'{screenshot.filename}'。这是一个测试响应！",
        "question": question,
        "screenshot_filename": screenshot.filename,
        "status": "success"
    })

@router.post("/upload")
async def upload_pdf(
    pdf: UploadFile = File(...)
):
    """
    上传PDF文件
    """
    # 验证文件类型
    if not pdf.content_type == "application/pdf":
        raise HTTPException(status_code=400, detail="文件必须是PDF格式")

    # 保存PDF文件
    upload_dir = "uploads/pdfs"
    os.makedirs(upload_dir, exist_ok=True)

    file_path = os.path.join(upload_dir, pdf.filename)
    async with aiofiles.open(file_path, 'wb') as f:
        content = await pdf.read()
        await f.write(content)

    return JSONResponse({
        "message": "PDF上传成功",
        "filename": pdf.filename,
        "file_path": file_path
    })

@router.get("/health")
async def health_check():
    """
    健康检查接口
    """
    return {"status": "ok", "message": "PDF API服务正常运行"}