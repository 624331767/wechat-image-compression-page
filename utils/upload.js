/**
 * @file utils/upload.js
 * @description 标准化上传工具，统一管理上传逻辑，支持多种上传场景
 */
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// 上传文件统一存储目录
const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// 统一的文件存储配置
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        // 生成唯一文件名：时间戳-随机数+原始扩展名
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const safeFilename = uniqueSuffix + path.extname(file.originalname);
        cb(null, safeFilename);
    },
});

// 创建基础的 multer 实例
const upload = multer({ storage });

/**
 * 单文件上传中间件（字段名：file）
 * 用法：router.post('/upload', singleFile, ...)
 */
const singleFile = upload.single('file');

/**
 * 多文件上传中间件（字段名：files，最多10个）
 * 用法：router.post('/upload', multiFiles, ...)
 */
const multiFiles = upload.array('files', 10);

/**
 * 多字段上传中间件（如视频和封面）
 * 用法：router.post('/upload', fieldsUpload, ...)
 */
const fieldsUpload = upload.fields([
    { name: 'videoFile', maxCount: 1 },
    { name: 'coverFile', maxCount: 1 }
]);

/**
 * 自定义上传中间件
 * @param {Array} fields 字段配置，如 [{ name: 'avatar', maxCount: 1 }]
 * @param {Object} options 其他 multer 配置（如 limits）
 * 用法：router.post('/upload', customUpload([...], {...}), ...)
 */
function customUpload(fields, options = {}) {
    return multer({
        storage,
        ...options
    }).fields(fields);
}

module.exports = {
    upload,         // 原始 multer 实例，支持自定义
    singleFile,     // 单文件上传
    multiFiles,     // 多文件上传
    fieldsUpload,   // 多字段上传（视频+封面）
    customUpload    // 自定义上传
}; 