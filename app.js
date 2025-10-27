// ======================================================
// 1️⃣ 环境变量配置（必须最顶部）
// ======================================================
require('dotenv').config();

// ======================================================
// 2️⃣ 模块引入（按类型排序：内置 → 外部 → 自定义 → 路由）
// ======================================================

// 内置模块
const path = require('path');

// 外部依赖
const express = require('express');
const cors = require('cors');
const serveIndex = require('serve-index');

// 自定义工具
const { responseWrapper } = require('./utils/message');
const { startRenderKeepAlive } = require('./utils/keepalive');
const { swaggerUi, swaggerSpec } = require('./Swagger/swagger');
const apiLoggerMiddleware = require('./updateDate/newData');

// 路由模块
const imageRouter = require('./router/imageRouter');
const emailRouter = require('./router/emailRouter/emailRouter');
const keepaliveRouter = require('./router/keepaliveRouter/keepaliveRouter');
const cloudflareRouter = require('./router/cloudflare/cloudflareRouter');
const mainRouter = require('./router/page/userRouter/userRouter');
const videoRouter = require('./router/videosRouter/videosRouter');
const weatherRouter = require('./router/weatherRouter/weatherRouter');
const pdfTestRouter = require('./router/jwtTestRouter/jwtTestRouter');

// ======================================================
// 3️⃣ 常量定义
// ======================================================
const PORT = 3001; // 服务端口
const renderUrl = "https://render.setwhat.dpdns.org"; // Render 保活地址

// ======================================================
// 4️⃣ 应用初始化
// ======================================================
const app = express();

// ======================================================
// 5️⃣ 全局中间件配置（按请求处理顺序）
// ======================================================

// 5.1 跨域配置
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'token']
}));

// 5.2 接口访问日志（自定义中间件）
app.use(apiLoggerMiddleware);

// 5.3 响应封装（扩展 res.success / res.fail）
app.use(responseWrapper);

// 5.4 请求体解析（JSON / URL-encoded）
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 5.5 Swagger API 文档
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  explorer: true,
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: "公众号图片压缩与上传服务API文档"
}));

// ======================================================
// 6️⃣ 静态资源托管
// ======================================================

// 6.1 前端构建产物
app.use(express.static(path.join(__dirname, 'public/dist')));

// 6.2 上传 / 下载 / 压缩 / 图片资源
const staticDirs = [
  { route: '/uploads', dir: 'uploads' },
  { route: '/download', dir: 'bin' },
  { route: '/compressed', dir: 'compressed' },
  { route: '/picture', dir: 'picture' },
];

staticDirs.forEach(({ route, dir }) => {
  const absolutePath = path.join(__dirname, dir);
  app.use(route, express.static(absolutePath), serveIndex(absolutePath, { icons: true }));
});

// ======================================================
// 7️⃣ 路由挂载
// ======================================================

// 7.1 主路由（/api 前缀）
app.use('/api', mainRouter);           // 页面用户相关
app.use('/api', imageRouter);          // 图片处理相关
app.use('/api', emailRouter);          // 邮件发送相关
app.use('/api', keepaliveRouter);      // 保活接口相关
app.use('/api', videoRouter);          // 视频处理相关

// 7.2 其他前缀路由
app.use('/api-weather', weatherRouter);   // 天气数据接口
app.use('/api-dns', cloudflareRouter);    // Cloudflare DNS 接口
app.use('/compress', pdfTestRouter);      // PDF 测试 / 压缩接口

// ======================================================
// 8️⃣ 全局错误处理（必须在所有路由之后）
// ======================================================
app.use((err, req, res, next) => {
  console.error('全局错误:', err);
  res.status(500).json({ code: 500, message: '服务器内部错误' });
});

// ======================================================
// 9️⃣ 服务启动
// ======================================================
app.listen(PORT, () => {
  console.log(`✅ 服务启动于 http://localhost:${PORT}`);
  console.log(`📄 API 文档地址: ${renderUrl}/api-docs`);

  // 9.1 服务启动后开始 Render 保活（每 4 分钟一次）
  startRenderKeepAlive(`${renderUrl}/api/keepalive`, 4);
});
