/**
 * @file controllers/videos/index.js
 * @description 视频相关业务的控制器
 */
const db = require("../../db/index");
const ffmpeg = require("fluent-ffmpeg");
const path = require("path");
const fs = require("fs");
const { pdfbseUrl } = require("../../config/database.js");
const { uploadToTebi, deleteFromTebi, getPublicUrl, getPublicBaseUrl } = require("../../utils/tebiStorage");

// 定义临时存储目录
const ROOT_DIR = path.join(__dirname, "../../");
const UPLOADS_DIR = path.join(ROOT_DIR, "uploads");
const CHUNK_DIR = path.join(ROOT_DIR, "chunks");

// 确保目录存在
[UPLOADS_DIR, CHUNK_DIR].forEach((dir) =>
  fs.mkdirSync(dir, { recursive: true })
);

// 从完整URL中提取存储键（如从https://xxx/videos/covers/xxx提取出videos/covers/xxx）
const getKeyFromUrl = (url) => {
  if (!url) return null;
  const baseUrl = getPublicBaseUrl();
  return url.replace(baseUrl, "");
};

/**
 * 获取所有视频分类
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
exports.getCategories = async (req, res) => {
  try {
    const result = await db.query(
      "SELECT id, name FROM categories ORDER BY id ASC"
    );
    res.success(result, "获取分类列表成功", 200);
  } catch (error) {
    console.error("获取分类列表失败:", error);
    res.fail("获取分类列表失败", 500);
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

    if (
      isNaN(parsedPage) ||
      parsedPage < 1 ||
      isNaN(parsedPageSize) ||
      parsedPageSize < 1
    ) {
      return res.fail("页码和每页大小参数无效", 400);
    }

    const offset = (parsedPage - 1) * parsedPageSize;

    const [videos, countResult] = await Promise.all([
      db.query(
        `SELECT id, title, description, category, cover_url, view_count, created_at, video_url 
                 FROM videos 
                 WHERE category_id = ? 
                 ORDER BY created_at DESC 
                 LIMIT ${parsedPageSize} OFFSET ${offset}`,
        [categoryId]
      ),
      db.query("SELECT COUNT(*) as count FROM videos WHERE category_id = ?", [
        categoryId,
      ]),
    ]);

    const totalRecords = countResult[0].count;
    const totalPages = Math.ceil(totalRecords / parsedPageSize);

    const pagination = {
      currentPage: parsedPage,
      pageSize: parsedPageSize,
      totalRecords,
      totalPages,
    };

    // 数据库已存完整URL，直接返回
    res.success(videos, "获取视频列表成功", 200, { pagination });
  } catch (error) {
    console.error("获取视频列表失败:", error);
    res.fail("获取视频列表失败", 500);
  }
};

/**
 * 根据 ID 获取单个视频详情
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
exports.getVideoById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.fail("必须提供视频 ID", 400);
    }

    const [video] = await db.query("SELECT * FROM videos WHERE id = ?", [id]);

    if (!video) {
      return res.fail("视频未找到", 404);
    }

    // 数据库已存完整URL，直接返回
    res.success(video, "获取视频详情成功");
  } catch (error) {
    console.error("获取视频详情失败:", error);
    res.fail("获取视频详情失败", 500);
  }
};

/**
 * 处理视频分片上传
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
exports.handleVideoChunkUpload = async (req, res) => {
  try {
    const { chunkIndex, totalChunks, fileName } = req.body;
    const file = req.file;

    if (!file || chunkIndex === undefined || !totalChunks || !fileName) {
      return res.fail("参数不完整", 400);
    }

    const chunkPath = path.join(CHUNK_DIR, fileName);
    fs.mkdirSync(chunkPath, { recursive: true });
    fs.renameSync(file.path, path.join(chunkPath, `${chunkIndex}.part`));
    
    console.log(`分片上传完成: 文件名=${fileName}, 分片索引=${chunkIndex}, 总分片数=${totalChunks}`);
    res.success({ chunkIndex }, `视频分片 ${chunkIndex} 上传成功`);
  } catch (e) {
    console.error(`分片上传失败:`, e);
    res.fail(`分片上传失败: ${e.message}`, 500);
  }
};

/**
 * 合并视频分片
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
exports.handleVideoMergeChunks = async (req, res) => {
  try {
    const { fileName, totalChunks, title, description, category_id, categoryId } = req.body;
    const finalCategoryId = categoryId || category_id;
    const coverFile = req.file;

    if (!fileName || !totalChunks || !title || !finalCategoryId) {
      return res.fail("参数缺失", 400);
    }

    // 合并分片
    const chunkDir = path.join(CHUNK_DIR, fileName);
    const tempOutputPath = path.join(UPLOADS_DIR, `${Date.now()}-${fileName}`);
    
    if (!fs.existsSync(chunkDir)) {
      throw new Error(`分片目录不存在: ${chunkDir}`);
    }

    // 检查分片完整性
    const files = fs
      .readdirSync(chunkDir)
      .sort((a, b) => Number(a.split(".")[0]) - Number(b.split(".")[0]));
    
    if (files.length !== Number(totalChunks)) {
      throw new Error(`分片数量不匹配: 期望=${totalChunks}, 实际=${files.length}`);
    }

    // 合并分片到临时文件
    const writeStream = fs.createWriteStream(tempOutputPath);
    for (const file of files) {
      const readStream = fs.createReadStream(path.join(chunkDir, file));
      await new Promise((resolve, reject) => {
        readStream.pipe(writeStream, { end: false });
        readStream.on("end", resolve);
        readStream.on("error", reject);
      });
    }
    writeStream.end();
    await new Promise((resolve) => writeStream.on("finish", resolve));

    // 清理分片目录
    fs.rmSync(chunkDir, { recursive: true, force: true });

    // 上传视频（路径：videos/xxx.mp4）
    const videoKey = `videos/${fileName}`;
    const videoUrl = getPublicUrl(videoKey); // 完整URL: https://.../videos/xxx.mp4
    const videoBuffer = fs.readFileSync(tempOutputPath);
    const videoUploadResult = await uploadToTebi(
      videoBuffer,
      videoKey,
      getContentType(fileName)
    );
    
    if (!videoUploadResult.success) {
      throw new Error(`视频上传到Tebi失败: ${videoUploadResult.error}`);
    }
    console.log(`视频上传成功: ${videoUrl}`);

    // 处理封面（路径：videos/covers/xxx.jpg）
    let coverUrl = null;
    if (coverFile) {
      // 用户上传封面
      const coverFileName = `${Date.now()}-${coverFile.filename}`;
      const coverKey = `videos/covers/${coverFileName}`; // 封面路径：videos/covers/
      coverUrl = getPublicUrl(coverKey); // 完整URL: https://.../videos/covers/xxx.jpg
      
      const coverBuffer = fs.readFileSync(coverFile.path);
      const coverUploadResult = await uploadToTebi(
        coverBuffer,
        coverKey,
        coverFile.mimetype || "image/jpeg"
      );
      
      if (!coverUploadResult.success) {
        throw new Error(`封面上传失败: ${coverUploadResult.error}`);
      }
      console.log(`封面上传成功: ${coverUrl}`);
      
      // 清理封面临时文件
      fs.unlinkSync(coverFile.path);
    } else {
      // 自动提取视频帧作为封面
      const tempCoverPath = path.join(UPLOADS_DIR, `${Date.now()}-autocover.jpg`);
      try {
        await new Promise((resolve, reject) => {
          ffmpeg(tempOutputPath)
            .on("end", resolve)
            .on("error", (err) => reject(err))
            .screenshots({
              timestamps: ["1"], // 第1秒帧
              filename: path.basename(tempCoverPath),
              folder: UPLOADS_DIR,
              size: "320x240",
            });
        });
        
        const coverKey = `videos/covers/${path.basename(tempCoverPath)}`; // 封面路径：videos/covers/
        coverUrl = getPublicUrl(coverKey); // 完整URL
        const coverBuffer = fs.readFileSync(tempCoverPath);
        const coverUploadResult = await uploadToTebi(
          coverBuffer,
          coverKey,
          "image/jpeg"
        );
        
        if (!coverUploadResult.success) {
          throw new Error(`封面上传失败: ${coverUploadResult.error}`);
        }
        console.log(`自动提取封面成功: ${coverUrl}`);
        
        // 清理临时封面
        fs.unlinkSync(tempCoverPath);
      } catch (e) {
        console.warn("自动提取封面失败，不保存封面图:", e.message);
      }
    }

    // 清理临时视频文件
    fs.unlinkSync(tempOutputPath);

    // 查询分类名
    const [categoryRow] = await db.query(
      "SELECT name FROM categories WHERE id = ?",
      [finalCategoryId]
    );
    if (!categoryRow) {
      return res.fail("分类不存在", 400);
    }
    const categoryName = categoryRow.name;

    // 存入数据库（完整URL）
    const result = await db.query(
      "INSERT INTO videos (title, description, category, category_id, video_url, cover_url) VALUES (?, ?, ?, ?, ?, ?)",
      [title, description, categoryName, finalCategoryId, videoUrl, coverUrl]
    );
    const insertId = result.insertId;
    const [newVideo] = await db.query("SELECT * FROM videos WHERE id = ?", [insertId]);

    res.success(newVideo, "视频上传成功", 200);
  } catch (error) {
    console.error("视频合并失败:", error);
    res.fail(`视频合并失败: ${error.message}`, 500);
  }
};

/**
 * 获取文件的MIME类型
 */
