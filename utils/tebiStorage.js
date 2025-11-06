/**
 * Tebi对象存储工具函数
 * 封装与Tebi对象存储交互的核心功能
 * 实现与testTebi.js一致的逻辑
 */

const { S3Client, PutObjectCommand, DeleteObjectCommand, ListObjectsV2Command, GetObjectCommand, 
        CreateMultipartUploadCommand, UploadPartCommand, CompleteMultipartUploadCommand, AbortMultipartUploadCommand,
        ListPartsCommand, ListMultipartUploadsCommand } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const { NodeHttpHandler } = require("@aws-sdk/node-http-handler");
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
  forcePathStyle: true, // 上传时使用路径风格
  requestTimeout: 1800000, // 请求超时：30分钟
  connectTimeout: 60000,   // 连接超时：1分钟
  maxAttempts: 5,
  retryMode: 'standard',
  // 优化连接设置
  maxSockets: 30,          // 增加最大套接字数
  maxRedirects: 3,
  requestHandler: new NodeHttpHandler({
    connectionTimeout: 60000,   // 60s 连接超时
    socketTimeout: 120000,      // 120s socket超时
    maxSockets: 30,             // 每个主机的最大套接字数
    // 启用TCP保持连接
    socketOptions: {
      keepAlive: true,
      keepAliveInitialDelay: 10000 // 10秒后开始保持连接
    }
  })
});

/**
 * 上传文件到Tebi对象存储
 * @param {Buffer|Stream} data - 文件内容的Buffer或可读流
 * @param {string} filename - 文件名
 * @param {string} contentType - 文件MIME类型
 * @param {boolean} [isStream=false] - 是否为流式上传
 * @param {number} [fileSize=null] - 文件大小（字节），流式上传时必须提供
 * @returns {Promise<Object>} 包含文件信息和URL的对象
 */
async function uploadToTebi(data, filename, contentType, isStream = false, fileSize = null) {
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
      isStream: isStream,
      fileSize: isStream ? fileSize : (data ? data.length : 'unknown')
    });
    
    // 创建上传命令
    const commandParams = {
      Bucket: tebiConfig.bucketName,
      Key: fileKey,
      Body: data, // 可以是Buffer或Stream
      ContentType: contentType,
      ACL: 'public-read' // 设置对象公开可读
    };
    
    // 如果是流式上传，必须提供Content-Length
    if (isStream && fileSize !== null) {
      commandParams.ContentLength = fileSize;
    }
    
    const command = new PutObjectCommand(commandParams);
    
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
      size: isStream ? fileSize : (data ? data.length : 'unknown')
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
 * 初始化分段上传
 * @param {string} filename - 文件名
 * @param {string} contentType - 文件MIME类型
 * @returns {Promise<Object>} 包含上传ID的对象
 */
