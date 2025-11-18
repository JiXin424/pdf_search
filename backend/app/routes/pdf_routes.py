from fastapi import APIRouter, File, UploadFile, Form, HTTPException
from fastapi.responses import JSONResponse, StreamingResponse
from pydantic import BaseModel
from typing import Optional, List
import httpx
import base64
from datetime import datetime
import logging
import asyncio
import json

# 配置日志
logger = logging.getLogger("pdf_routes")
logger.setLevel(logging.INFO)

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
        logger.info(f"🎯 开始处理聊天消息")
        logger.info(f"📝 消息内容: {message}")
        logger.info(f"⏰ 时间戳: {timestamp}")
        logger.info(f"📸 截图文件: {screenshot.filename if screenshot and screenshot.filename else 'None'}")

        if not message:
            logger.warning("❌ 消息内容为空")
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
        logger.info(f"💾 用户消息已保存到历史，ID: {user_message['id']}")

        # 生成AI回复
        if screenshot and getattr(screenshot, 'filename', None):
            logger.info("🖼️  检测到截图，准备调用视觉模型")
            # 有截图的情况，调用视觉模型
            try:
                # 验证文件类型
                if not screenshot.content_type.startswith("image/"):
                    logger.error(f"❌ 文件类型错误: {screenshot.content_type}")
                    raise HTTPException(status_code=400, detail="文件必须是图片格式")

                # 读取图片内容并转为base64
                image_content = await screenshot.read()
                image_size = len(image_content)
                logger.info(f"📷 图片读取成功，大小: {image_size} bytes")

                image_base64 = base64.b64encode(image_content).decode('utf-8')
                logger.info(f"🔧 Base64编码完成，长度: {len(image_base64)}")

                # 调用外部视觉API（与ask接口保持一致）
                api_url = "https://qfgapi.com/v1/chat/completions"
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

                logger.info(f"🌐 准备调用外部API: {api_url}")
                logger.info(f"🤖 使用模型: {payload['model']}")

                # 重试机制
                max_retries = 2
                retry_delay = 3
                last_error = None

                for attempt in range(max_retries + 1):
                    if attempt > 0:
                        logger.info(f"🔄 第 {attempt + 1} 次尝试 (共 {max_retries + 1} 次)")
                        await asyncio.sleep(retry_delay)

                    try:
                        async with httpx.AsyncClient() as client:
                            response = await client.post(api_url, json=payload, headers=headers, timeout=30.0)

                        logger.info(f"📡 API响应状态码: {response.status_code} (尝试 {attempt + 1})")

                        if response.status_code == 200:
                            result = response.json()
                            logger.info(f"✅ API调用成功，响应: {result}")
                            reply = result.get("choices", [{}])[0].get("message", {}).get("content", "抱歉，无法分析这张图片")
                            break
                        elif response.status_code == 503:
                            # 模型过载，记录但继续重试
                            error_text = response.text
                            logger.warning(f"⚠️ 模型过载 (尝试 {attempt + 1}): {error_text}")
                            last_error = f"模型过载: {error_text}"
                            if attempt < max_retries:
                                continue  # 重试
                        elif response.status_code in [401, 403]:
                            # 身份验证错误，不重试
                            logger.error(f"❌ 身份验证失败，状态码: {response.status_code}")
                            logger.error(f"❌ 错误响应: {response.text}")
                            reply = "抱歉，图片分析服务身份验证失败"
                            break
                        else:
                            # 其他错误，记录并可能重试
                            logger.error(f"❌ API调用失败，状态码: {response.status_code}")
                            logger.error(f"❌ 错误响应: {response.text}")
                            last_error = f"API错误 {response.status_code}: {response.text}"

                    except httpx.TimeoutException:
                        logger.warning(f"⏰ 请求超时 (尝试 {attempt + 1})")
                        last_error = "请求超时"
                    except Exception as e:
                        logger.error(f"❌ 网络异常 (尝试 {attempt + 1}): {str(e)}")
                        last_error = f"网络异常: {str(e)}"

                    # 如果是最后一次尝试，设置失败回复
                    if attempt == max_retries:
                        if "模型过载" in str(last_error):
                            reply = "🤖 AI模型当前负载较高，请稍后重试。您也可以稍等几分钟再次发送图片。"
                        else:
                            reply = f"抱歉，图片分析服务暂时不可用 ({last_error})"

            except Exception as e:
                logger.error(f"❌ 视觉API调用错误: {str(e)}")
                logger.error(f"❌ 错误类型: {type(e).__name__}")
                reply = "抱歉，处理图片时发生错误"
        else:
            logger.info("💬 处理纯文本聊天")
            # 纯文本聊天，暂时提供默认回复（AI API调试中）
            reply = f"✅ 聊天接口工作正常！您发送的消息是：「{message}」\n\n🤖 我是AI助手，目前正在调试外部AI API连接。基础聊天功能已经可以使用，包括消息历史记录和截图支持。"

        # 保存AI回复到历史
        bot_message = {
            "id": len(chat_history) * 2,
            "type": "bot",
            "content": reply,
            "timestamp": datetime.now().isoformat()
        }
        chat_history.append(bot_message)
        logger.info(f"🤖 AI回复已保存到历史，ID: {bot_message['id']}")
        logger.info(f"📤 回复内容: {reply[:100]}{'...' if len(reply) > 100 else ''}")

        response_data = {
            "message": reply,
            "reply": reply,  # 兼容前端的不同字段名
            "timestamp": datetime.now().isoformat(),
            "status": "success"
        }

        logger.info(f"✅ 聊天消息处理完成")
        return JSONResponse(response_data)

    except Exception as e:
        logger.error(f"❌ 聊天接口错误: {str(e)}")
        logger.error(f"❌ 错误类型: {type(e).__name__}")
        logger.error(f"❌ 错误详情: {repr(e)}")
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

