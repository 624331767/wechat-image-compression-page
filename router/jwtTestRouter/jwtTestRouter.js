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
 * @swagger
 * tags:
 *   name: PDF处理
 *   description: PDF压缩、转换和上传相关接口
 * 
 * components:
 *   schemas:
 *     TaskStatus:
 *       type: object
 *       properties:
 *         taskId:
 *           type: string
 *           description: 任务ID
 *         status:
 *           type: string
 *           enum: [pending, processing, completed, failed]
 *           description: 任务状态(pending-等待中, processing-处理中, completed-已完成, failed-失败)
 *         progress:
 *           type: number
 *           description: 任务进度(0-100)
 *         result:
 *           type: object
 *           description: 任务结果数据
 *     ChunkInfo:
 *       type: object
 *       properties:
 *         chunkIndex:
 *           type: integer
 *           description: 分片索引
 *         totalChunks:
 *           type: integer
 *           description: 总分片数
 *         fileHash:
 *           type: string
 *           description: 文件哈希值
 *         filename:
 *           type: string
 *           description: 原始文件名
 *     MergeRequest:
 *       type: object
 *       properties:
 *         fileHash:
 *           type: string
 *           description: 文件哈希值
 *         filename:
 *           type: string
 *           description: 原始文件名
 *         totalChunks:
 *           type: integer
 *           description: 总分片数
 *     ProxyIPResponse:
 *       type: object
 *       properties:
 *         ip:
 *           type: string
 *           description: 客户端IP地址
 *         location:
 *           type: object
 *           description: IP归属地信息
 */

/**
 * =====================================================================================
 *  📄 PDF 压缩与上传相关接口
 * =====================================================================================
 */

// 📌 通用压缩接口（支持上传或 URL 提交 PDF）
/**
 * @swagger
 * /api/jwt/test:
 *   post:
 *     summary: PDF压缩接口
 *     description: 支持通过文件上传或URL提交PDF进行压缩
 *     tags: [PDF处理]
 *     consumes:
 *       - multipart/form-data
 *     parameters:
 *       - in: formData
 *         name: file
 *         type: file
 *         description: 要上传的PDF文件
 *       - in: formData
 *         name: pdfUrl
 *         type: string
 *         description: PDF文件的URL地址(与file二选一)
 *       - in: formData
 *         name: quality
 *         type: string
 *         enum: [screen, ebook, printer, prepress]
 *         default: ebook
 *         description: 压缩质量(screen-屏幕质量,ebook-电子书质量,printer-打印质量,prepress-印刷质量)
 *     responses:
 *       200:
 *         description: 压缩成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 code:
 *                   type: integer
 *                   example: 200
 *                 message:
 *                   type: string
 *                   example: "压缩成功"
 *                 data:
 *                   type: object
 *                   properties:
 *                     originalSize:
 *                       type: integer
 *                       description: 原始文件大小(字节)
 *                     compressedSize:
 *                       type: integer
 *                       description: 压缩后文件大小(字节)
 *                     compressionRatio:
 *                       type: number
 *                       description: 压缩比例
 *                     downloadUrl:
 *                       type: string
 *                       description: 压缩文件下载地址
 *       400:
 *         description: 请求参数错误
 *       500:
 *         description: 服务器错误
 */
router.post('/', handleCompress);

// 📌 分片上传（使用 Multer 单文件中间件）
/**
 * @swagger
 * /api/jwt/test/chunk:
 *   post:
 *     summary: 分片上传接口
 *     description: 用于大文件分片上传的单个分片处理
 *     tags: [PDF处理]
 *     consumes:
 *       - multipart/form-data
 *     parameters:
 *       - in: formData
 *         name: file
 *         type: file
 *         required: true
 *         description: 分片文件
 *       - in: formData
 *         name: chunkIndex
 *         type: integer
 *         required: true
 *         description: 当前分片索引
 *       - in: formData
 *         name: totalChunks
 *         type: integer
 *         required: true
 *         description: 总分片数
 *       - in: formData
 *         name: fileHash
 *         type: string
 *         required: true
 *         description: 完整文件的哈希值
 *       - in: formData
 *         name: filename
 *         type: string
 *         required: true
 *         description: 原始文件名
 *     responses:
 *       200:
 *         description: 分片上传成功
 *       400:
 *         description: 请求参数错误
 *       500:
 *         description: 服务器错误
 */
