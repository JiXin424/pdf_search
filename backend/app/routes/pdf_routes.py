from fastapi import APIRouter, File, UploadFile, Form, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import Optional, List
import httpx
import base64
from datetime import datetime

router = APIRouter()

# 数据模型
class ChatMessage(BaseModel):
    message: str
    timestamp: Optional[str] = None

class ChatResponse(BaseModel):
    message: str
    reply: str
    timestamp: str

# 简单的内存存储（生产环境应使用数据库）
chat_history: List[dict] = []

@router.get("/health")
async def health_check():
    """
    健康检查接口
    """
    return {"status": "ok", "message": "PDF API服务正常运行"}

@router.post("/chat")
async def send_chat_message(
    message: str = Form(...),
    timestamp: str = Form(None),
    screenshot: UploadFile = File(None)
):
    """
    处理聊天消息，支持文本和可选的截图
    """
    return await process_chat_message(message, timestamp, screenshot)

async def process_chat_message(message: str, timestamp: str = None, screenshot: UploadFile = None):
    """
    统一处理聊天消息的核心逻辑
    """
    try:
        if not message:
            raise HTTPException(status_code=400, detail="消息内容不能为空")

        current_time = timestamp or datetime.now().isoformat()

        # 保存用户消息到历史
        user_message = {
            "id": len(chat_history) * 2 + 1,
            "type": "user",
            "content": message,
            "timestamp": current_time,
            "hasScreenshot": screenshot is not None and getattr(screenshot, 'filename', None) is not None
        }
        chat_history.append(user_message)

        # 生成AI回复
        if screenshot and getattr(screenshot, 'filename', None):
            # 有截图的情况，调用视觉模型
            try:
                # 验证文件类型
                if not screenshot.content_type.startswith("image/"):
                    raise HTTPException(status_code=400, detail="文件必须是图片格式")

                # 读取图片内容并转为base64
                image_content = await screenshot.read()
                image_base64 = base64.b64encode(image_content).decode('utf-8')

                # 调用外部视觉API（与ask接口保持一致）
                api_url = "https://qfgapi.com/v1/chat/completions"  # 修复：添加完整路径
                headers = {
                    "Authorization": f"Bearer sk-2YkjKrSQA22d9panZGC6joYXwZBWdmsJzZ34TUpNwRBMp0JB",
                    "Content-Type": "application/json"
                }

                payload = {
                    "model": "gemini-2.5-pro-thinking",
                    "messages": [
                        {
                            "role": "user",
                            "content": [
                                {
                                    "type": "text",
                                    "text": message
                                },
                                {
                                    "type": "image_url",
                                    "image_url": {
                                        "url": f"data:image/{screenshot.content_type.split('/')[-1]};base64,{image_base64}"
                                    }
                                }
                            ]
                        }
                    ]
                }

                async with httpx.AsyncClient() as client:
                    response = await client.post(api_url, json=payload, headers=headers, timeout=30.0)

                if response.status_code == 200:
                    result = response.json()
                    reply = result.get("choices", [{}])[0].get("message", {}).get("content", "抱歉，无法分析这张图片")
                else:
                    reply = "抱歉，图片分析服务暂时不可用"

            except Exception as e:
                print(f"视觉API调用错误: {str(e)}")
                reply = "抱歉，处理图片时发生错误"
        else:
            # 纯文本聊天，暂时提供默认回复（AI API调试中）
            reply = f"✅ 聊天接口工作正常！您发送的消息是：「{message}」\\n\\n🤖 我是AI助手，目前正在调试外部AI API连接。基础聊天功能已经可以使用，包括消息历史记录和截图支持。"

        # 保存AI回复到历史
        bot_message = {
            "id": len(chat_history) * 2,
            "type": "bot",
            "content": reply,
            "timestamp": datetime.now().isoformat()
        }
        chat_history.append(bot_message)

        return JSONResponse({
            "message": reply,
            "reply": reply,  # 兼容前端的不同字段名
            "timestamp": datetime.now().isoformat(),
            "status": "success"
        })

    except Exception as e:
        print(f"聊天接口错误: {str(e)}")
        print(f"错误类型: {type(e).__name__}")
        print(f"错误详情: {repr(e)}")
        raise HTTPException(status_code=500, detail=f"处理聊天消息时发生错误: {str(e)}")

@router.get("/chat/history")
async def get_chat_history(limit: int = 50):
    """
    获取聊天历史记录
    """
    try:
        # 返回最近的消息，按时间倒序
        recent_history = chat_history[-limit:] if limit < len(chat_history) else chat_history

        return JSONResponse({
            "messages": recent_history,
            "total": len(chat_history),
            "status": "success"
        })

    except Exception as e:
        print(f"获取聊天历史错误: {str(e)}")
        raise HTTPException(status_code=500, detail=f"获取聊天历史时发生错误: {str(e)}")