@router.post("/chat/stream")
async def stream_chat_message(
    message: str = Form(...),
    timestamp: str = Form(None),
    screenshot: UploadFile = File(None)
):
    """
    流式处理聊天消息，实时返回AI回复
    """
    return StreamingResponse(
        stream_chat_response(message, timestamp, screenshot),
        media_type="text/plain"
    )

async def stream_chat_response(message: str, timestamp: str = None, screenshot: UploadFile = None):
    """
    生成流式聊天响应
    """
    try:
        logger.info(f"🎯 开始流式处理聊天消息")
        logger.info(f"📝 消息内容: {message}")
        logger.info(f"⏰ 时间戳: {timestamp}")
        logger.info(f"📸 截图文件: {screenshot.filename if screenshot and screenshot.filename else 'None'}")

        if not message:
            yield "data: " + json.dumps({"error": "消息内容不能为空"}) + "\n\n"
            return

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
        logger.info(f"💾 用户消息已保存到历史，ID: {user_message['id']}")

        # 发送确认消息
        yield "data: " + json.dumps({"type": "user_saved", "message": "消息已接收，AI正在思考..."}) + "\n\n"

        # 生成AI回复
        if screenshot and getattr(screenshot, 'filename', None):
            logger.info("🖼️  检测到截图，准备调用视觉模型")
            async for chunk in stream_vision_response(message, screenshot):
                yield chunk
        else:
            logger.info("💬 处理纯文本聊天")
            async for chunk in stream_text_response(message):
                yield chunk

    except Exception as e:
        logger.error(f"❌ 流式聊天接口错误: {str(e)}")
        yield "data: " + json.dumps({"error": f"处理聊天消息时发生错误: {str(e)}"}) + "\n\n"

