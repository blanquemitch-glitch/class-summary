// 后端：拿着你的 API Key 去调用豆包。Key 只放在平台环境变量里，不在代码中。
module.exports = async (req, res) => {
  if (req.method !== "POST") return res.status(405).json({ error: "请使用 POST 请求" });

  const { ARK_API_KEY, ARK_MODEL, ACCESS_CODE } = process.env;
  if (!ARK_API_KEY || !ARK_MODEL || !ACCESS_CODE) {
    return res.status(500).json({ error: "服务器还没配置完：需要 ARK_API_KEY、ARK_MODEL、ACCESS_CODE" });
  }
  if (req.headers["x-access-code"] !== ACCESS_CODE) {
    return res.status(401).json({ error: "访问口令不对" });
  }

  const body = req.body || {};
  const notes = String(body.notes || "").trim().slice(0, 20000);
  const course = String(body.course || "").trim().slice(0, 50);
  const date = String(body.date || "").slice(0, 10);
  if (!notes) return res.status(400).json({ error: "没有收到课堂内容" });

  const prompt =
    "你是学生的课后复习助手。下面是" + (course ? "《" + course + "》" : "一节课") +
    "的笔记或录音转写，日期：" + date + "。\n" +
    "请用简体中文输出纯文本，不要使用 Markdown 符号（不要 #、*、**）。严格按下面四部分输出，每部分以【】标题开头：\n" +
    "【一句话概括】\n【重点内容】3到6条，每条一行，以“- ”开头\n【需要记住的概念和公式】\n【作业与待办】\n" +
    "原文没有提到的部分写“无”，不要编造内容。\n\n课堂内容：\n" + notes;

  try {
    const r = await fetch("https://ark.cn-beijing.volces.com/api/v3/chat/completions", {
      method: "POST",
      headers: { "Authorization": "Bearer " + ARK_API_KEY, "Content-Type": "application/json" },
      body: JSON.stringify({ model: ARK_MODEL, messages: [{ role: "user", content: prompt }] })
    });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) {
      return res.status(502).json({ error: (data.error && data.error.message) || "模型服务返回错误" });
    }
    const summary = data.choices && data.choices[0] && data.choices[0].message &&
      String(data.choices[0].message.content || "").trim();
    if (!summary) return res.status(502).json({ error: "模型没有返回内容" });
    return res.status(200).json({ summary });
  } catch (e) {
    return res.status(502).json({ error: "连接模型服务失败，请稍后再试" });
  }
};
