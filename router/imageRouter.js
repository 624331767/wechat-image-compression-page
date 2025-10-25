

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
 * 图片压缩上传接口
 * 路径：POST /api/compress-image
 * 流程：
 * 1. upload.single('file')：multer中间件处理上传，仅接受字段名为'file'的单文件
 * 2. imageController.compressImage：业务逻辑（压缩图片并转发到目标服务器）
 * 3. 错误处理中间件：捕获当前接口流程中抛出的错误（主要是multer的上传错误）
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