function getContentType(filename) {
  const extension = path.extname(filename).toLowerCase();
  const mimeTypes = {
    '.mp4': 'video/mp4',
    '.avi': 'video/x-msvideo',
    '.mov': 'video/quicktime',
    '.wmv': 'video/x-ms-wmv',
    '.flv': 'video/x-flv',
    '.mkv': 'video/x-matroska',
    '.webm': 'video/webm'
  };
  return mimeTypes[extension] || 'application/octet-stream';
}

/**
 * [后台管理] 上传新视频
 */
exports.uploadVideo = async (req, res) => {
  try {
    const { title, description, category_id, categoryId } = req.body;
    const finalCategoryId = categoryId || category_id;
    const videoFile = req.files?.videoFile?.[0];
    const coverFile = req.files?.coverFile?.[0];

    if (!title || !finalCategoryId || !videoFile) {
      return res.fail("标题、分类和视频文件均为必填项", 400);
    }

    // 查询分类名
    const [categoryRow] = await db.query(
      "SELECT name FROM categories WHERE id = ?",
      [finalCategoryId]
    );
    if (!categoryRow) {
      // 清理临时文件
      if (videoFile?.path) fs.unlinkSync(videoFile.path);
      if (coverFile?.path) fs.unlinkSync(coverFile.path);
      return res.fail("分类不存在", 400);
    }
    const categoryName = categoryRow.name;

    // 上传视频（路径：videos/xxx.mp4）
    const videoFilename = `videos/${videoFile.filename}`;
    const videoUrl = getPublicUrl(videoFilename); // 完整URL
    const videoBuffer = fs.readFileSync(videoFile.path);
    const videoUploadResult = await uploadToTebi(
      videoBuffer,
      videoFilename,
      getContentType(videoFile.filename)
    );
    
    if (!videoUploadResult.success) {
      throw new Error(`视频上传失败: ${videoUploadResult.error}`);
    }
    console.log(`视频上传成功: ${videoUrl}`);

    // 处理封面（路径：videos/covers/xxx.jpg）
    let coverUrl = null;
    if (coverFile) {
      // 用户上传封面
      const coverFilename = `videos/covers/${coverFile.filename}`; // 封面路径：videos/covers/
      coverUrl = getPublicUrl(coverFilename); // 完整URL
      
      const coverBuffer = fs.readFileSync(coverFile.path);
      const coverUploadResult = await uploadToTebi(
        coverBuffer,
        coverFilename,
        coverFile.mimetype || "image/jpeg"
      );
      
      if (!coverUploadResult.success) {
        throw new Error(`封面上传失败: ${coverUploadResult.error}`);
      }
      // 清理封面临时文件
      fs.unlinkSync(coverFile.path);
    } else {
      // 自动提取封面
      const tempCoverPath = path.join(UPLOADS_DIR, `${Date.now()}-autocover.jpg`);
      try {
        await new Promise((resolve, reject) => {
          ffmpeg(videoFile.path)
            .on("end", resolve)
            .on("error", (err) => reject(err))
            .screenshots({
              timestamps: ["1"],
              filename: path.basename(tempCoverPath),
              folder: UPLOADS_DIR,
              size: "320x240",
            });
        });
        
        const coverFilename = `videos/covers/${path.basename(tempCoverPath)}`; // 封面路径：videos/covers/
        coverUrl = getPublicUrl(coverFilename); // 完整URL
        const coverBuffer = fs.readFileSync(tempCoverPath);
        const coverUploadResult = await uploadToTebi(
          coverBuffer,
          coverFilename,
          "image/jpeg"
        );
        
        if (!coverUploadResult.success) {
          throw new Error(`封面上传失败: ${coverUploadResult.error}`);
        }
        // 清理临时封面
        fs.unlinkSync(tempCoverPath);
      } catch (e) {
        console.warn("自动提取封面失败，不保存封面图:", e.message);
      }
    }

    // 清理视频临时文件
    fs.unlinkSync(videoFile.path);

    // 存入数据库（完整URL）
    const result = await db.query(
      "INSERT INTO videos (title, description, category, category_id, video_url, cover_url) VALUES (?, ?, ?, ?, ?, ?)",
      [title, description, categoryName, finalCategoryId, videoUrl, coverUrl]
    );
    const insertId = result.insertId;
    const [newVideo] = await db.query("SELECT * FROM videos WHERE id = ?", [insertId]);

    res.success(newVideo, "视频上传成功", 200);
  } catch (error) {
    console.error("视频上传失败:", error);
    // 清理临时文件
    if (req.files?.videoFile?.[0]?.path) {
      fs.unlink(req.files.videoFile[0].path, (err) => err && console.warn("清理视频失败:", err));
    }
    if (req.files?.coverFile?.[0]?.path) {
      fs.unlink(req.files.coverFile[0].path, (err) => err && console.warn("清理封面失败:", err));
    }
    res.fail(`视频上传失败: ${error.message}`, 500);
  }
};

