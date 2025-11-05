/**
 * @file controllers/videos/index.js
 * @description 视频管理相关的控制器
 */

const fs = require('fs');
const path = require('path');
const db = require('../../db/index');
const { pdfbseUrl } = require('../../config/database');
const { 
  initiateMultipartUpload, 
  uploadPart, 
  completeMultipartUpload, 
  abortMultipartUpload,
  listUploadedParts,
  getPublicUrl,
  listMultipartUploads
} = require('../../utils/tebiStorage');

// ========================= 基础目录配置 ========================= //
const ROOT_DIR = process.cwd();
const UPLOAD_DIR = path.join(ROOT_DIR, 'uploads');
const CHUNK_DIR = path.join(ROOT_DIR, 'chunks');

// 初始化目录结构
[UPLOAD_DIR, CHUNK_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

/**
 * 清理超过2小时的分片文件
 * 只清理长时间未使用的分片目录，避免清理正在上传的分片
 */
function cleanupOldChunks() {
  try {
    console.log('开始清理超过2小时未使用的分片文件...');
    
    if (!fs.existsSync(CHUNK_DIR)) {
      console.log('分片目录不存在，跳过清理');
      return;
    }
    
    const now = Date.now();
    const twoHours = 2 * 60 * 60 * 1000; // 2小时的毫秒数
    
    const items = fs.readdirSync(CHUNK_DIR);
    let cleanedCount = 0;
    
    for (const item of items) {
      const itemPath = path.join(CHUNK_DIR, item);
      const stat = fs.statSync(itemPath);
      
      // 检查是否是目录且超过2小时未修改
      if (stat.isDirectory() && (now - stat.mtime.getTime()) > twoHours) {
        console.log(`清理旧分片目录: ${itemPath} (最后修改时间: ${stat.mtime.toISOString()})`);
        fs.rmSync(itemPath, { recursive: true, force: true });
        cleanedCount++;
      }
    }
    
    console.log(`分片清理完成，共清理 ${cleanedCount} 个旧目录`);
  } catch (error) {
    console.error('清理旧分片失败:', error);
  }
}

// 设置定期清理任务 - 每2小时执行一次
setInterval(cleanupOldChunks, 2 * 60 * 60 * 1000);

// 应用启动后5秒执行首次清理
setTimeout(cleanupOldChunks, 5000);

/**
 * 清理Tebi中超过2小时的未完成分段上传
 * 这些未完成的上传会占用存储空间，需要定期清理
 */
async function cleanupIncompleteTebiUploads() {
  try {
    console.log('开始清理Tebi中超过2小时的未完成分段上传...');
    
    // 查询所有未完成的分段上传（只查询 videos/ 前缀的）
    const listResult = await listMultipartUploads('videos/');
    if (!listResult.success) {
      console.error('查询未完成上传失败:', listResult.error);
      return;
    }
    
    const uploads = listResult.uploads || [];
    const now = new Date();
    const twoHours = 2 * 60 * 60 * 1000; // 2小时的毫秒数
    let cleanedCount = 0;
    let skippedCount = 0;
    
    for (const upload of uploads) {
      const initiatedTime = new Date(upload.Initiated);
      const timeDiff = now.getTime() - initiatedTime.getTime();
      
      // 如果超过2小时，清理这个未完成的上传
      if (timeDiff > twoHours) {
        try {
          const abortResult = await abortMultipartUpload(upload.Key, upload.UploadId);
          if (abortResult.success) {
            console.log(`✅ 清理未完成的上传: ${upload.Key} (上传ID: ${upload.UploadId}, 创建时间: ${initiatedTime.toISOString()})`);
            cleanedCount++;
          } else {
            console.error(`❌ 清理失败: ${upload.Key} - ${abortResult.error}`);
          }
        } catch (error) {
          console.error(`❌ 清理未完成上传时出错: ${upload.Key} - ${error.message}`);
        }
      } else {
        skippedCount++;
      }
    }
    
    if (cleanedCount > 0 || skippedCount > 0) {
      console.log(`Tebi分段上传清理完成，共清理 ${cleanedCount} 个，跳过 ${skippedCount} 个（未超过2小时）`);
    } else if (uploads.length === 0) {
      console.log('Tebi中没有未完成的分段上传');
    }
  } catch (error) {
    console.error('清理Tebi未完成上传失败:', error);
  }
}

// 设置定期清理任务 - 每2小时执行一次
setInterval(cleanupIncompleteTebiUploads, 2 * 60 * 60 * 1000);

// 应用启动后5秒执行首次清理
setTimeout(cleanupIncompleteTebiUploads, 5000);

/**
 * 获取所有视频分类
 */
exports.getCategories = async (req, res, next) => {
  try {
    const result = await db.query('SELECT id, name FROM categories ORDER BY id ASC');
    res.success(result, '获取分类列表成功');
  } catch (error) {
    next(error);
  }
};

/**
 * 根据分类获取视频列表
 */
 
 exports.getVideosByCategory = async (req, res, next) => {
  try {
    const { categoryId, keyword } = req.query;
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.pageSize) || 10;
    const offset = (page - 1) * pageSize;

    // 拼接 WHERE 条件
    let whereClause = '';
    let params = [];

    // 如果同时有分类ID和关键词，则添加AND条件
    if (categoryId && keyword) {
      whereClause = 'WHERE category_id = ? AND (title LIKE ? OR description LIKE ?)';
      params.push(categoryId);
      params.push(`%${keyword}%`);
      params.push(`%${keyword}%`);
    } else if (categoryId) {
      // 只有分类ID
      whereClause = 'WHERE category_id = ?';
      params.push(categoryId);
    } else if (keyword) {
      // 只有关键词，搜索标题或描述
      whereClause = 'WHERE title LIKE ? OR description LIKE ?';
      params.push(`%${keyword}%`);
      params.push(`%${keyword}%`);
    }

    // 1️⃣ 查询总条数
    const countQuery = `SELECT COUNT(*) AS total FROM videos ${whereClause}`;
    const countResult = await db.query(countQuery, params);
    const total = countResult[0]?.total || 0;

    // 2️⃣ 查询分页数据
    const dataQuery = `
      SELECT * FROM videos 
      ${whereClause} 
      ORDER BY id DESC 
      LIMIT ${pageSize} OFFSET ${offset}
    `; // LIMIT / OFFSET 直接拼数字，避免占位符错误
    const dataResult = await db.query(dataQuery, params);

  

  // 分页信息
    const pagination = {
     total,
        page,
        pageSize,
    };

    res.success(dataResult, "获取视频列表成功", 200, { pagination });

  } catch (error) {
    next(error);
  }
};



