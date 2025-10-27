

/**
 * 图片处理路由模块
 * 功能：提供图片压缩上传接口，包含文件前置校验（类型、大小）和错误处理
 * 接口路径：POST /api/compress-image
 */
const express = require('express');
const router = express.Router();
const multer = require('multer'); // 文件上传处理中间件
const imageController = require('../controllers/imageController'); // 图片处理业务逻辑
const upload = require('../config/multerConfig'); // 引入multer配置

/**
 * @swagger
 * components:
 *   schemas:
 *     ImageCompressResponse:
 *       type: object
 *       properties:
 *         code:
 *           type: integer
 *           description: 状态码，200表示成功
 *           example: 200
 *         message:
 *           type: string
 *           description: 响应消息
 *           example: 图片压缩上传成功
 *         data:
 *           type: object
 *           properties:
 *             originalSize:
 *               type: integer
 *               description: 原始图片大小(字节)
 *               example: 2048000
 *             compressedSize:
 *               type: integer
 *               description: 压缩后图片大小(字节)
 *               example: 512000
 *             originalDimensions:
 *               type: object
 *               properties:
 *                 width:
 *                   type: integer
 *                   example: 3000
 *                 height:
 *                   type: integer
 *                   example: 2000
 *             compressedDimensions:
 *               type: object
 *               properties:
 *                 width:
 *                   type: integer
 *                   example: 1500
 *                 height:
 *                   type: integer
 *                   example: 1000
 *             url:
 *               type: string
 *               description: 上传后的图片URL
 *               example: http://api.example.com/uploads/image_123456.jpg
 *   securitySchemes:
 *     BearerAuth:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT
 *
 * @swagger
 * tags:
 *   name: 图片处理
 *   description: 图片压缩与上传相关接口
 */

/**
 * @swagger
 * /api/compress-image:
 *   post:
 *     summary: 图片压缩上传接口
 *     description: 上传图片，自动压缩并转发到目标服务器
 *     tags: [图片处理]
 *     security:
 *       - BearerAuth: []
 *     consumes:
 *       - multipart/form-data
 *     parameters:
 *       - in: header
 *         name: token
 *         schema:
 *           type: string
 *         required: true
 *         description: JWT认证令牌
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
 *                 description: 要上传的图片文件(支持jpg、jpeg、png格式)
 *     responses:
 *       200:
 *         description: 图片压缩上传成功
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ImageCompressResponse'
 *       400:
 *         description: 请求错误，如文件类型不支持、文件过大等
 *       401:
 *         description: 认证失败，token无效或已过期
 *       500:
 *         description: 服务器内部错误
 */
router.post(
  '/compress-image',
  // 第一步：multer前置处理（校验文件类型、大小，存储到内存）
  upload.single('file'),
  // 第二步：执行业务逻辑（压缩图片+上传）
  imageController.compressImage,
  // 第三步：错误处理（专门捕获当前接口的上传相关错误）
  (err, req, res, next) => {
    // 处理"非图片文件"错误（multer的fileFilter抛出）
    if (err.message.includes('仅支持图片文件')) {
      return res.status(400).json({
        code: 400,
        message: err.message
      });
    }

    // 处理"文件过大"错误（multer的limits自动抛出，错误信息固定为'File too large'）
    if (err.message.includes('File too large')) {
      return res.status(400).json({
        code: 400,
        message: `文件过大，最大支持10MB`
      });
    }

    // 其他未预料的错误：传递给全局错误处理中间件
    next(err);
  }
);


module.exports = router;