/**
 * [后台管理] 删除视频
 */
exports.deleteVideo = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.fail("必须提供视频ID", 400);
    }

    // 查询视频信息（完整URL）
    const [video] = await db.query(
      "SELECT video_url, cover_url FROM videos WHERE id = ?",
      [id]
    );
    if (!video) {
      return res.fail("视频不存在", 404);
    }

    // 删除Tebi视频（从URL提取键）
    if (video.video_url) {
      try {
        const videoKey = getKeyFromUrl(video.video_url);
        const deleteResult = await deleteFromTebi(videoKey);
        if (deleteResult.success) {
          console.log(`删除视频成功: ${video.video_url}`);
        } else {
          console.warn(`删除视频失败: ${deleteResult.error}`);
        }
      } catch (e) {
        console.error(`删除视频异常: ${e.message}`);
      }
    }

    // 删除Tebi封面（从URL提取键）
    if (video.cover_url) {
      try {
        const coverKey = getKeyFromUrl(video.cover_url);
        const deleteResult = await deleteFromTebi(coverKey);
        if (deleteResult.success) {
          console.log(`删除封面成功: ${video.cover_url}`);
        } else {
          console.warn(`删除封面失败: ${deleteResult.error}`);
        }
      } catch (e) {
        console.error(`删除封面异常: ${e.message}`);
      }
    }

    // 删除数据库记录
    await db.query("DELETE FROM videos WHERE id = ?", [id]);

    res.success(null, "视频删除成功");
  } catch (error) {
    console.error("删除视频失败:", error);
    res.fail(`视频删除失败: ${error.message}`, 500);
  }
};

