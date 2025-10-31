/**
 * 图片压缩上传控制器
 * 核心流程：接收客户端图片 -> 校验（token/文件/appid） -> 压缩处理 -> 上传至Tebi对象存储 -> 返回结果
 * 依赖：sharp(图片处理)、Tebi存储工具
 */
const sharp = require("sharp");       // 高效图片处理库（压缩/旋转/缩放）
const { appidArr } = require("../config/wechat"); // 应用配置
const { uploadToTebi } = require("../utils/tebiStorage"); // Tebi对象存储工具


// ------------------------------
// 常量定义：统一配置，便于维护
// ------------------------------
const MAX_IMAGE_DIMENSION = 2000; // 图片最长边最大限制（像素）
const COMPRESS_QUALITY = 85;      // 图片压缩质量（0-100）
const UPLOAD_TIMEOUT = 120000;    // 转发上传超时时间（毫秒）


// ------------------------------
// 校验类辅助函数：参数/权限校验
// ------------------------------

/**
 * 验证token有效性
 * @param {string} token - 请求头中的认证token
 * @returns {boolean} 验证结果（true=有效，false=无效）
 * @description 实际项目中需替换为JWT等真实校验逻辑
 */
const validateToken = (token) => !!token;


/**
 * 校验上传文件是否符合要求
 * @param {Object} file - multer解析的文件对象（含buffer/mimetype等信息）
 * @returns {string|null} 错误信息（null表示校验通过）
 * @description 检查文件是否存在及是否为图片类型
 */