async function initiateMultipartUpload(filename, contentType) {
  try {
    // 确保filename已经包含前缀
    let fileKey = filename;
    if (!filename.startsWith(tebiConfig.filePrefix)) {
      fileKey = `${tebiConfig.filePrefix}${filename}`;
    }
    
    const command = new CreateMultipartUploadCommand({
      Bucket: tebiConfig.bucketName,
      Key: fileKey,
      ContentType: contentType,
      ACL: 'public-read'
    });
    
    const response = await s3Client.send(command);
    console.log('分段上传初始化成功:', response.UploadId);
    
    return {
      success: true,
      uploadId: response.UploadId,
      fileKey: fileKey
    };
  } catch (error) {
    console.error('分段上传初始化失败:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * 上传分段
 * @param {string} fileKey - 文件键名
 * @param {string} uploadId - 上传ID
 * @param {number} partNumber - 分段编号
 * @param {Buffer} buffer - 分段内容
 * @returns {Promise<Object>} 包含ETag的对象
 */
async function uploadPart(fileKey, uploadId, partNumber, buffer) {
  const maxRetries = 4;
  let attempt = 0;
  while (attempt <= maxRetries) {
    try {
      const command = new UploadPartCommand({
        Bucket: tebiConfig.bucketName,
        Key: fileKey,
        UploadId: uploadId,
        PartNumber: partNumber,
        Body: buffer
      });
      const response = await s3Client.send(command);
      console.log(`分段 ${partNumber} 上传成功, ETag: ${response.ETag}`);
      return { success: true, ETag: response.ETag, PartNumber: partNumber };
    } catch (error) {
      const errMsg = error?.message || String(error);
      const isTransient =
        error?.code === 'ECONNRESET' ||
        error?.name === 'TimeoutError' ||
        /ECONNRESET|ETIMEDOUT|EHOSTUNREACH|ENETUNREACH|socket hang up/i.test(errMsg);

      if (attempt < maxRetries && isTransient) {
        const backoffMs = Math.min(4000, 500 * Math.pow(2, attempt)) + Math.floor(Math.random() * 300);
        console.warn(`分段 ${partNumber} 第${attempt + 1}次失败（将重试）：${errMsg}，退避 ${backoffMs}ms`);
        await new Promise(r => setTimeout(r, backoffMs));
        attempt++;
        continue;
      }
      console.error(`分段 ${partNumber} 上传失败:`, error);
      return { success: false, error: errMsg, PartNumber: partNumber };
    }
  }
}

/**
 * 完成分段上传
 * @param {string} fileKey - 文件键名
 * @param {string} uploadId - 上传ID
 * @param {Array<{ETag: string, PartNumber: number}>} parts - 已上传分段信息
 * @returns {Promise<Object>} 上传结果
 */
async function completeMultipartUpload(fileKey, uploadId, parts) {
  try {
    const command = new CompleteMultipartUploadCommand({
      Bucket: tebiConfig.bucketName,
      Key: fileKey,
      UploadId: uploadId,
      MultipartUpload: {
        Parts: parts
      }
    });
    
    await s3Client.send(command);
    console.log('分段上传完成:', fileKey);
    
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
      url: publicUrl,
      publicUrl: publicUrl,
      presignedUrl: presignedUrl
    };
  } catch (error) {
    console.error('完成分段上传失败:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * 中止分段上传
 * @param {string} fileKey - 文件键名
 * @param {string} uploadId - 上传ID
 * @returns {Promise<Object>} 中止结果
 */
async function abortMultipartUpload(fileKey, uploadId) {
  try {
    const command = new AbortMultipartUploadCommand({
      Bucket: tebiConfig.bucketName,
      Key: fileKey,
      UploadId: uploadId
    });
    
    await s3Client.send(command);
    console.log('分段上传已中止:', fileKey);
    
    return {
      success: true
    };
  } catch (error) {
    console.error('中止分段上传失败:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * 使用分段上传方式上传大文件
 * @param {Array<Buffer>} chunks - 文件块数组
 * @param {string} filename - 文件名
 * @param {string} contentType - 文件MIME类型
 * @param {Function} progressCallback - 进度回调函数，参数为0-100的数字
 * @returns {Promise<Object>} 上传结果
 */
async function uploadLargeFile(chunks, filename, contentType, progressCallback = null) {
  try {
    console.log(`开始上传大文件: ${filename}, 共${chunks.length}个分片`);
    
    // 初始化分段上传
    const initResult = await initiateMultipartUpload(filename, contentType);
    if (!initResult.success) {
      console.error('初始化分段上传失败:', initResult.error);
      return initResult;
    }
    
    const { uploadId, fileKey } = initResult;
    const uploadedParts = [];
    const totalChunks = chunks.length;
    
    // 设置并行上传的最大数量 - 增加到10以提高上传速度
    const MAX_CONCURRENT_UPLOADS = 10;
    let activeUploads = 0;
    let nextChunkIndex = 0;
    let failedUpload = false;
    let failureReason = null;
    
    // 创建一个Promise来处理所有上传
    return new Promise(async (resolve) => {
      // 上传下一个分片的函数
      const uploadNextChunk = async () => {
        if (failedUpload) return;
        
        const currentIndex = nextChunkIndex++;
        if (currentIndex >= totalChunks) return;
        
        activeUploads++;
        const partNumber = currentIndex + 1; // 分段编号从1开始
        const chunk = chunks[currentIndex];
        
        try {
          console.log(`上传分片 ${partNumber}/${totalChunks}`);
          const partResult = await uploadPart(fileKey, uploadId, partNumber, chunk);
          
          if (!partResult.success) {
            console.error(`分片 ${partNumber} 上传失败:`, partResult.error);
            failedUpload = true;
            failureReason = partResult;
            await abortMultipartUpload(fileKey, uploadId);
            resolve(partResult);
            return;
          }
          
          uploadedParts.push({
            ETag: partResult.ETag,
            PartNumber: partResult.PartNumber
          });
          
          // 更新进度
          if (progressCallback) {
            const progress = Math.floor(uploadedParts.length / totalChunks * 100);
            progressCallback(progress);
          }
          
          console.log(`分片 ${partNumber} 上传成功, 进度: ${uploadedParts.length}/${totalChunks}`);
        } catch (error) {
          console.error(`分片 ${partNumber} 上传出错:`, error);
          failedUpload = true;
          failureReason = {
            success: false,
            error: `分片 ${partNumber} 上传失败: ${error.message}`
          };
          await abortMultipartUpload(fileKey, uploadId);
          resolve(failureReason);
          return;
        } finally {
          activeUploads--;
          
          // 启动下一个上传
          uploadNextChunk();
          
          // 检查是否所有分片都已上传
          if (activeUploads === 0 && nextChunkIndex >= totalChunks && !failedUpload) {
            try {
              console.log('所有分片上传完成，准备合并...');
              const completeResult = await completeMultipartUpload(fileKey, uploadId, uploadedParts);
              console.log('分段上传完成:', completeResult);
              resolve(completeResult);
            } catch (error) {
              console.error('完成分段上传失败:', error);
              resolve({
                success: false,
                error: `完成分段上传失败: ${error.message}`
              });
            }
          }
        }
      };
      
      // 启动初始的并行上传
      for (let i = 0; i < Math.min(MAX_CONCURRENT_UPLOADS, totalChunks); i++) {
        uploadNextChunk();
      }
    });
  } catch (error) {
    console.error('大文件上传失败:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

module.exports = {
  uploadToTebi,
  initiateMultipartUpload,
  uploadPart,
  completeMultipartUpload,
  abortMultipartUpload,
  uploadLargeFile,
  getPresignedUrl: async function(fileKey, expires = Math.floor(tebiConfig.expires / 1000)) {
    try {
      const command = new GetObjectCommand({
        Bucket: tebiConfig.bucketName,
        Key: fileKey
      });
      const url = await getSignedUrl(s3Client, command, { expiresIn: expires });
      console.log('🔗 生成预签名URL成功:', fileKey);
      return url;
    } catch (error) {
      console.error('获取预签名URL失败:', error);
      throw error;
    }
  },
  getPublicUrl: function(fileKey) {
    return `${tebiConfig.customDomain}/${fileKey}`;
  },
  getPublicBaseUrl: function() {
    return tebiConfig.customDomain;
  },
  deleteFromTebi: async function(fileKey) {
    try {
      console.log(`📤 开始执行文件删除操作`);
      console.log(`删除参数: fileKey='${fileKey}', bucket='${tebiConfig.bucketName}'`);
      
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
      
      const command = new DeleteObjectCommand({
        Bucket: tebiConfig.bucketName,
        Key: fileKey.trim()
      });
      
      console.log(`📝 准备发送删除命令到S3客户端`);
      
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
  },
  listFiles: async function(prefix = '') {
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
  },
  /**
   * 查询已上传的分片列表（用于断点续传）
   * @param {string} fileKey - 文件键名
   * @param {string} uploadId - 上传ID
   * @returns {Promise<Object>} 包含已上传分片信息的对象
   */
  listUploadedParts: async function(fileKey, uploadId) {
    try {
      const command = new ListPartsCommand({
        Bucket: tebiConfig.bucketName,
        Key: fileKey,
        UploadId: uploadId
      });
      
      const response = await s3Client.send(command);
      const uploadedParts = (response.Parts || []).map(part => ({
        PartNumber: part.PartNumber,
        ETag: part.ETag,
        Size: part.Size,
        LastModified: part.LastModified
      }));
      
      console.log(`查询到已上传的分片: ${uploadedParts.length} 个`);
      return {
        success: true,
        uploadedParts: uploadedParts,
        totalParts: uploadedParts.length
      };
    } catch (error) {
      console.error('查询已上传分片失败:', error);
      return {
        success: false,
        error: error.message,
        uploadedParts: []
      };
    }
  },
  /**
   * 列出未完成的分段上传
   * @param {string} prefix - 文件前缀（可选）
   * @returns {Promise<Object>} 包含未完成上传列表的对象
   */
  listMultipartUploads: async function(prefix = '') {
    try {
      const command = new ListMultipartUploadsCommand({
        Bucket: tebiConfig.bucketName,
        Prefix: prefix
      });
      
      const response = await s3Client.send(command);
      const uploads = (response.Uploads || []).map(upload => ({
        Key: upload.Key,
        UploadId: upload.UploadId,
        Initiated: upload.Initiated
      }));
      
      console.log(`查询到未完成的上传: ${uploads.length} 个`);
      return {
        success: true,
        uploads: uploads
      };
    } catch (error) {
      console.error('查询未完成上传失败:', error);
      return {
        success: false,
        error: error.message,
        uploads: []
      };
    }
  },
  /**
   * 清理未完成的分段上传（导出供外部使用）
   */
  abortMultipartUpload: abortMultipartUpload,
  
  /**
   * 清理Bucket中所有未完成的multipart uploads
   * @returns {Promise<Object>} 清理结果
   */
  cleanupMultipartUploads: async function() {
    try {
      console.log('🔄 开始清理未完成的multipart uploads...');
      
      const listResult = await this.listMultipartUploads();
      
      if (!listResult.success) {
        console.error('❌ 获取未完成上传列表失败:', listResult.error);
        return {
          success: false,
          error: listResult.error,
          abortedCount: 0
        };
      }
      
      const uploads = listResult.uploads || [];
      
      if (uploads.length === 0) {
        console.log('✅ 没有未完成的multipart uploads需要清理');
        return {
          success: true,
          abortedCount: 0,
          message: '没有未完成的上传'
        };
      }
      
      console.log(`⚠️ 发现 ${uploads.length} 个未完成的multipart uploads，正在清理...`);
      
      let abortedCount = 0;
      const errors = [];
      
      // 逐个中止未完成的上传
      for (const upload of uploads) {
        try {
          const result = await this.abortMultipartUpload(upload.Key, upload.UploadId);
          
          if (result.success) {
            console.log(`🗑️ 已成功中止: Key=${upload.Key}, UploadId=${upload.UploadId}`);
            abortedCount++;
          } else {
            const errorMsg = `中止失败: Key=${upload.Key}, UploadId=${upload.UploadId}, 错误: ${result.error}`;
            console.error(`❌ ${errorMsg}`);
            errors.push(errorMsg);
          }
        } catch (err) {
          const errorMsg = `处理上传时出错: Key=${upload.Key}, UploadId=${upload.UploadId}, 错误: ${err.message}`;
          console.error(`❌ ${errorMsg}`);
          errors.push(errorMsg);
        }
      }
      
      console.log(`✅ 清理完成。已中止 ${abortedCount}/${uploads.length} 个未完成上传。${errors.length > 0 ? `有 ${errors.length} 个上传清理失败。` : ''}`);
      
      return {
        success: true,
        abortedCount: abortedCount,
        totalUploads: uploads.length,
        errors: errors,
        message: `成功清理 ${abortedCount}/${uploads.length} 个未完成上传`
      };
    } catch (error) {
      console.error('❌ 清理multipart uploads过程中发生错误:', error);
      return {
        success: false,
        error: error.message,
        abortedCount: 0
      };
    }
  }
};