/**
 * [后台管理] 添加分类
 */
exports.addCategory = async (req, res) => {
  try {
    const { name } = req.body;
    if (!name?.trim()) {
      return res.fail("分类名不能为空", 400);
    }
    // 检查是否已存在
    const [exist] = await db.query("SELECT id FROM categories WHERE name = ?", [name.trim()]);
    if (exist) {
      return res.fail("分类已存在", 409);
    }
    const result = await db.query("INSERT INTO categories (name) VALUES (?)", [name.trim()]);
    res.success({ id: result.insertId, name: name.trim() }, "分类添加成功");
  } catch (error) {
    console.error("添加分类失败:", error);
    res.fail("添加分类失败", 500);
  }
};

/**
 * [后台管理] 获取所有视频（带分页）
 */
exports.getAllVideos = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;
    
    // 获取总数
    const [totalResult] = await db.query("SELECT COUNT(*) as count FROM videos");
    const total = totalResult.count;
    
    // 获取视频列表（完整URL）
    const [videos] = await db.query(
      "SELECT * FROM videos ORDER BY created_at DESC LIMIT ? OFFSET ?",
      [parseInt(limit), parseInt(offset)]
    );
    
    res.success({
      list: videos,
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(total / limit)
    });
  } catch (error) {
    console.error("获取视频列表失败:", error);
    res.fail("服务器内部错误", 500);
  }
};

/**
 * [后台管理] 更新视频信息
 */