const validateFile = (file) => {
  if (!file) return "请上传图片（字段名必须为 file）";
  if (!/^image\//.test(file.mimetype)) return "仅支持图片文件上传（如jpg、png等）";
  return null;
};


/**
 * 校验appid有效性并返回对应索引
 * @param {string} appid - 客户端传递的应用标识
 * @returns {string|number} 错误信息（字符串）或有效索引（数字）
 * @description 从配置列表中匹配appid，不存在则返回错误
 */
const validateAppid = (appid) => {
  if (!appid) return "请提供有效的appid";
  // 严格匹配appid（值和类型完全一致）
  const index = appidArr.findIndex(item => item.id === appid);
  if (index === -1) return "无效的appid";
  return index;
};


// ------------------------------
// 图片处理类辅助函数：压缩/尺寸计算
// ------------------------------

/**
 * 计算图片压缩后的目标尺寸（等比例缩放）
 * @param {number} originalWidth - 原图宽度（像素）
 * @param {number} originalHeight - 原图高度（像素）
 * @param {number} maxDimension - 最长边最大限制（默认2000像素）
 * @returns {Object} 压缩后尺寸 { targetWidth, targetHeight }
 * @description 若原图尺寸小于限制，则保持原尺寸；否则按比例缩放至最长边不超过限制
 */
const calculateCompressSize = (originalWidth, originalHeight, maxDimension = MAX_IMAGE_DIMENSION) => {
  // 原图尺寸在限制范围内，无需缩放
  if (originalWidth <= maxDimension && originalHeight <= maxDimension) {
    return { targetWidth: originalWidth, targetHeight: originalHeight };
  }
  // 计算缩放比例（以最长边为基准）
  const scale = maxDimension / Math.max(originalWidth, originalHeight);
  return {
    targetWidth: Math.round(originalWidth * scale),
    targetHeight: Math.round(originalHeight * scale),
  };
};


/**
 * 压缩图片（自动纠正旋转+按目标尺寸缩放）
 * @param {Buffer} imageBuffer - 原图二进制数据
 * @param {number} targetWidth - 目标宽度（像素）
 * @param {number} targetHeight - 目标高度（像素）
 * @returns {Promise<Buffer>} 压缩后的图片二进制数据
 * @description 处理EXIF旋转信息（解决竖屏照片横显问题），并按目标尺寸等比例压缩
 */
const compressImageBuffer = async (imageBuffer, targetWidth, targetHeight) => {
  return sharp(imageBuffer)
    .rotate() // 自动读取EXIF中的旋转信息，纠正图片方向
    .resize({
      width: targetWidth,
      height: targetHeight,
      fit: "inside", // 保持比例，不裁剪图片
      withoutEnlargement: true // 若原图尺寸小于目标尺寸，不放大（避免模糊）
    })
    .toFormat("jpeg", {
      quality: COMPRESS_QUALITY,
      mozjpeg: true // 启用mozjpeg编码器，相同质量下文件更小
    })
    .toBuffer();
};


// ------------------------------
// 网络请求类辅助函数：构建请求/转发
// ------------------------------

// ------------------------------
// 主控制器：串联整个图片处理流程
// ------------------------------

/**
 * 图片压缩上传主逻辑
 * @param {Object} req - Express请求对象（含文件、headers、body等）
 * @param {Object} res - Express响应对象（用于返回结果）
 * @param {Function} next - Express中间件回调（传递未捕获错误）
 */
const compressImage = async (req, res, next) => {
  try {
    // 1. 验证token（权限校验）
    const token = req.headers.token;
    if (!validateToken(token)) {
      return res.fail("token 无效或缺失", 401);
    }

    // 2. 校验上传文件（格式校验）
    const fileError = validateFile(req.file);
    if (fileError) {
      return res.fail(fileError, 400);
    }
    const originalFile = req.file;
    console.log(`✅ 接收图片：${originalFile.originalname}，原始大小：${(originalFile.size / 1024).toFixed(2)} KB`);

    // 3. 校验appid（路由校验）
    const appidResult = validateAppid(req.body.appid);
    if (typeof appidResult === "string") { // 若返回字符串，说明是错误信息
      return res.fail(appidResult, 400);
    }
    console.log(`✅ 验证通过：appid=${req.body.appid}`);

    // 4. 计算图片压缩尺寸（预处理）
    const { width: originalWidth, height: originalHeight } = await sharp(originalFile.buffer).metadata();
    console.log(`🖼️ 原图尺寸：${originalWidth}x${originalHeight}px`);

    const { targetWidth, targetHeight } = calculateCompressSize(originalWidth, originalHeight);
    console.log(`📏 压缩目标尺寸：${targetWidth}x${targetHeight}px`);

    // 5. 执行图片压缩（核心处理）
    const compressedBuffer = await compressImageBuffer(originalFile.buffer, targetWidth, targetHeight);
    console.log(`📉 压缩完成：大小 ${(compressedBuffer.length / 1024).toFixed(2)} KB`);

    // 6. 上传压缩后的图片到Tebi对象存储
    const tebiUploadResult = await uploadToTebi(
      compressedBuffer, 
      originalFile.originalname, 
      "image/jpeg"
    );
    
    if (!tebiUploadResult.success) {
      console.error("❌ Tebi上传失败：", tebiUploadResult.error);
      return res.fail(`图片上传到Tebi失败：${tebiUploadResult.error}`, 500);
    }
    
    console.log(`✅ Tebi上传成功：${tebiUploadResult.url}`);

    // 7. 返回结果给客户端（响应处理）
    const data = {
      resultdata: {
        url: tebiUploadResult.url,
        fileKey: tebiUploadResult.fileKey,
        success: true
      },
      fileInfo: { // 附加文件处理信息，便于客户端展示
        originalName: originalFile.originalname,
        originalSizeKB: (originalFile.size / 1024).toFixed(2),
        compressedSizeKB: (compressedBuffer.length / 1024).toFixed(2),
        originalDimension: `${originalWidth}x${originalHeight}`,
        compressedDimension: `${targetWidth}x${targetHeight}`
      }
    }
    return res.success(data, "图片压缩并上传到Tebi成功");

  } catch (error) {
    console.error("❌ 处理流程出错：", error);

    // 分类处理已知错误，返回具体提示
    if (error.message.includes("unsupported image format")) {

      return res.fail('不支持的图片格式', 400);
    }
    if (error.code === "ECONNABORTED") {
      return res.fail('上传超时，请重试', 504);
    }
    if (error.response) {
      // 目标服务器返回错误状态（如401/403）
      return res.fail(`上传失败：${error.response.data?.message || "上传失败"}`, error.response.status);
    }
    // 未知错误：返回通用提示（开发环境附加错误详情）
    return res.fail('图片压缩或上传失败', 500, ...(process.env.NODE_ENV === "development" && { error: error.message }));
  }
};

module.exports = { compressImage };