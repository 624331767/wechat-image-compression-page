


 /**
  * multer配置项
  * 作用：处理文件上传的存储方式、大小限制、类型过滤
  */
const multer = require('multer');

 // 配置存储方式：临时存储到内存（不写入磁盘，适合临时处理后转发的场景）
 const storage = multer.memoryStorage();
 
 // 配置上传规则（大小限制+类型过滤）
 const upload = multer({
   storage: storage, // 使用内存存储
   limits: { 
     fileSize: 10 * 1024 * 1024 // 限制文件大小不超过10MB（防止超大文件占用过多内存）
   },
   fileFilter: (req, file, cb) => {
     // 过滤文件类型：仅允许mimetype以image/开头的文件（如image/jpeg、image/png）
     if (file.mimetype.startsWith('image/')) {
       // 允许上传：第一个参数为错误对象（null表示无错），第二个参数为是否允许
       cb(null, true);
     } else {
       // 拒绝上传：传递错误信息，后续错误中间件会捕获处理
       cb(new Error('仅支持图片文件（如jpg、png、jpeg等）'), false);
     }
   }
 });

module.exports = upload;