async def stream_vision_response(message: str, screenshot: UploadFile):
    """
    流式处理带图片的聊天
    """
    full_response = ""  # 初始化完整响应
    try:
        # 验证文件类型
        if not screenshot.content_type.startswith("image/"):
            yield "data: " + json.dumps({"error": "文件必须是图片格式"}) + "\n\n"
            return

        # 读取图片内容并转为base64
        image_content = await screenshot.read()
        image_size = len(image_content)
        logger.info(f"📷 图片读取成功，大小: {image_size} bytes")

        image_base64 = base64.b64encode(image_content).decode('utf-8')
        logger.info(f"🔧 Base64编码完成，长度: {len(image_base64)}")

        yield "data: " + json.dumps({"type": "processing", "message": "小魁正在思考中..."}) + "\n\n"

        # 首先尝试真正的API调用
        api_url = "https://qfgapi.com/v1/chat/completions"
        headers = {
            "Authorization": f"Bearer sk-2YkjKrSQA22d9panZGC6joYXwZBWdmsJzZ34TUpNwRBMp0JB",
            "Content-Type": "application/json"
        }

        payload = {
            "model": "gemini-2.5-pro-thinking",  # 使用原来的模型
            "stream": True,  # 启用流式响应
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

        logger.info(f"🌐 准备调用流式视觉API: {api_url}")
        logger.info(f"🤖 使用模型: {payload['model']}")

        full_response = ""
        api_success = False

        try:
            async with httpx.AsyncClient() as client:
                async with client.stream('POST', api_url, json=payload, headers=headers, timeout=60.0) as response:
                    if response.status_code == 200:
                        logger.info("✅ 开始接收视觉流式响应")
                        api_success = True
                        async for line in response.aiter_lines():
                            logger.info(f"📥 视觉API收到流式数据行: {line}")
                            if line.startswith('data: '):
                                chunk_data = line[6:]  # 移除 'data: ' 前缀
                                logger.info(f"📦 视觉API处理chunk数据: {chunk_data}")
                                if chunk_data.strip() == '[DONE]':
                                    logger.info("🏁 视觉流式响应完成")
                                    break
                                try:
                                    chunk_json = json.loads(chunk_data)
                                    logger.info(f"📊 视觉API解析的JSON: {chunk_json}")
                                    if 'choices' in chunk_json and len(chunk_json['choices']) > 0:
                                        delta = chunk_json['choices'][0].get('delta', {})
                                        if 'content' in delta:
                                            content = delta['content']
                                            full_response += content
                                            logger.info(f"📝 视觉API发送内容块: {repr(content)}")
                                            yield "data: " + json.dumps({"type": "content", "content": content}) + "\n\n"
                                except json.JSONDecodeError as e:
                                    logger.error(f"❌ 视觉API JSON解析错误: {e}, 原始数据: {chunk_data}")
                                    continue
                    else:
                        # 获取详细的错误信息
                        try:
                            error_response_text = await response.atext()
                            logger.error(f"❌ 视觉API详细错误信息:")
                            logger.error(f"状态码: {response.status_code}")
                            logger.error(f"响应头: {dict(response.headers)}")
                            logger.error(f"错误内容: {error_response_text}")

                            # 尝试解析JSON错误信息
                            try:
                                error_json = json.loads(error_response_text)
                                error_detail = error_json.get('error', {}).get('message', error_response_text)
                            except:
                                error_detail = error_response_text

                            error_msg = f"外部API调用失败(状态码: {response.status_code}): {error_detail}"
                        except Exception as e:
                            error_msg = f"外部API调用失败，状态码: {response.status_code}，无法读取错误详情: {str(e)}"

                        logger.error(f"❌ {error_msg}")
        except Exception as e:
            logger.error(f"❌ API调用异常: {str(e)}")

        # 如果API调用失败，直接输出真实API错误信息
        if not api_success or not full_response.strip():
            logger.info("❌ API调用失败，获取并输出真实错误信息")

            # 尝试获取详细的API错误信息
            error_message = "未知错误"
            try:
                async with httpx.AsyncClient() as client:
                    response = await client.post(api_url, json=payload, headers=headers, timeout=10.0)
                    if response.status_code != 200:
                        error_response = await response.atext()
                        try:
                            error_json = json.loads(error_response)
                            error_message = error_json.get('error', {}).get('message', error_response)
                        except:
                            error_message = error_response
                        logger.error(f"API错误详情: {error_message}")
            except Exception as e:
                error_message = f"网络连接错误: {str(e)}"
                logger.error(f"网络错误: {error_message}")

            # 流式输出真实的API错误信息
            error_output = f"❌ API调用失败\\n\\n错误信息: {error_message}\\n\\n这是来自外部API的真实错误信息，请检查API状态或稍后重试。"
            full_response = error_output

            words = error_output.split()
            for word in words:
                yield "data: " + json.dumps({"type": "content", "content": word + " "}) + "\n\n"
                await asyncio.sleep(0.1)  # 快速显示错误信息

        # 保存AI回复到历史
        bot_message = {
            "id": len(chat_history) * 2,
            "type": "bot",
            "content": full_response,
            "timestamp": datetime.now().isoformat()
        }
        chat_history.append(bot_message)
        logger.info(f"🤖 AI流式回复已保存到历史，ID: {bot_message['id']}")

        yield "data: " + json.dumps({"type": "done", "message": "响应完成"}) + "\n\n"

    except Exception as e:
        logger.error(f"❌ 视觉API流式调用错误: {str(e)}")
        error_response = "抱歉，处理图片时发生错误"

        # 保存错误响应到历史
        bot_message = {
            "id": len(chat_history) * 2,
            "type": "bot",
            "content": error_response,
            "timestamp": datetime.now().isoformat()
        }
        chat_history.append(bot_message)

        yield "data: " + json.dumps({"error": error_response}) + "\n\n"

async def stream_text_response(message: str):
    """
    流式处理纯文本聊天
    """
    try:
        yield "data: " + json.dumps({"type": "processing", "message": "小魁正在思考中..."}) + "\n\n"

        # 调用外部文本API流式响应
        api_url = "https://qfgapi.com/v1/chat/completions"
        headers = {
            "Authorization": f"Bearer sk-2YkjKrSQA22d9panZGC6joYXwZBWdmsJzZ34TUpNwRBMp0JB",
            "Content-Type": "application/json"
        }

        payload = {
            "model": "gemini-2.5-pro-thinking",  # 使用原来的模型
            "stream": True,  # 启用流式响应
            "messages": [
                {
                    "role": "user",
                    "content": message
                }
            ]
        }

        logger.info(f"🌐 准备调用流式文本API: {api_url}")
        logger.info(f"🤖 使用模型: {payload['model']}")
        logger.info(f"💬 用户消息: {message}")

        full_response = ""
        api_success = False

        try:
            async with httpx.AsyncClient() as client:
                async with client.stream('POST', api_url, json=payload, headers=headers, timeout=60.0) as response:
                    if response.status_code == 200:
                        logger.info("✅ 开始接收文本流式响应")
                        api_success = True
                        async for line in response.aiter_lines():
                            logger.info(f"📥 文本API收到流式数据行: {line}")
                            if line.startswith('data: '):
                                chunk_data = line[6:]  # 移除 'data: ' 前缀
                                logger.info(f"📦 文本API处理chunk数据: {chunk_data}")
                                if chunk_data.strip() == '[DONE]':
                                    logger.info("🏁 文本流式响应完成")
                                    break
                                try:
                                    chunk_json = json.loads(chunk_data)
                                    logger.info(f"📊 文本API解析的JSON: {chunk_json}")
                                    if 'choices' in chunk_json and len(chunk_json['choices']) > 0:
                                        delta = chunk_json['choices'][0].get('delta', {})
                                        if 'content' in delta:
                                            content = delta['content']
                                            full_response += content
                                            logger.info(f"📝 文本API发送内容块: {repr(content)}")
                                            yield "data: " + json.dumps({"type": "content", "content": content}) + "\n\n"
                                except json.JSONDecodeError as e:
                                    logger.error(f"❌ 文本API JSON解析错误: {e}, 原始数据: {chunk_data}")
                                    continue
                    else:
                        # 获取详细的错误信息
                        try:
                            error_response_text = await response.atext()
                            logger.error(f"❌ 文本API详细错误信息:")
                            logger.error(f"状态码: {response.status_code}")
                            logger.error(f"响应头: {dict(response.headers)}")
                            logger.error(f"错误内容: {error_response_text}")

                            # 尝试解析JSON错误信息
                            try:
                                error_json = json.loads(error_response_text)
                                error_detail = error_json.get('error', {}).get('message', error_response_text)
                            except:
                                error_detail = error_response_text

                            error_msg = f"外部API调用失败(状态码: {response.status_code}): {error_detail}"
                        except Exception as e:
                            error_msg = f"外部API调用失败，状态码: {response.status_code}，无法读取错误详情: {str(e)}"

                        logger.error(f"❌ {error_msg}")
        except Exception as e:
            logger.error(f"❌ API调用异常: {str(e)}")

        # 如果API调用失败，直接输出真实API错误信息
        if not api_success or not full_response.strip():
            logger.info("❌ API调用失败，获取并输出真实错误信息")

            # 尝试获取详细的API错误信息
            error_message = "未知错误"
            try:
                async with httpx.AsyncClient() as client:
                    response = await client.post(api_url, json=payload, headers=headers, timeout=10.0)
                    if response.status_code != 200:
                        error_response = await response.atext()
                        try:
                            error_json = json.loads(error_response)
                            error_message = error_json.get('error', {}).get('message', error_response)
                        except:
                            error_message = error_response
                        logger.error(f"API错误详情: {error_message}")
            except Exception as e:
                error_message = f"网络连接错误: {str(e)}"
                logger.error(f"网络错误: {error_message}")

            # 流式输出真实的API错误信息
            error_output = f"❌ API调用失败\\n\\n错误信息: {error_message}\\n\\n这是来自外部API的真实错误信息，请检查API状态或稍后重试。"
            full_response = error_output

            words = error_output.split()
            for word in words:
                yield "data: " + json.dumps({"type": "content", "content": word + " "}) + "\n\n"
                await asyncio.sleep(0.1)  # 快速显示错误信息

        # 保存AI回复到历史
        bot_message = {
            "id": len(chat_history) * 2,
            "type": "bot",
            "content": full_response,
            "timestamp": datetime.now().isoformat()
        }
        chat_history.append(bot_message)
        logger.info(f"🤖 AI流式回复已保存到历史，ID: {bot_message['id']}")

        yield "data: " + json.dumps({"type": "done", "message": "响应完成"}) + "\n\n"

    except Exception as e:
        logger.error(f"❌ 文本流式响应错误: {str(e)}")
        yield "data: " + json.dumps({"error": f"处理消息时发生错误: {str(e)}"}) + "\n\n"