import json
import time
from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response
import logging

# 配置日志
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger("api_debug")

class DebugMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        # 记录请求开始时间
        start_time = time.time()

        # 获取请求信息
        method = request.method
        url = str(request.url)
        path = request.url.path

        # 获取请求头
        headers = dict(request.headers)

        # 记录请求详情
        logger.info("=" * 80)
        logger.info(f"🚀 [{method}] {path}")
        logger.info(f"📍 完整URL: {url}")
        logger.info(f"🔗 客户端: {headers.get('host', 'unknown')}")
        logger.info(f"🌐 User-Agent: {headers.get('user-agent', 'unknown')[:100]}...")

        # 记录查询参数
        if request.query_params:
            logger.info(f"🔍 查询参数: {dict(request.query_params)}")

        # 执行请求
        try:
            response = await call_next(request)

            # 计算处理时间
            process_time = time.time() - start_time

            # 记录响应详情
            status_emoji = "✅" if response.status_code < 400 else "❌"
            logger.info(f"{status_emoji} 响应状态: {response.status_code}")
            logger.info(f"⏱️  处理时间: {process_time:.3f}秒")
            logger.info("=" * 80)

            return response

        except Exception as e:
            # 记录错误
            process_time = time.time() - start_time
            logger.error(f"❌ 请求处理错误: {str(e)}")
            logger.error(f"⏱️  错误时间: {process_time:.3f}秒")
            logger.info("=" * 80)
            raise