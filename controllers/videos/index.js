/**
 * @file controllers/videos/index.js
 * @description 视频相关业务的控制器
 */
const db = require('../../db/index');
const ffmpeg = require('fluent-ffmpeg');
const path = require('path');
const fs = require('fs'); // 引入 fs 模块，用于文件操作
const { pdfbseUrl } = require('../../config/database.js');
/**
 * 获取所有视频分类
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
exports.getCategories = async (req, res) => { // 移除 next
    try {
        // 关键：必须查 id, name
        const result = await db.query('SELECT id, name FROM categories ORDER BY id ASC');

        res.success(result, "获取分类列表成功", 200);
    } catch (error) {
        console.error('获取分类列表失败:', error);
        res.fail('获取分类列表失败', 500);
    }
};

/**
 * 根据分类获取视频列表（分页）
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
 exports.getVideosByCategory = async (req, res) => {
    try {
        const { categoryId, page = 1, pageSize = 10 } = req.query;

        if (!categoryId) {
            return res.fail("必须提供 categoryId 参数", 400);
        }

        const parsedPage = parseInt(page, 10);
        const parsedPageSize = parseInt(pageSize, 10);

        if (isNaN(parsedPage) || parsedPage < 1 || isNaN(parsedPageSize) || parsedPageSize < 1) {
            return res.fail("页码和每页大小参数无效", 400);
        }

        const offset = (parsedPage - 1) * parsedPageSize;

        // 注意：LIMIT 和 OFFSET 直接拼数字，避免 Aiven MySQL 错误
        const [videos, countResult] = await Promise.all([
            db.query(
                `SELECT id, title, description, category, cover_url, view_count, created_at 
                 FROM videos 
                 WHERE category_id = ? 
                 ORDER BY created_at DESC 
                 LIMIT ${parsedPageSize} OFFSET ${offset}`,
                [categoryId]
            ),
            db.query("SELECT COUNT(*) as count FROM videos WHERE category_id = ?", [categoryId])
        ]);

        const totalRecords = countResult[0].count;
        const totalPages = Math.ceil(totalRecords / parsedPageSize);

        const pagination = {
            currentPage: parsedPage,
            pageSize: parsedPageSize,
            totalRecords,
            totalPages,
        };

        res.success(videos, "获取视频列表成功", 200, { pagination });
    } catch (error) {
        console.error('获取视频列表失败:', error);
        res.fail('获取视频列表失败', 500);
    }
};


/**
 * 根据 ID 获取单个视频详情
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
exports.getVideoById = async (req, res) => { // 移除 next
    try {
        const { id } = req.params;
        if (!id) {
            return res.fail("必须提供视频 ID", 400); // 保持原有 res.fail 格式
        }

        const [video] = await db.query("SELECT * FROM videos WHERE id = ?", [id]);

        if (!video) {
            return res.fail("视频未找到", 404); // 保持原有 res.fail 格式
        }

        res.success(video, "获取视频详情成功"); // 保持原有 res.success 格式
    } catch (error) {
        console.error('获取视频详情失败:', error);
        res.fail('获取视频详情失败', 500); // 保持原有 res.fail 格式
    }
};

/**
 * [后台管理] 上传新视频
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
exports.uploadVideo = async (req, res) => { // 移除 next
    try {
        const { title, description, categoryId } = req.body;
        const videoFile = req.files && req.files.videoFile ? req.files.videoFile[0] : null;

        if (!title || !categoryId || !videoFile) {
            return res.fail("标题、分类和视频文件均为必填项222", 400); // 保持原有 res.fail 格式
        }

        const videoUrl = `${pdfbseUrl}/uploads/${videoFile.filename}`;
        let coverUrl = null; // 默认为 null

        const coverFile = req.files && req.files.coverFile ? req.files.coverFile[0] : null;
        if (coverFile) {
            // 用户上传了封面
            coverUrl = `${pdfbseUrl}/uploads/${coverFile.filename}`;
        } else {
            // 没有上传封面，自动提取视频帧
            const videoPath = videoFile.path;
            const coverFilename = `${Date.now()}-autocover.jpg`;
            const coverOutputDir = path.join(__dirname, '../../uploads/');

            // 确保目录存在
            if (!fs.existsSync(coverOutputDir)) {
                fs.mkdirSync(coverOutputDir, { recursive: true });
            }

            try {
                await new Promise((resolve, reject) => {
                    ffmpeg(videoPath)
                        .on('end', () => resolve())
                        .on('error', (err) => {
                            console.error('封面提取失败:', err.message);
                            reject(err);
                        })
                        .screenshots({
                            timestamps: ['1'], // 第1秒
                            filename: coverFilename,
                            folder: coverOutputDir,
                            size: '320x240'
                        });
                });
                coverUrl = `${pdfbseUrl}/uploads/${coverFilename}`;
            } catch (e) {
                // 如果提取失败，封面保持为 null，并打印警告
                console.warn('自动提取封面失败，将不保存封面图:', e.message);
            }
        }

        // 查询分类名
        const [categoryRow] = await db.query("SELECT name FROM categories WHERE id = ?", [categoryId]);
        if (!categoryRow) {
            // 如果分类不存在，清理已上传的文件
            if (videoFile && fs.existsSync(videoFile.path)) {
                fs.unlinkSync(videoFile.path); // 同步删除，因为这是上传失败
            }
            if (coverFile && fs.existsSync(coverFile.path)) {
                fs.unlinkSync(coverFile.path); // 同步删除
            }
            // 检查自动生成的封面路径是否存在，并删除
            if (coverUrl && coverUrl.includes('-autocover.jpg') && fs.existsSync(path.join(__dirname, '../../', coverUrl))) {
                fs.unlinkSync(path.join(__dirname, '../../', coverUrl));
            }
            return res.fail("分类不存在", 400); // 保持原有 res.fail 格式
        }
        const categoryName = categoryRow.name;

        // 存库时写入 category_id 和 category
        const result = await db.query(
            "INSERT INTO videos (title, description, category, category_id, video_url, cover_url) VALUES (?, ?, ?, ?, ?, ?)",
            [title, description, categoryName, categoryId, videoUrl, coverUrl]
        );
        const insertId = result.insertId;
        const [newVideo] = await db.query("SELECT * FROM videos WHERE id = ?", [insertId]);
        res.success(newVideo, "视频上传成功", 200); // 保持原有状态码
    } catch (error) {
        console.error('视频上传失败:', error);
        // 上传失败时，尝试清理已上传的文件，防止垃圾文件堆积
        if (req.files && req.files.videoFile && req.files.videoFile[0] && fs.existsSync(req.files.videoFile[0].path)) {
            fs.unlink(req.files.videoFile[0].path, err => {
                if (err) console.warn('清理失败视频文件失败:', req.files.videoFile[0].path, err.message);
            });
        }
        if (req.files && req.files.coverFile && req.files.coverFile[0] && fs.existsSync(req.files.coverFile[0].path)) {
            fs.unlink(req.files.coverFile[0].path, err => {
                if (err) console.warn('清理失败封面文件失败:', req.files.coverFile[0].path, err.message);
            });
        }
        res.fail(`视频上传失败: ${error.message}`, 500); // 保持原有 res.fail 格式
    }
};

/**
 * [后台管理] 删除视频
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
exports.deleteVideo = async (req, res) => { // 移除 next
    try {
        const { id } = req.params;
        if (!id) {
            return res.fail("必须提供视频ID", 400); // 保持原有 res.fail 格式
        }
        // 查询视频信息，获取文件路径
        const [video] = await db.query("SELECT video_url, cover_url FROM videos WHERE id = ?", [id]);
        if (!video) {
            return res.fail("视频不存在", 404); // 保持原有 res.fail 格式
        }
        // 删除数据库记录
        await db.query("DELETE FROM videos WHERE id = ?", [id]);

        // 删除视频文件 (异步非阻塞，即使失败也不影响数据库删除的成功响应)
        if (video.video_url) {
            const videoPath = path.join(__dirname, '../../', video.video_url);
            fs.unlink(videoPath, err => {
                if (err) console.warn(`[WARN] 删除视频文件失败: ${videoPath}`, err.message);
            });
        }
        // 删除封面文件 (异步非阻塞)
        if (video.cover_url) {
            const coverPath = path.join(__dirname, '../../', video.cover_url);
            fs.unlink(coverPath, err => {
                if (err) console.warn(`[WARN] 删除封面文件失败: ${coverPath}`, err.message);
            });
        }
        res.success(null, "视频删除成功"); // 保持原有 res.success 格式
    } catch (error) {
        console.error('删除视频失败:', error);
        res.fail(`视频删除失败: ${error.message}`, 500); // 保持原有 res.fail 格式
    }
};

/**
 * [后台管理] 添加分类
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
exports.addCategory = async (req, res) => { // 移除 next
    try {
        const { name } = req.body;
        if (!name || !name.trim()) {
  
            return res.fail("分类名不能为空", 400);
        }
        // 检查是否已存在
        const [exist] = await db.query('SELECT id FROM categories WHERE name = ?', [name.trim()]);
        if (exist) {
            return res.fail("分类已存在", 409);
      
        }
        const result = await db.query('INSERT INTO categories (name) VALUES (?)', [name.trim()]);
        res.success({ id: result.insertId, name: name.trim() }, "分类添加成功");
       
    } catch (error) {
        console.error('添加分类失败:', error);
        return res.fail("添加分类失败", 500);
     
    }
};

/**
 * [后台管理] 获取全部视频（不分页，管理用）
 */
