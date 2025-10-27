// ⬛ 1. 环境变量配置（必须最顶部）
require('dotenv').config();

// ⬛ 2. 模块引入（按类型排序：内置→外部→自定义→路由）
// 内置模块
const path = require('path');

// 外部依赖
const express = require('express');
const cors = require('cors');
const serveIndex = require('serve-index');

// 自定义工具
const { responseWrapper } = require('./utils/message');
const { startRenderKeepAlive } = require('./utils/keepalive');
const { swaggerUi, swaggerSpec }= require ('./Swagger/swagger')


// 路由模块
const imageRouter = require('./router/imageRouter');
const emailRouter = require('./router/emailRouter/emailRouter');
const keepaliveRouter = require('./router/keepaliveRouter/keepaliveRouter');
const cloudflareRouter = require('./router/cloudflare/cloudflareRouter');
const mainRouter = require('./router/page/userRouter/userRouter');
const videoRouter = require('./router/videosRouter/videosRouter');
const weatherRouter = require('./router/weatherRouter/weatherRouter');
const pdfTestRouter = require('./router/jwtTestRouter/jwtTestRouter');

// ⬛ 3. 常量定义
const renderUrl = "https://render.setwhat.dpdns.org"; // Render保活地址
const PORT = 3001; // 服务端口

// ⬛ 4. 应用初始化
const app = express();

// ⬛ 5. 中间件配置（按请求流程排序）
// 跨域配置
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'token']
}));

// Swagger API文档
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  explorer: true,
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: "公众号图片压缩与上传服务API文档"
}));

// 响应封装（扩展res.success/res.fail）
app.use(responseWrapper);

// 请求体解析（Express内置，替代body-parser）
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ⬛ 6. 静态资源托管（集中管理）
// 前端构建产物托管
app.use(express.static(path.join(__dirname, 'public/dist')));

// 其他静态目录托管（批量配置）
const staticDirs = [
  { route: '/uploads', dir: 'uploads' },         // 上传文件
  { route: '/download', dir: 'bin' },            // 下载文件
  { route: '/compressed', dir: 'compressed' },   // 压缩文件
  { route: '/picture', dir: 'picture' },         // 图片资源
];
staticDirs.forEach(({ route, dir }) => {
  const absolutePath = path.join(__dirname, dir);
  app.use(route, express.static(absolutePath), serveIndex(absolutePath, { icons: true }));
});

// ⬛ 7. 路由挂载（按API前缀集中）

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec)); // Swagger API文档
// 主路由（/api前缀）
app.use('/api', mainRouter);           // 页面用户相关
app.use('/api', imageRouter);          // 图片处理相关
app.use('/api', emailRouter);          // 邮件发送相关
app.use('/api', keepaliveRouter);      // 保活接口相关
app.use('/api', videoRouter);          // 视频处理相关



// 其他前缀路由
app.use('/api-weather', weatherRouter);   // 天气数据接口
app.use('/api-dns', cloudflareRouter);    // Cloudflare DNS接口
app.use('/compress', pdfTestRouter);      // PDF测试/压缩接口

// ⬛ 8. 错误处理中间件（必须在所有路由之后）
app.use((err, req, res, next) => {
  console.error('全局错误:', err);
  res.status(500).json({ code: 500, message: '服务器内部错误' });
});


// ⬛ 9. 服务启动
app.listen(PORT, () => {
  console.log(`服务启动于 http://localhost:${PORT}`);
  console.log(`📄 API文档地址: ${renderUrl}/api-docs`)
  // 服务启动后开始保活（确保服务已就绪）
  startRenderKeepAlive(`${renderUrl}/api/keepalive`, 4); // 每4分钟保活一次
  
});