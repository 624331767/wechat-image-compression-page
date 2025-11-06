const {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  ListObjectsV2Command,
  ListMultipartUploadsCommand,
  AbortMultipartUploadCommand
} = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const fs = require('fs');

// ===============================
// 🔧 配置区
// ===============================
const TEBI_REGION = 'global';
const TEBI_BUCKET = 'oss.setwhat.dpdns.org'; // Bucket 名称
const TEBI_ENDPOINT = 'https://oss.setwhat.dpdns.org'; // 自定义域名
const TEBI_ACCESS_KEY = '2xw4VeePdt9eiZV3';
const TEBI_SECRET_KEY = '161bOZZoZhYNBCD02aHjrtOOIaEwec7Nt3SkNCBN';

// 初始化客户端
const s3 = new S3Client({
  region: TEBI_REGION,
  endpoint: 'https://s3.tebi.io', // ⚠️ 上传仍使用官方 endpoint
  credentials: {
    accessKeyId: TEBI_ACCESS_KEY,
    secretAccessKey: TEBI_SECRET_KEY
  },
  forcePathStyle: true
});

// ===============================
// 🟢 上传文件并返回自定义域名公开 URL
// ===============================
async function uploadFile(localPath, remotePath) {
  const fileContent = fs.readFileSync(localPath);
  await s3.send(new PutObjectCommand({
    Bucket: TEBI_BUCKET,
    Key: remotePath,
    Body: fileContent,
    ContentType: 'application/octet-stream',
    ACL: 'public-read'
  }));
  console.log(`✅ 上传成功: ${remotePath}`);
  return `${TEBI_ENDPOINT}/${remotePath}`;
}

// ===============================
// 🟢 生成临时签名 URL（可选）
// ===============================
async function getFileUrl(remotePath, expiresInSeconds = 3600) {
  const command = new GetObjectCommand({
    Bucket: TEBI_BUCKET,
    Key: remotePath
  });
  const url = await getSignedUrl(s3, command, { expiresIn: expiresInSeconds });
  console.log('🔗 临时签名外链:', url);
  return url;
}

// ===============================
// 🟢 删除文件
// ===============================
async function deleteFile(remotePath) {
  const command = new DeleteObjectCommand({
    Bucket: TEBI_BUCKET,
    Key: remotePath
  });
  await s3.send(command);
  console.log(`🗑️ 已删除: ${remotePath}`);
}

// ===============================
// 🟢 列出文件
// ===============================
async function listFiles(prefix = '') {
  const command = new ListObjectsV2Command({
    Bucket: TEBI_BUCKET,
    Prefix: prefix
  });
  const response = await s3.send(command);
  console.log('📁 文件列表:', response.Contents?.map((f) => f.Key) || []);
  return response.Contents || [];
}

// ===============================
// 🟢 清理 Bucket 中所有未完成的 multipart uploads
// ===============================
async function cleanupMultipartUploads() {
  const listCommand = new ListMultipartUploadsCommand({
    Bucket: TEBI_BUCKET
  });

  const response = await s3.send(listCommand);
  const uploads = response.Uploads || [];

  if (uploads.length === 0) {
    console.log('✅ 没有未完成的 multipart uploads');
    return;
  }

  console.log(`⚠️ 发现 ${uploads.length} 个未完成的 multipart uploads，正在清理...`);

  for (const up of uploads) {
    try {
      await s3.send(new AbortMultipartUploadCommand({
        Bucket: TEBI_BUCKET,
        Key: up.Key,
        UploadId: up.UploadId
      }));
      console.log(`🗑️ 已中止: Key=${up.Key}, UploadId=${up.UploadId}`);
    } catch (err) {
      console.error(`❌ 中止失败: Key=${up.Key}, UploadId=${up.UploadId}`, err);
    }
  }
  console.log('✅ 清理完成');
}

// ===============================
// 🧪 示例测试
// ===============================
(async () => {
  const publicUrl = await uploadFile('./test.png', 'images/test.png');
  console.log('🌐 公共访问 URL:', publicUrl);

  await getFileUrl('images/test.png');

  await listFiles('images/');

  // 删除文件示例
  // await deleteFile('images/test.png');

  // 清理未完成 multipart uploads
  await cleanupMultipartUploads();
})();
