/**
 * Tebi对象存储配置
 * 用于配置Tebi对象存储的连接信息和上传参数
 */

// 从环境变量或直接配置中获取Tebi存储的访问信息
// 注意：在生产环境中，建议使用环境变量来管理敏感信息
module.exports = {
  // 存储桶名称
  bucketName: process.env.TEBI_BUCKET_NAME || 'default-bucket',
  // 自定义域名（用于生成公开访问URL）
  customDomain: process.env.TEBI_CUSTOM_DOMAIN || 'https://cdn.example.com',
  // 访问密钥
  accessKeyId:  process.env.TEBI_ACCESS_KEY_ID || '',
  // 密钥
  secretAccessKey: process.env.TEBI_SECRET_ACCESS_KEY || '',
  // 服务端点（上传使用的官方endpoint）
  endpoint: process.env.TEBI_ENDPOINT || 'https://s3.tebi.io',
  // 预签名URL过期时间（毫秒）
  expires: process.env.TEBI_EXPIRES || 3600000,
  // 文件前缀，用于组织文件
  filePrefix: process.env.TEBI_FILE_PREFIX || 'videos/'
};