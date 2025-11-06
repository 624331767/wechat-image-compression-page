/**
 * 用户管理路由模块
 * 功能：提供用户查询、添加和文件上传功能
 */
const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { getUsers, addUser, uploadMethods } = require('../../../controllers/page/user/user'); // 确保路径正确
 
// 引入标准化上传工具
const { customUpload } = require('../../../utils/upload');

/**
 * @swagger
 * components:
 *   schemas:
 *     User:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           description: 用户 ID
 *           example: "user123"
 *         name:
 *           type: string
 *           description: 用户名
 *           example: "张三"
 *         email:
 *           type: string
 *           description: 邮箱地址
 *           example: "zhangsan@example.com"
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: 创建时间
 *           example: "2023-05-15T10:30:00Z"
 *     UserCreate:
 *       type: object
 *       properties:
 *         name:
 *           type: string
 *           description: 用户名
 *           example: "李四"
 *           required: true
 *         email:
 *           type: string
 *           format: email
 *           description: 邮箱地址
 *           example: "lisi@example.com"
 *           required: true
 *         password:
 *           type: string
 *           description: 用户密码
 *           example: "SecurePass123"
 *           required: true
 *     UploadResponse:
 *       type: object
 *       properties:
 *         code:
 *           type: integer
 *           example: 200
 *         message:
 *           type: string
 *           example: "文件上传成功"
 *         data:
 *           type: object
 *           properties:
 *             filename:
 *               type: string
 *               description: 上传后的文件名
 *               example: "1621234567890-random123.jpg"
 *             url:
 *               type: string
 *               description: 文件访问URL
 *               example: "http://api.example.com/uploads/1621234567890-random123.jpg"
 *     ApiResponse:
 *       type: object
 *       properties:
 *         code:
 *           type: integer
 *           description: 状态码
 *           example: 200
 *         message:
 *           type: string
 *           description: 响应消息
 *           example: "操作成功"
 *         data:
 *           type: object
 *           description: 响应数据
 *
 * @swagger
 * tags:
 *   name: 用户管理
 *   description: 用户查询、添加和文件上传接口
 */

/**
 * =====================================================================================
 *  Multer (文件上传) 配置
 * =====================================================================================
 */
// 确保上传目录存在
const uploadDir = path.join(__dirname, '../../uploads'); // 使用 path.join 保证路径正确
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true }); // recursive: true 可以创建嵌套目录
}

// 配置 Multer 磁盘存储
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir); // 文件存储路径
  },
  filename: function (req, file, cb) {
    // 生成一个更安全的文件名，避免潜在的路径遍历问题
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const safeFilename = uniqueSuffix + path.extname(file.originalname);
    cb(null, safeFilename);
  },
});

// 创建 Multer 实例，可以添加文件大小限制、文件类型过滤等
const upload = multer({
  storage: storage,
  // 可以在这里添加文件大小限制、文件类型过滤等
  // limits: { fileSize: 1024 * 1024 * 5 }, // 例如：限制文件大小为 5MB
  // fileFilter: function(req, file, cb) { ... }
});

/**
 * =====================================================================================
 *  路由定义
 * =====================================================================================
 */

/**
 * @swagger
 * /api/users:
 *   get:
 *     summary: 获取用户列表
 *     description: 查询系统中的用户列表
 *     tags: [用户管理]
 *     responses:
 *       200:
 *         description: 用户列表获取成功
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
 *                   example: "获取用户列表成功"
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/User'
 *       500:
 *         description: 服务器内部错误
 */
router.get('/users', getUsers);

/**
 * @swagger
 * /api/add:
 *   post:
 *     summary: 添加新用户
 *     description: 向系统中添加新用户
 *     tags: [用户管理]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UserCreate'
 *     responses:
 *       200:
 *         description: 用户添加成功
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *       400:
 *         description: 请求参数错误
 *       500:
 *         description: 服务器内部错误
 */
router.post('/add', addUser);

/**
 * @swagger
 * /api/upload:
 *   post:
 *     summary: 文件上传接口
 *     description: 上传图片文件到服务器
 *     tags: [用户管理]
 *     consumes:
 *       - multipart/form-data
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               image:
 *                 type: string
 *                 format: binary
 *                 description: 要上传的图片文件
 *     responses:
 *       200:
 *         description: 文件上传成功
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UploadResponse'
 *       400:
 *         description: 请求错误，如文件类型不支持、文件过大等
 *       500:
 *         description: 服务器内部错误
 */
router.post('/upload', customUpload([{ name: 'image', maxCount: 1 }]), uploadMethods);

 

module.exports = router;