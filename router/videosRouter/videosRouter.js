/**
 * @file router/videos/index.js
 * @description 视频相关的路由
 */
const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { getCategories, getVideosByCategory, getVideoById, uploadVideo, deleteVideo, getAllVideos, updateVideo, addCategory, deleteCategory } = require('../../controllers/videos/index');
const { crawl } = require('../../controllers/videos/crawler');
// 引入标准化上传工具
const { fieldsUpload } = require('../../utils/upload');

/**
 * =====================================================================================
 *  Multer (文件上传) 配置
 *  为视频和封面上传做准备
 * =====================================================================================
 */
const uploadDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
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
router.get('/categories', getCategories);
router.get('/videos', getVideosByCategory);
router.get('/videos/:id', getVideoById);


// --- 后台管理专用 API ---

// 获取全部视频（管理用）
router.get('/admin/videos', getAllVideos);

// 编辑视频信息（PUT）
router.put('/admin/videos/:id', updateVideo);

// 使用标准化上传中间件，处理视频和封面上传
router.post('/admin/videos', fieldsUpload, (req, res) => {
    console.log(222);
    
    // 检查视频文件
    const videoFile = req.files && req.files.videoFile && req.files.videoFile[0];
    if (!videoFile) {
      return res.fail('缺少视频文件', 400);
    }
    uploadVideo(req, res);
});

// 采集接口：POST /api/admin/crawl
router.post('/admin/crawl', crawl);

// 删除视频接口
router.delete('/admin/videos/:id', deleteVideo);

// 添加视频分类
router.post('/admin/categories', addCategory);
// 删除视频分类
router.delete('/admin/categories/:id', deleteCategory);

module.exports = router; 