// 随机获取推荐视频
exports.getRandomVideo=async(req,res,next)=>{
  try {
    // 从查询参数获取数量，默认为1
    const count = parseInt(req.query.count) || 1;
    
    // 参数验证，确保是正整数且不超过合理范围
    if (isNaN(count) || count <= 0 || count > 100) {
      return res.fail('数量参数必须是1-100之间的正整数', 400);
    }
    
    // 使用模板字符串直接插入LIMIT值，避免参数绑定问题
    const videos = await db.query(`SELECT * FROM videos ORDER BY RAND() LIMIT ${count}`);
    
    if (!videos || videos.length === 0) {
      return res.fail('没有视频可用', 404);
    }
    
    res.success(videos, '获取随机视频成功');
  } catch (error) {
    next(error);
  }
}







/**
 * 根据ID获取视频详情
 */
exports.getVideoById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const [video] = await db.query('SELECT * FROM videos WHERE id = ?', [id]);

    if (!video) {
      return res.fail('视频不存在', 404);
    }

    res.success(video, '获取视频详情成功');
  } catch (error) {
    next(error);
  }
};

/**
 * 获取所有视频（管理用）
 */
exports.getAllVideos = async (req, res, next) => {
  try {
    const result = await db.query('SELECT * FROM videos ORDER BY id DESC');
    res.success(result, '获取所有视频成功');
  } catch (error) {
    next(error);
  }
};

/**
 * 上传视频（已弃用，请使用分片上传）
 */
exports.uploadVideo = async (req, res, next) => {
  try {
    const { title, description, categoryId } = req.body;
    const videoFile = req.files && req.files.videoFile ? req.files.videoFile[0] : null;
    const coverFile = req.files && req.files.coverFile ? req.files.coverFile[0] : null;

    // 校验 categoryId
    if (!title || !categoryId || !videoFile) {
      return res.fail("标题、分类和视频文件均为必填项", 400);
    }

    // 校验分类是否存在
    const [categoryRow] = await db.query("SELECT name FROM categories WHERE id = ?", [categoryId]);
    if (!categoryRow) {
      return res.fail("分类不存在", 400);
    }

    const videoUrl = `${pdfbseUrl}/uploads/${videoFile.filename}`;
    const coverUrl = coverFile ? `${pdfbseUrl}/uploads/${coverFile.filename}` : null;

    // 存库时用 categoryId 和 categoryRow.name
    const result = await db.query(
      "INSERT INTO videos (title, description, category, category_id, video_url, cover_url) VALUES (?, ?, ?, ?, ?, ?)",
      [title, description || '', categoryRow.name, categoryId, videoUrl, coverUrl]
    );

    const [newVideo] = await db.query("SELECT * FROM videos WHERE id = ?", [result.insertId]);
    res.success(newVideo, "视频上传成功");
  } catch (error) {
    next(error);
  }
};