exports.updateVideo = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, categoryId } = req.body;
    
    if (!id) return res.fail("必须提供视频ID", 400);
    
    // 检查视频是否存在
    const [video] = await db.query("SELECT * FROM videos WHERE id = ?", [id]);
    if (!video) return res.fail("视频不存在", 404);
    
    // 准备更新字段
    const updateFields = [];
    const updateValues = [];
    
    if (title) {
      updateFields.push("title = ?");
      updateValues.push(title);
    }
    if (description) {
      updateFields.push("description = ?");
      updateValues.push(description);
    }
    if (categoryId) {
      const [category] = await db.query("SELECT name FROM categories WHERE id = ?", [categoryId]);
      if (!category) return res.fail("分类不存在", 404);
      updateFields.push("category_id = ?, category = ?");
      updateValues.push(categoryId, category.name);
    }
    
    // 处理视频更新
    if (req.files?.video) {
      const videoFile = req.files.video;
      const timestamp = Date.now();
      const videoFilename = `videos/${timestamp}_${videoFile.name}`; // 视频路径：videos/
      const videoUrl = getPublicUrl(videoFilename); // 完整URL
      
      const videoBuffer = fs.readFileSync(videoFile.path);
      const videoUploadResult = await uploadToTebi(
        videoBuffer,
        videoFilename,
        getContentType(videoFile.name)
      );
      
      if (!videoUploadResult.success) {
        return res.fail(`视频上传失败: ${videoUploadResult.error}`, 500);
      }
      
      // 删除原视频
      if (video.video_url) {
        try {
          const oldKey = getKeyFromUrl(video.video_url);
          await deleteFromTebi(oldKey);
          console.log(`删除原视频成功: ${video.video_url}`);
        } catch (e) {
          console.error(`删除原视频异常: ${e.message}`);
        }
      }
      
      updateFields.push("video_url = ?");
      updateValues.push(videoUrl);
      fs.unlinkSync(videoFile.path); // 清理临时文件
    }
    
    // 处理封面更新（路径：videos/covers/xxx.jpg）
    if (req.files?.cover) {
      const coverFile = req.files.cover;
      const timestamp = Date.now();
      const coverFilename = `videos/covers/${timestamp}_${coverFile.name}`; // 封面路径：videos/covers/
      const coverUrl = getPublicUrl(coverFilename); // 完整URL
      
      const coverBuffer = fs.readFileSync(coverFile.path);
      const coverUploadResult = await uploadToTebi(
        coverBuffer,
        coverFilename,
        coverFile.mimetype || "image/jpeg"
      );
      
      if (!coverUploadResult.success) {
        return res.fail(`封面上传失败: ${coverUploadResult.error}`, 500);
      }
      
      // 删除原封面
      if (video.cover_url) {
        try {
          const oldKey = getKeyFromUrl(video.cover_url);
          await deleteFromTebi(oldKey);
          console.log(`删除原封面成功: ${video.cover_url}`);
        } catch (e) {
          console.error(`删除原封面异常: ${e.message}`);
        }
      }
      
      updateFields.push("cover_url = ?");
      updateValues.push(coverUrl);
      fs.unlinkSync(coverFile.path); // 清理临时文件
    }
    
    // 执行更新
    if (updateFields.length > 0) {
      updateValues.push(id);
      const result = await db.query(
        `UPDATE videos SET ${updateFields.join(", ")} WHERE id = ?`,
        updateValues
      );
      
      if (result.affectedRows === 0) {
        return res.fail("视频不存在或数据未改变", 404);
      }
    }
    
    res.success(null, "视频更新成功");
  } catch (error) {
    console.error("更新视频失败:", error);
    // 清理临时文件
    if (req.files?.video) fs.unlinkSync(req.files.video.path);
    if (req.files?.cover) fs.unlinkSync(req.files.cover.path);
    res.fail("服务器内部错误", 500);
  }
};

/**
 * [后台管理] 删除视频分类
 */
exports.deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.json({ code: 400, message: "必须提供分类ID" });
    }
    // 检查分类下是否有视频
    const [video] = await db.query("SELECT id FROM videos WHERE category_id = ?", [id]);
    if (video) {
      return res.fail("该分类下存在视频，无法删除", 409);
    }
    // 删除分类
    const result = await db.query("DELETE FROM categories WHERE id = ?", [id]);
    if (result.affectedRows === 0) {
      return res.fail("分类不存在或已删除", 404);
    }
    res.success({}, "删除成功");
  } catch (error) {
    console.error("删除分类失败:", error);
    res.fail("删除分类失败", 500);
  }
};