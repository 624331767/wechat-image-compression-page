/**
 * @file router/videos/index.js
 * @description 视频相关的路由
 */

/**
 * @swagger
 * tags:
 *   name: 视频管理
 *   description: 视频管理相关接口
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     Category:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           description: 分类ID
 *           example: 1
 *         name:
 *           type: string
 *           description: 分类名称
 *           example: 教程视频
 *     Video:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           description: 视频ID
 *           example: 1
 *         title:
 *           type: string
 *           description: 视频标题
 *           example: 如何使用公众号图片压缩服务
 *         description:
 *           type: string
 *           description: 视频描述
 *           example: 本视频详细介绍了如何使用公众号图片压缩服务
 *         coverUrl:
 *           type: string
 *           description: 封面图片URL
 *           example: /uploads/cover-123456.jpg
 *         videoUrl:
 *           type: string
 *           description: 视频URL
 *           example: /uploads/video-123456.mp4
 *         categoryId:
 *           type: integer
 *           description: 所属分类ID
 *           example: 1
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: 创建时间
 *           example: 2023-10-01T12:00:00Z
 */
const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const {
  getCategories,
  getVideosByCategory,
  getVideoById,
  uploadVideo,
  deleteVideo,
  getAllVideos,
  updateVideo,
  addCategory,
  deleteCategory,
  initVideoUpload,
  checkVideoChunks,
  handleVideoChunkUpload,
  handleVideoMergeChunks,
  cleanupChunks,
} = require("../../controllers/videos/index");
const { crawl } = require("../../controllers/videos/crawler");
// 引入标准化上传工具
const { fieldsUpload, singleFile } = require("../../utils/upload");

/**
 * =====================================================================================
 *  Multer (文件上传) 配置
 *  为视频和封面上传做准备
 * =====================================================================================
 */
const uploadDir = path.join(__dirname, "../../uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const safeFilename = uniqueSuffix + path.extname(file.originalname);
    cb(null, safeFilename);
  },
});

const upload = multer({
  storage: storage,
  // 你可以在这里为视频和封面设置文件大小限制
  // limits: { fileSize: 1024 * 1024 * 100 }, // 例如：限制文件大小为 100MB
});

/**
 * =====================================================================================
 *  API 路由定义
 * =====================================================================================
 */

// --- H5 网页公开 API ---
/**
 * @swagger
 * /api/categories:
 *   get:
 *     summary: 获取所有视频分类
 *     description: 获取系统中所有可用的视频分类
 *     tags: [视频管理]
 *     responses:
 *       200:
 *         description: 成功获取分类列表
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
 *                   example: 获取分类成功
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Category'
 */
router.get("/categories", getCategories);

/**
 * @swagger
 * /api/videos:
 *   get:
 *     summary: 获取视频列表
 *     description: 根据分类获取视频列表
 *     tags: [视频管理]
 *     parameters:
 *       - in: query
 *         name: categoryId
 *         schema:
 *           type: integer
 *         description: 分类ID
 *     responses:
 *       200:
 *         description: 成功获取视频列表
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
 *                   example: 获取视频列表成功
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Video'
 */
router.get("/videos", getVideosByCategory);

/**
 * @swagger
 * /api/videos/{id}:
 *   get:
 *     summary: 获取视频详情
 *     description: 根据ID获取视频详细信息
 *     tags: [视频管理]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: 视频ID
 *     responses:
 *       200:
 *         description: 成功获取视频详情
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
 *                   example: 获取视频详情成功
 *                 data:
 *                   $ref: '#/components/schemas/Video'
 *       404:
 *         description: 视频不存在
 */
router.get("/videos/:id", getVideoById);

// --- 后台管理专用 API ---

/**
 * @swagger
 * /api/admin/videos:
 *   get:
 *     summary: 获取所有视频（管理用）
 *     description: 管理员获取所有视频列表
 *     tags: [视频管理]
 *     responses:
 *       200:
 *         description: 成功获取所有视频
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 code:
 *                   type: integer
 *                   example: 200
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Video'
 */
router.get("/admin/videos", getAllVideos);

/**
 * @swagger
 * /api/admin/videos/{id}:
 *   put:
 *     summary: 更新视频信息
 *     description: 更新指定ID的视频信息
 *     tags: [视频管理]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: 视频ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               categoryId:
 *                 type: integer
 *     responses:
 *       200:
 *         description: 视频信息更新成功
 *       404:
 *         description: 视频不存在
 *       500:
 *         description: 服务器错误
 */
router.put("/admin/videos/:id", updateVideo);

