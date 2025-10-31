// 测试视频上传到Tebi存储的功能
const fs = require('fs');
const path = require('path');
const { uploadToTebi, getPresignedUrl, deleteFromTebi } = require('./utils/tebiStorage');

async function testVideoUpload() {
  try {
    console.log('开始测试视频上传到Tebi...');
    
    // 检查测试文件是否存在
    const testFilePath = path.join(__dirname, 'test.png');
    if (!fs.existsSync(testFilePath)) {
      console.error('测试文件不存在:', testFilePath);
      return;
    }
    
    // 读取测试文件
    const fileBuffer = fs.readFileSync(testFilePath);
    console.log('测试文件大小:', fileBuffer.length, '字节');
    
    // 上传到Tebi
    console.log('上传文件到Tebi...');
    const uploadResult = await uploadToTebi(fileBuffer, 'test-upload.png', 'image/png');
    
    if (uploadResult.success) {
      console.log('✅ 上传成功!');
      console.log('桶域名格式URL:', uploadResult.url);
      console.log('预签名URL:', uploadResult.presignedUrl);
      console.log('文件Key:', uploadResult.fileKey);
      console.log('文件大小:', uploadResult.size, '字节');
      
      // 测试独立的获取预签名URL功能
      console.log('\n获取独立预签名URL...');
      const separatePresignedUrl = await getPresignedUrl(uploadResult.fileKey, 3600);
      console.log('✅ 独立预签名URL:', separatePresignedUrl);
      
      // 测试删除文件
      console.log('\n删除文件...');
      const deleteResult = await deleteFromTebi(uploadResult.fileKey);
      console.log('✅ 删除结果:', deleteResult.success ? '成功' : '失败');
      
      console.log('\n重要提示：请检查输出的桶域名格式URL和预签名URL是否可以正常访问。');
    } else {
      console.error('❌ 上传失败:', uploadResult.error);
    }
  } catch (error) {
    console.error('测试过程中出错:', error);
  }
}

// 执行测试
testVideoUpload();