exports.getAllVideos = async (req, res) => { // 移除 next
    try {
        const videos = await db.query('SELECT * FROM videos ORDER BY id DESC');
        res.success(videos, "获取视频列表成功");
    } catch (err) { // 统一使用 error
        console.error('获取所有视频失败:', err);
        res.fail("获取视频失败", 500);
    }
};

/**
 * [后台管理] 更新视频信息
 */
exports.updateVideo = async (req, res) => { 
    
    console.log(req.body);
    
    const id = req.params.id;
    const { title = '', description = '', categoryId = null } = req.body;

    try {
        if (!id) {
            return res.fail("必须提供视频ID", 400);
        }
        if (!title || !categoryId) {
            return res.fail("标题和分类不能为空", 400);
        }

        // 查分类名
        const [catRow] = await db.query('SELECT name FROM categories WHERE id = ?', [categoryId]);
        if (!catRow) {
            return res.fail("分类不存在", 404);
           
        }
        const categoryName = catRow.name;

        // 更新视频
        const result = await db.query(
            'UPDATE videos SET title=?, description=?, category_id=?, category=? WHERE id=?',
            [title, description, categoryId, categoryName, id]
        );

        if (result.affectedRows === 0) {
            // 如果 affectedRows 为 0，可能表示 ID 不存在或数据未改变
            return res.fail("视频不存在或数据未改变", 404);
        }

        res.success({}, "更新成功");
    } catch (error) { // 统一使用 error
        console.error('更新视频失败:', error);
        res.fail("更新失败", 500);
    }
};

/**
 * [后台管理] 删除视频分类
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
exports.deleteCategory = async (req, res) => { // 移除 next
    try {
        const { id } = req.params;
        if (!id) {
            return res.json({ code: 400, message: '必须提供分类ID' }); // 保持原有 json 格式
        }
        // 检查该分类下是否有视频
        const [video] = await db.query('SELECT id FROM videos WHERE category_id = ?', [id]);
        if (video) {
            console.warn('该分类下存在视频，无法删除');
            return res.fail("该分类下存在视频，无法删除", 409); // 保持原有 json 格式
        }
        // 删除分类
        const result = await db.query('DELETE FROM categories WHERE id = ?', [id]);
        if (result.affectedRows === 0) {
            return res.fail("分类不存在或已删除", 404   ); // 保持原有 json 格式
        }
        res.success({}, "删除成功");
    } catch (error) {
        console.error('删除分类失败:', error);
        res.fail("删除分类失败", 500);
    }
};