/**
 * 更新视频信息
 */
exports.updateVideo = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { title, description, categoryId } = req.body;

    // 检查视频是否存在
    const [video] = await db.query('SELECT * FROM videos WHERE id = ?', [id]);
    if (!video) {
      return res.fail('视频不存在', 404);
    }

    // 如果提供了分类ID，验证分类是否存在
    let categoryName = video.category;
    if (categoryId) {
      const [categoryRow] = await db.query("SELECT name FROM categories WHERE id = ?", [categoryId]);
      if (!categoryRow) {
        return res.fail("分类不存在", 400);
      }
      categoryName = categoryRow.name;
    }

    // 更新视频信息
    const updateFields = [];
    const updateValues = [];

    if (title) {
      updateFields.push('title = ?');
      updateValues.push(title);
    }
    if (description !== undefined) {
      updateFields.push('description = ?');
      updateValues.push(description);
    }
    if (categoryId) {
      updateFields.push('category_id = ?');
      updateFields.push('category = ?');
      updateValues.push(categoryId);
      updateValues.push(categoryName);
    }

    if (updateFields.length === 0) {
      return res.fail('没有需要更新的字段', 400);
    }

    updateValues.push(id);
    const query = `UPDATE videos SET ${updateFields.join(', ')} WHERE id = ?`;
    await db.query(query, updateValues);

    const [updatedVideo] = await db.query('SELECT * FROM videos WHERE id = ?', [id]);
    res.success(updatedVideo, '视频信息更新成功');
  } catch (error) {
    next(error);
  }
};

/**
 * 删除视频
 */
exports.deleteVideo = async (req, res, next) => {
  try {
    const { id } = req.params;

    // 检查视频是否存在
    const [video] = await db.query('SELECT * FROM videos WHERE id = ?', [id]);
    if (!video) {
      return res.fail('视频不存在', 404);
    }

    // 删除视频记录
    await db.query('DELETE FROM videos WHERE id = ?', [id]);

    // 可选：删除文件系统中的视频文件和封面文件
    // 这里可以根据需要添加文件删除逻辑

    res.success(null, '视频删除成功');
  } catch (error) {
    next(error);
  }
};

/**
 * 添加视频分类
 */
exports.addCategory = async (req, res, next) => {
  try {
    const { name } = req.body;

    if (!name) {
      return res.fail('分类名称不能为空', 400);
    }

    // 检查分类是否已存在
    const [existing] = await db.query('SELECT * FROM categories WHERE name = ?', [name]);
    if (existing) {
      return res.fail('分类名称已存在', 400);
    }

    const result = await db.query('INSERT INTO categories (name) VALUES (?)', [name]);
    const [newCategory] = await db.query('SELECT * FROM categories WHERE id = ?', [result.insertId]);

    res.success(newCategory, '分类添加成功');
  } catch (error) {
    next(error);
  }
};

/**
 * 删除视频分类
 */
exports.deleteCategory = async (req, res, next) => {
  try {
    const { id } = req.params;

    // 检查分类是否存在
    const [category] = await db.query('SELECT * FROM categories WHERE id = ?', [id]);
    if (!category) {
      return res.fail('分类不存在', 404);
    }

    // 检查是否有视频使用该分类
    const [videos] = await db.query('SELECT COUNT(*) as count FROM videos WHERE category_id = ?', [id]);
    if (videos && videos.count > 0) {
      return res.fail('该分类下还有视频，无法删除', 400);
    }

    // 删除分类
    await db.query('DELETE FROM categories WHERE id = ?', [id]);

    res.success(null, '分类删除成功');
  } catch (error) {
    next(error);
  }
};

/**
 * 初始化Tebi分段上传（用于断点续传）
 */
