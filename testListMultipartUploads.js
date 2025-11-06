// 简化的测试脚本：打印配置信息并测试ListMultipartUploads
require('dotenv').config(); // 加载环境变量
const { S3Client, ListMultipartUploadsCommand } = require("@aws-sdk/client-s3");
const tebiConfig = require('./config/tebiConfig');

// 打印关键配置信息
console.log('=== 关键配置信息 ===');
console.log('存储桶名称:', process.env.TEBI_BUCKET_NAME || tebiConfig.bucketName);
console.log('访问密钥ID是否设置:', !!process.env.TEBI_ACCESS_KEY_ID);
console.log('访问密钥ID长度:', process.env.TEBI_ACCESS_KEY_ID ? process.env.TEBI_ACCESS_KEY_ID.length : 0);
console.log('密钥是否设置:', !!process.env.TEBI_SECRET_ACCESS_KEY);
console.log('密钥长度:', process.env.TEBI_SECRET_ACCESS_KEY ? process.env.TEBI_SECRET_ACCESS_KEY.length : 0);
console.log('端点URL:', process.env.TEBI_ENDPOINT || tebiConfig.endpoint);

// 测试ListMultipartUploads的简化函数
async function testListMultipartUploads() {
  try {
    console.log('\n=== 测试ListMultipartUploads ===');
    
    // 直接使用环境变量创建客户端
    const s3Client = new S3Client({
      region: "global",
      endpoint: process.env.TEBI_ENDPOINT || 'https://s3.tebi.io',
      credentials: {
        accessKeyId: process.env.TEBI_ACCESS_KEY_ID,
        secretAccessKey: process.env.TEBI_SECRET_ACCESS_KEY
      },
      forcePathStyle: true
    });
    
    // 尝试列出未完成上传
    const command = new ListMultipartUploadsCommand({
      Bucket: process.env.TEBI_BUCKET_NAME || 'oss.setwhat.dpdns.org'
    });
    
    const response = await s3Client.send(command);
    console.log('成功获取未完成上传列表');
    console.log('未完成上传数量:', response.Uploads ? response.Uploads.length : 0);
    
    if (response.Uploads) {
      console.log('未完成上传列表:');
      response.Uploads.forEach((upload, index) => {
        console.log(`${index + 1}. ${upload.Key}`);
      });
    }
    
  } catch (error) {
    console.error('\n=== 错误信息 ===');
    console.error('错误名称:', error.name);
    console.error('错误消息:', error.message);
    console.error('HTTP状态码:', error.$metadata ? error.$metadata.httpStatusCode : '未知');
  }
}

// 执行测试
testListMultipartUploads();