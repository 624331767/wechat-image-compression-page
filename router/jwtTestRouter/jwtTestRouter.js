const express = require('express');
const router = express.Router();

// 引入控制器函数
const {
  handleCompress,               // 压缩 PDF（上传或通过 URL）
  handleChunkUpload,            // 分片上传
  handleMergeChunks,            // 合并分片并压缩
  checkGhostscript,             // 检查是否安装 Ghostscript
  uploadAndConvertPdf,          // 上传 PDF 并转为图片
  handleMergeChunksConvert,     // 分片合并 + 压缩 + 转图片（异步任务）
  queryTaskStatus,              // 查询异步任务状态
  getproxyIP,                    // 获取客户端 IP 归属地信息
  getproxyLogs,
  getproxyLogsText
} = require('../../controllers/jwtTest/jwtTest');

// 引入文件上传中间件（用于单个文件上传）
const { singleFile } = require('../../utils/upload');

/**
 * =====================================================================================
 *  📄 PDF 压缩与上传相关接口
 * =====================================================================================
 */

// 📌 通用压缩接口（支持上传或 URL 提交 PDF）
router.post('/', handleCompress);

// 📌 分片上传（使用 Multer 单文件中间件）
router.post('/chunk', singleFile, handleChunkUpload);

// 📌 分片合并并压缩
router.post('/merge', handleMergeChunks);

// 📌 上传 PDF 并转成多张图片（144 DPI）
router.post('/upload/pdf', singleFile, uploadAndConvertPdf);

// 📌 分片合并 + 压缩 + 转 PNG（最低分辨率，异步执行）
router.post('/merge-chunks-convert', handleMergeChunksConvert);

// 📌 查询异步任务状态
router.get('/task-status', queryTaskStatus);

/**
 * =====================================================================================
 *  🛠️ 工具类接口
 * =====================================================================================
 */

// 📌 检查 Ghostscript 安装状态
router.get('/gs-check', checkGhostscript);

// 📌 获取客户端 IP 及归属地信息
router.get('/proxy-ip', getproxyIP);


// 📌 获取客户端 IP 及归属地信息数据
router.get('/proxy-logs', getproxyLogs);


router.get('/proxy-test', getproxyLogsText);

// 导出路由模块
module.exports = router;