exports.initVideoUpload = async (req, res) => {
  try {
    const { fileName, contentType, totalChunks } = req.body;

    if (!fileName || !contentType) {
      return res.fail('缺少 fileName 或 contentType 参数', 400);
    }

    // 生成唯一的文件键名
    const timestamp = Date.now();
    const randomStr = Math.round(Math.random() * 1e9);
    const ext = path.extname(fileName);
    const fileKey = `videos/${timestamp}-${randomStr}${ext}`;

    // 初始化Tebi分段上传
    const initResult = await initiateMultipartUpload(fileKey, contentType);
    if (!initResult.success) {
      return res.fail(`初始化上传失败: ${initResult.error}`, 500);
    }

    // 将上传信息存储到数据库（临时表或使用videos表的一个临时字段）
    // 这里我们使用一个简单的内存存储，生产环境建议使用数据库
    // 暂时先返回，让前端保存uploadId和fileKey

    res.success({
      uploadId: initResult.uploadId,
      fileKey: fileKey,
      fileName: fileName
    }, '初始化上传成功');
  } catch (error) {
    console.error('初始化上传失败:', error);
    res.fail(`初始化失败: ${error.message}`, 500);
  }
};

/**
 * 检查已上传的分片（用于断点续传）- 从Tebi查询
 */
exports.checkVideoChunks = async (req, res) => {
  try {
    const { fileKey, uploadId } = req.query;

    if (!fileKey || !uploadId) {
      return res.fail('缺少 fileKey 或 uploadId 参数', 400);
    }

    // 从Tebi查询已上传的分片
    const partsResult = await listUploadedParts(fileKey, uploadId);
    if (!partsResult.success) {
      return res.fail(`查询失败: ${partsResult.error}`, 500);
    }

    // 提取已上传的分片编号（PartNumber从1开始，前端使用从0开始）
    const uploadedChunks = partsResult.uploadedParts.map(part => part.PartNumber - 1);

    res.success({ 
      uploadedChunks: uploadedChunks,
      totalChunks: uploadedChunks.length,
      parts: partsResult.uploadedParts
    }, `已找到 ${uploadedChunks.length} 个已上传的分片`);
  } catch (error) {
    console.error('检查分片失败:', error);
    res.fail(`检查失败: ${error.message}`, 500);
  }
};

/**
 * 分片上传处理（直接上传到Tebi，支持断点续传）
 */
exports.handleVideoChunkUpload = async (req, res) => {
  try {
    const { chunkIndex, totalChunks, fileKey, uploadId } = req.body;
    const file = req.file;

    if (!file || chunkIndex === undefined || !totalChunks || !fileKey || !uploadId) {
      return res.fail('参数不完整：需要 chunkIndex, totalChunks, fileKey, uploadId', 400);
    }

    // 检查分片是否已上传到Tebi（断点续传）
    const partsResult = await listUploadedParts(fileKey, uploadId);
    if (partsResult.success) {
      const partNumber = parseInt(chunkIndex) + 1; // Tebi的PartNumber从1开始
      const existingPart = partsResult.uploadedParts.find(p => p.PartNumber === partNumber);
      
      if (existingPart) {
        // 删除临时文件
        if (fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
        }
        
        return res.success({ 
          chunkIndex, 
          skipped: true,
          ETag: existingPart.ETag,
          PartNumber: partNumber
        }, `分片 ${chunkIndex} 已存在于Tebi，跳过上传`);
      }
    }

    // 读取分片内容
    const chunkBuffer = fs.readFileSync(file.path);
    
    // 删除临时文件
    fs.unlinkSync(file.path);

    // 上传分片到Tebi（PartNumber从1开始）
    const partNumber = parseInt(chunkIndex) + 1;
    const uploadResult = await uploadPart(fileKey, uploadId, partNumber, chunkBuffer);

    if (!uploadResult.success) {
      return res.fail(`上传分片失败: ${uploadResult.error}`, 500);
    }

    res.success({ 
      chunkIndex,
      skipped: false,
      ETag: uploadResult.ETag,
      PartNumber: partNumber
    }, `分片 ${chunkIndex} 上传到Tebi成功`);
  } catch (error) {
    console.error('分片上传失败:', error);
    // 清理临时文件
    if (req.file && fs.existsSync(req.file.path)) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (e) {
        console.error('清理临时文件失败:', e);
      }
    }
    res.fail(`上传失败: ${error.message}`, 500);
  }
};

/**
 * 完成Tebi分段上传并保存到数据库
 */
