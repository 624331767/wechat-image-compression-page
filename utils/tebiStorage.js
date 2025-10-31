/**
 * Tebi对象存储工具函数
 * 封装与Tebi对象存储交互的核心功能
 * 实现与testTebi.js一致的逻辑
 */

const { S3Client, PutObjectCommand, DeleteObjectCommand, ListObjectsV2Command, GetObjectCommand } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const tebiConfig = require('../config/tebiConfig');

// 创建S3客户端
console.log('Tebi配置信息:', {
  uploadEndpoint: tebiConfig.endpoint,
  customDomain: tebiConfig.customDomain,
  bucketName: tebiConfig.bucketName,
  accessKeyId: tebiConfig.accessKeyId ? '已设置（长度：' + tebiConfig.accessKeyId.length + '）' : '未设置',
  secretAccessKey: tebiConfig.secretAccessKey ? '已设置（长度：' + tebiConfig.secretAccessKey.length + '）' : '未设置'
});

const s3Client = new S3Client({
  region: "global",
  endpoint: tebiConfig.endpoint, // 上传使用官方endpoint
  credentials: {
    accessKeyId: tebiConfig.accessKeyId,
    secretAccessKey: tebiConfig.secretAccessKey
  },
  forcePathStyle: true // 上传时使用路径风格
});

/**
 * 上传文件到Tebi对象存储
 * @param {Buffer} buffer - 文件内容的Buffer
 * @param {string} filename - 文件名
 * @param {string} contentType - 文件MIME类型
 * @returns {Promise<Object>} 包含文件信息和URL的对象
 */
async function uploadToTebi(buffer, filename, contentType) {
  try {
    // 确保filename已经包含前缀
    let fileKey = filename;
    if (!filename.startsWith(tebiConfig.filePrefix)) {
      fileKey = `${tebiConfig.filePrefix}${filename}`;
    }
    
    console.log('准备上传到Tebi:', {
      bucket: tebiConfig.bucketName,
      key: fileKey,
      contentType: contentType,
      size: buffer.length
    });
    
    // 创建上传命令
    const command = new PutObjectCommand({
      Bucket: tebiConfig.bucketName,
      Key: fileKey,
      Body: buffer,
      ContentType: contentType,
      ACL: 'public-read' // 设置对象公开可读
    });
    
    // 执行上传
    await s3Client.send(command);
    console.log('✅ 上传成功:', fileKey);
    
    // 生成自定义域名的公开访问URL
    const publicUrl = `${tebiConfig.customDomain}/${fileKey}`;
    
    // 生成预签名URL（可选，用于临时访问）
    const getCommand = new GetObjectCommand({
      Bucket: tebiConfig.bucketName,
      Key: fileKey
    });
    const presignedUrl = await getSignedUrl(s3Client, getCommand, { expiresIn: 3600 });
    
    return {
      success: true,
      fileKey: fileKey,
      url: publicUrl,      // 自定义域名的公开访问URL
      publicUrl: publicUrl,
      presignedUrl: presignedUrl,
      size: buffer.length
    };
  } catch (error) {
    console.error('Tebi上传失败:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * 获取文件的预签名URL（用于临时访问）
 * @param {string} fileKey - 文件在存储桶中的键
 * @param {number} expires - URL过期时间（秒）
 * @returns {Promise<string>} 预签名URL
 */
async function getPresignedUrl(fileKey, expires = Math.floor(tebiConfig.expires / 1000)) {
  try {
    // 创建GetObject命令
    const command = new GetObjectCommand({
      Bucket: tebiConfig.bucketName,
      Key: fileKey
    });
    
    // 生成预签名URL
    const url = await getSignedUrl(s3Client, command, { expiresIn: expires });
    console.log('🔗 生成预签名URL成功:', fileKey);
    return url;
  } catch (error) {
    console.error('获取预签名URL失败:', error);
    throw error;
  }
}

/**
 * 获取文件的公开访问URL
 * @param {string} fileKey - 文件在存储桶中的键
 * @returns {string} 公开访问URL
 */
function getPublicUrl(fileKey) {
  return `${tebiConfig.customDomain}/${fileKey}`;
}

/**
 * 获取基础URL（用于从完整URL中提取文件键）
 * @returns {string} 基础URL
 */
function getPublicBaseUrl() {
  return tebiConfig.customDomain;
}

/**
 * 删除Tebi存储中的文件
 * @param {string} fileKey - 文件在存储桶中的键
 * @returns {Promise<Object>} 删除结果对象
 */
async function deleteFromTebi(fileKey) {
  try {
    console.log(`📤 开始执行文件删除操作`);
    console.log(`删除参数: fileKey='${fileKey}', bucket='${tebiConfig.bucketName}'`);
    
    // 验证参数
    if (!fileKey || typeof fileKey !== 'string' || fileKey.trim() === '') {
      const errorMsg = '无效的文件键参数';
      console.error(`❌ 删除失败: ${errorMsg}`);
      return { 
        success: false, 
        error: errorMsg,
        details: { fileKey, bucket: tebiConfig.bucketName }
      };
    }
    
    if (!tebiConfig.bucketName) {
      const errorMsg = '未配置存储桶名称';
      console.error(`❌ 删除失败: ${errorMsg}`);
      return { 
        success: false, 
        error: errorMsg,
        details: { fileKey, bucket: tebiConfig.bucketName }
      };
    }
    
    // 创建删除命令
    const command = new DeleteObjectCommand({
      Bucket: tebiConfig.bucketName,
      Key: fileKey.trim()
    });
    
    console.log(`📝 准备发送删除命令到S3客户端`);
    
    // 执行删除
    const response = await s3Client.send(command);
    console.log(`✅ 删除命令执行成功，响应:`, response);
    console.log(`🗑️ 已成功删除Tebi文件: ${fileKey}`);
    
    return { 
      success: true, 
      response,
      fileKey,
      bucket: tebiConfig.bucketName
    };
  } catch (error) {
    console.error(`❌ 删除Tebi文件失败: ${error.message}`);
    console.error('错误详情:', error);
    
    // 提取更多错误信息
    const errorDetails = {
      message: error.message,
      code: error.code || 'Unknown',
      statusCode: error.$metadata?.httpStatusCode || 'Unknown',
      requestId: error.$metadata?.requestId || 'Unknown',
      extendedRequestId: error.$metadata?.extendedRequestId || 'Unknown',
      fileKey,
      bucket: tebiConfig.bucketName
    };
    
    return { 
      success: false, 
      error: error.message,
      details: errorDetails,
      originalError: error
    };
  }
}

/**
 * 列出Tebi存储桶中的文件
 * @param {string} prefix - 文件前缀
 * @returns {Promise<Array>} 文件列表
 */
async function listFiles(prefix = '') {
  try {
    const command = new ListObjectsV2Command({
      Bucket: tebiConfig.bucketName,
      Prefix: prefix
    });
    const response = await s3Client.send(command);
    console.log('📁 文件列表:', response.Contents?.map((f) => f.Key) || []);
    return response.Contents || [];
  } catch (error) {
    console.error('列出Tebi文件失败:', error);
    return [];
  }
}

module.exports = {
  uploadToTebi,
  getPresignedUrl,
  getPublicUrl,
  getPublicBaseUrl,
  deleteFromTebi,
  listFiles
};