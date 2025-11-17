import http.client
import json

conn = http.client.HTTPSConnection("")
payload = json.dumps({
   "model": "gpt-5-mini",
   "messages": [
      {
         "role": "user",
         "content": [
            {
               "type": "text",
               "text": "这张图片有什么"
            },
            
               "type": "image_url",
               "image_url": {
                  "url": "https://github.com/dianping/cat/raw/master/cat-home/src/main/webapp/images/logo/cat_logo03.png"
               }
            }
         ]
      }
   ],
   "stream": True,
   "stream_options": {
      "include_usage": True
   }
})
headers = {
   'Authorization': 'Bearer <token>',
   'Content-Type': 'application/json'
}
conn.request("POST", "/v1/chat/completions", payload, headers)
res = conn.getresponse()
data = res.read()
print(data.decode("utf-8"))