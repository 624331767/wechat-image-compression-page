// utils/keepAlive.js

/**
 * 启动 Render 保活任务
 * @param {string} url - Render 应用地址（注意访问 /api/ping）
 * @param {number} intervalMinutes - 间隔时间（分钟）
 */
function startRenderKeepAlive(url, intervalMinutes = 10) {
  console.log(process.env.RENDER || process.env.NODE_ENV === 'production');

  // 只在 Render 或生产环境启用
  if (process.env.RENDER || process.env.NODE_ENV === 'production') {
    console.log("🚀 Render 环境检测到，启动保活任务...");

    async function keepAlive() {
      try {
        const res = await fetch(url);
        console.log(`[Render 保活] ${new Date().toLocaleString()} - 状态码: ${res.status}`);
      } catch (err) {
        console.error(`[Render 保活失败] ${new Date().toLocaleString()} - 错误: ${err.message}`);
      }
    }

    keepAlive(); // 启动时立即访问一次
    setInterval(keepAlive, intervalMinutes * 60 * 1000); // 定时访问
  } else {
    console.log("💻 本地开发环境检测到，跳过 Render 保活任务。");
  }
}

module.exports = { startRenderKeepAlive };