router.post('/chunk', singleFile, handleChunkUpload);

// 📌 分片合并并压缩
/**
 * @swagger
 * /api/jwt/test/merge:
 *   post:
 *     summary: 分片合并并压缩
 *     description: 将上传的所有分片合并为完整文件并进行压缩
 *     tags: [PDF处理]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/MergeRequest'
 *     responses:
 *       200:
 *         description: 合并压缩成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 code:
 *                   type: integer
 *                   example: 200
 *                 message:
 *                   type: string
 *                   example: "合并压缩成功"
 *                 data:
 *                   type: object
 *                   properties:
 *                     originalSize:
 *                       type: integer
 *                       description: 原始文件大小(字节)
 *                     compressedSize:
 *                       type: integer
 *                       description: 压缩后文件大小(字节)
 *                     compressionRatio:
 *                       type: number
 *                       description: 压缩比例
 *                     downloadUrl:
 *                       type: string
 *                       description: 压缩文件下载地址
 *       400:
 *         description: 请求参数错误
 *       500:
 *         description: 服务器错误
 */
router.post('/merge', handleMergeChunks);

// 📌 上传 PDF 并转成多张图片（144 DPI）
/**
 * @swagger
 * /api/jwt/test/upload/pdf:
 *   post:
 *     summary: 上传PDF并转为图片
 *     description: 上传PDF文件并转换为多张PNG图片(144 DPI)
 *     tags: [PDF处理]
 *     consumes:
 *       - multipart/form-data
 *     parameters:
 *       - in: formData
 *         name: file
 *         type: file
 *         required: true
 *         description: 要上传的PDF文件
 *       - in: formData
 *         name: dpi
 *         type: integer
 *         default: 144
 *         description: 图片分辨率DPI值
 *     responses:
 *       200:
 *         description: 转换成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 code:
 *                   type: integer
 *                   example: 200
 *                 message:
 *                   type: string
 *                   example: "转换成功"
 *                 data:
 *                   type: object
 *                   properties:
 *                     images:
 *                       type: array
 *                       items:
 *                         type: string
 *                       description: 转换后的图片URL列表
 *       400:
 *         description: 请求参数错误
 *       500:
 *         description: 服务器错误
 */
router.post('/upload/pdf', singleFile, uploadAndConvertPdf);

// 📌 分片合并 + 压缩 + 转 PNG（最低分辨率，异步执行）
/**
 * @swagger
 * /api/jwt/test/merge-chunks-convert:
 *   post:
 *     summary: 分片合并并转换为图片(异步)
 *     description: 将上传的所有分片合并为完整文件，压缩后转换为PNG图片(异步任务)
 *     tags: [PDF处理]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             allOf:
 *               - $ref: '#/components/schemas/MergeRequest'
 *               - type: object
 *                 properties:
 *                   dpi:
 *                     type: integer
 *                     default: 72
 *                     description: 图片分辨率DPI值
 *     responses:
 *       200:
 *         description: 任务已创建
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 code:
 *                   type: integer
 *                   example: 200
 *                 message:
 *                   type: string
 *                   example: "任务已创建"
 *                 data:
 *                   type: object
 *                   properties:
 *                     taskId:
 *                       type: string
 *                       description: 任务ID，用于查询任务状态
 *       400:
 *         description: 请求参数错误
 *       500:
 *         description: 服务器错误
 */
router.post('/merge-chunks-convert', handleMergeChunksConvert);

// 📌 查询异步任务状态
/**
 * @swagger
 * /api/jwt/test/task-status:
 *   get:
 *     summary: 查询异步任务状态
 *     description: 根据任务ID查询异步任务的执行状态和结果
 *     tags: [PDF处理]
 *     parameters:
 *       - in: query
 *         name: taskId
 *         schema:
 *           type: string
 *         required: true
 *         description: 任务ID
 *     responses:
 *       200:
 *         description: 任务状态
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 code:
 *                   type: integer
 *                   example: 200
 *                 message:
 *                   type: string
 *                   example: "查询成功"
 *                 data:
 *                   $ref: '#/components/schemas/TaskStatus'
 *       400:
 *         description: 请求参数错误
 *       404:
 *         description: 任务不存在
 *       500:
 *         description: 服务器错误
 */
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
