// Cloudflare Pages Function
// 路徑：/api/read  （檔案放在 functions/api/read.js）
// 作用：從前端接收圖片，用存在 Cloudflare 後台的金鑰呼叫 Claude，回傳結果。
// 金鑰不會出現在前端網頁，使用者看不到。

export async function onRequestPost(context) {
  const { request, env } = context;

  // CORS（同網域其實不需要，但保留以防萬一）
  const cors = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };

  try {
    if (!env.ANTHROPIC_API_KEY) {
      return json({ error: "伺服器尚未設定金鑰（ANTHROPIC_API_KEY）" }, 500, cors);
    }

    const payload = await request.json();
    const { imageData, imageMime, prompt } = payload;
    if (!imageData || !prompt) {
      return json({ error: "缺少圖片或提示內容" }, 400, cors);
    }

    const body = {
      model: "claude-sonnet-4-6",
      max_tokens: 4000,
      messages: [{
        role: "user",
        content: [
          { type: "image", source: { type: "base64", media_type: imageMime, data: imageData } },
          { type: "text", text: prompt }
        ]
      }]
    };

    const resp = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify(body)
    });

    if (!resp.ok) {
      const errText = await resp.text();
      return json({ error: "AI 服務回應異常（" + resp.status + "）", detail: errText }, 502, cors);
    }

    const data = await resp.json();
    const text = (data.content || []).filter(i => i.type === "text").map(i => i.text).join("");
    return json({ text }, 200, cors);

  } catch (err) {
    return json({ error: "後端處理失敗：" + err.message }, 500, cors);
  }
}

// 處理瀏覽器的預檢請求
export async function onRequestOptions() {
  return new Response(null, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    }
  });
}

function json(obj, status, cors) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "Content-Type": "application/json", ...(cors || {}) }
  });
}