exports.handleVideoMergeChunks = async (req, res) => {
  try {
    const { fileKey, uploadId, totalChunks, title, description, categoryId, coverFile } = req.body;
    const coverFileObj = req.file; // 封面文件（如果有）

    if (!fileKey || !uploadId || !totalChunks || !title || !categoryId) {
      return res.fail('参数缺失：fileKey、uploadId、totalChunks、title、categoryId 均为必填', 400);
    }

    // 验证分类是否存在
    const [categoryRow] = await db.query("SELECT name FROM categories WHERE id = ?", [categoryId]);
    if (!categoryRow) {
      return res.fail("分类不存在", 400);
    }

    // 查询所有已上传的分片
    const partsResult = await listUploadedParts(fileKey, uploadId);
    if (!partsResult.success) {
      return res.fail(`查询已上传分片失败: ${partsResult.error}`, 500);
    }

    const uploadedParts = partsResult.uploadedParts;
    if (uploadedParts.length !== Number(totalChunks)) {
      return res.fail(`分片数量不匹配：期望 ${totalChunks}，实际已上传 ${uploadedParts.length}`, 400);
    }

    // 按PartNumber排序
    uploadedParts.sort((a, b) => a.PartNumber - b.PartNumber);

    // 构建完成上传所需的Parts数组
    const parts = uploadedParts.map(part => ({
      ETag: part.ETag,
      PartNumber: part.PartNumber
    }));

    // 完成Tebi分段上传
    const completeResult = await completeMultipartUpload(fileKey, uploadId, parts);
    if (!completeResult.success) {
      return res.fail(`完成上传失败: ${completeResult.error}`, 500);
    }

    // 注意：completeMultipartUpload 成功后，分段上传记录会自动清理
    // 分片会被合并成最终文件，分段上传记录不再存在
    // 所以这里不需要手动清理，分段上传记录已经被自动删除了
    console.log(`✅ 视频上传完成，分段上传记录已自动清理: ${fileKey}`);

    const videoUrl = completeResult.url || getPublicUrl(fileKey);

    // 处理封面文件
    let coverUrl = null;
    if (coverFileObj) {
      // 上传封面到Tebi
      const { uploadToTebi } = require('../../utils/tebiStorage');
      const coverBuffer = fs.readFileSync(coverFileObj.path);
      const coverFileName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${path.extname(coverFileObj.originalname)}`;
      const coverUploadResult = await uploadToTebi(coverBuffer, `covers/${coverFileName}`, coverFileObj.mimetype);
      
      // 清理临时文件
      fs.unlinkSync(coverFileObj.path);
      
      if (coverUploadResult.success) {
        coverUrl = coverUploadResult.url;
      }
    } else if (coverFile) {
      coverUrl = coverFile; // 如果已经提供了封面URL
    }

    // 保存到数据库
    const result = await db.query(
      "INSERT INTO videos (title, description, category, category_id, video_url, cover_url) VALUES (?, ?, ?, ?, ?, ?)",
      [title, description || '', categoryRow.name, categoryId, videoUrl, coverUrl]
    );

    // 清理uploads目录中可能存在的相关临时文件
    try {
      if (fs.existsSync(UPLOAD_DIR)) {
        const files = fs.readdirSync(UPLOAD_DIR);
        const cleanedFiles = [];
        
        for (const file of files) {
          // 查找与当前上传相关的分片文件
          if (file.includes('part') || file.includes(fileKey.split('/').pop())) {
            const filePath = path.join(UPLOAD_DIR, file);
            fs.unlinkSync(filePath);
            cleanedFiles.push(file);
          }
        }
        
        if (cleanedFiles.length > 0) {
          console.log(`✅ 清理uploads目录中的临时文件: ${cleanedFiles.length} 个文件被删除`);
        }
      }
    } catch (cleanupError) {
      console.error('清理uploads目录临时文件失败:', cleanupError);
    }

    const [newVideo] = await db.query("SELECT * FROM videos WHERE id = ?", [result.insertId]);
    res.success(newVideo, "视频上传成功");
  } catch (error) {
    console.error('完成上传失败:', error);
    // 清理临时文件
    if (req.file && fs.existsSync(req.file.path)) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (e) {
        console.error('清理临时文件失败:', e);
      }
    }
    res.fail(`完成上传失败: ${error.message}`, 500);
  }
};

/**
 * 手动清理分片文件
 */
exports.cleanupChunks = async (req, res) => {
  try {
    const { fileName } = req.body;
    
    if (fileName) {
      // 清理指定文件的分片
      const chunkDir = path.join(CHUNK_DIR, fileName);
      if (fs.existsSync(chunkDir)) {
        fs.rmSync(chunkDir, { recursive: true, force: true });
        console.log(`手动清理分片目录: ${chunkDir}`);
        return res.success(null, `分片清理成功: ${fileName}`);
      } else {
        return res.fail("分片目录不存在", 404);
      }
    } else {
      // 清理所有超过2小时未使用的分片
      cleanupOldChunks();
      return res.success(null, "开始清理旧分片文件");
    }
  } catch (error) {
    console.error("清理分片失败:", error);
    res.fail(`清理分片失败: ${error.message}`, 500);
  }
};
