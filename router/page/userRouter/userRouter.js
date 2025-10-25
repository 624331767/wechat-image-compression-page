// router/myRoutes.js

const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { getUsers, addUser, uploadMethods } = require('../../../controllers/page/user/user'); // 确保路径正确
 
// 引入标准化上传工具
const { customUpload } = require('../../../utils/upload');

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

// 创建 Multer 实例，可以添加文件过滤等配置
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
// 定义用户查询的路由
router.get('/users', getUsers);

// 定义添加用户的路由
router.post('/add', addUser);

// 定义文件上传的路由
// 使用标准化上传中间件，字段名为'image'
router.post('/upload', customUpload([{ name: 'image', maxCount: 1 }]), uploadMethods);

 

module.exports = router;