/**
 * @swagger
 * /api/admin/videos:
 *   post:
 *     summary: 上传新视频（已弃用，请使用分片上传）
 *     description: 上传视频文件和封面图片（不推荐用于大文件，可能导致服务崩溃）
 *     tags: [视频管理]
 *     consumes:
 *       - multipart/form-data
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               videoFile:
 *                 type: string
 *                 format: binary
 *                 description: 视频文件
 *               coverFile:
 *                 type: string
 *                 format: binary
 *                 description: 封面图片
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               categoryId:
 *                 type: integer
 *     responses:
 *       200:
 *
 * /api/admin/videos/chunk:
 *   post:
 *     summary: 上传视频分片
 *     description: 分片上传视频文件，适用于大文件上传
 *     tags: [视频管理]
 *     consumes:
 *       - multipart/form-data
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: 视频文件分片
 *               chunkIndex:
 *                 type: integer
 *                 description: 当前分片序号
 *               totalChunks:
 *                 type: integer
 *                 description: 总分片数
 *               fileName:
 *                 type: string
 *                 description: 原始文件名
 *     responses:
 *       200:
 *         description: 分片上传成功
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
 *                   example: 分片上传成功
 *       500:
 *         description: 服务器错误
 *
 * /api/admin/videos/merge:
 *   post:
 *     summary: 合并视频分片
 *     description: 合并已上传的视频分片，完成视频上传
 *     tags: [视频管理]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               filename:
 *                 type: string
 *                 description: 原始文件名

 *               totalChunks:
 *                 type: integer
 *                 description: 总分片数
 *               title:
 *                 type: string
 *                 description: 视频标题
 *               description:
 *                 type: string
 *                 description: 视频描述
 *               categoryId:
 *                 type: integer
 *                 description: 分类ID
 *               coverFile:
 *                 type: string
 *                 description: 封面文件名（可选）
 *     responses:
 *       200:
 *         description: 视频上传成功
 *       400:
 *         description: 请求参数错误
 *       500:
 *         description: 服务器错误
 */

// 使用标准化上传中间件，处理视频和封面上传
router.post("/admin/videos", fieldsUpload, uploadVideo);

// 初始化Tebi分段上传（用于断点续传）
router.post("/admin/videos/init-upload", initVideoUpload);

// 检查已上传的分片（用于断点续传）- 从Tebi查询
router.get("/admin/videos/chunks-check", checkVideoChunks);

// 添加分片上传路由
router.post("/admin/videos/chunk", upload.single('file'), handleVideoChunkUpload);

// 添加分片合并路由（支持可选封面文件）
router.post("/admin/videos/merge", upload.single('file'), handleVideoMergeChunks);

// 添加分片清理路由
router.post("/admin/videos/cleanup-chunks", cleanupChunks);

// 采集接口：POST /api/admin/crawl
/**
 * @swagger
 * /api/admin/crawl:
 *   post:
 *     summary: 视频采集接口
 *     description: 从指定来源采集视频信息
 *     tags: [视频管理]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               url:
 *                 type: string
 *                 description: 采集源URL
 *     responses:
 *       200:
 *         description: 采集成功
 *       400:
 *         description: 请求参数错误
 *       500:
 *         description: 服务器错误
 */
router.post("/admin/crawl", crawl);

// 删除视频接口
/**
 * @swagger
 * /api/admin/videos/{id}:
 *   delete:
 *     summary: 删除视频
 *     description: 删除指定ID的视频
 *     tags: [视频管理]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: 视频ID
 *     responses:
 *       200:
 *         description: 视频删除成功
 *       404:
 *         description: 视频不存在
 *       500:
 *         description: 服务器错误
 */
router.delete("/admin/videos/:id", deleteVideo);

// 添加视频分类
/**
 * @swagger
 * /api/admin/categories:
 *   post:
 *     summary: 添加视频分类
 *     description: 创建新的视频分类
 *     tags: [视频管理]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 description: 分类名称
 *     responses:
 *       200:
 *         description: 分类添加成功
 *       400:
 *         description: 请求参数错误
 *       500:
 *         description: 服务器错误
 */
router.post("/admin/categories", addCategory);

// 删除视频分类
/**
 * @swagger
 * /api/admin/categories/{id}:
 *   delete:
 *     summary: 删除视频分类
 *     description: 删除指定ID的视频分类
 *     tags: [视频管理]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: 分类ID
 *     responses:
 *       200:
 *         description: 分类删除成功
 *       404:
 *         description: 分类不存在
 *       500:
 *         description: 服务器错误
 */
router.delete("/admin/categories/:id", deleteCategory);

module.exports = router;
