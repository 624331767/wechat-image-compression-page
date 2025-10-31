// controllers/videos/crawler.js

const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');
const FormData = require('form-data'); // 用于文件上传
const { pdfbseUrl } = require('../../config/database.js');
// 导入采集规则文件
const crawlerRules = require('./crawler_rules.js');

// 辅助函数：将相对 URL 转换为绝对 URL
function resolveAbsoluteUrl(baseUrl, relativeUrl) {
  if (!relativeUrl) return null;
  try {
    // 使用 URL 构造函数进行解析，它能正确处理相对路径和基准 URL
    return new URL(relativeUrl, baseUrl).href;
  } catch (error) {
    console.error(`https://www.isobudgets.com/calculate-resolution-uncertainty/ 解析URL失败: ${relativeUrl} 基于 ${baseUrl}, 错误: ${error.message}`);
    // 如果解析失败，返回原始URL，因为它可能已经是绝对URL或需要手动处理
    return relativeUrl;
  }
}

/**
 * 采集目标网站的视频信息
 * @param {string} targetUrl - 目标网页的URL
 * @returns {Array<Object>} 包含视频信息的数组
 */
async function fetchVideoList(targetUrl) {
  console.log(`[Crawler] 正在从 ${targetUrl} 抓取视频信息...`);

  let urlObj;
  try {
    urlObj = new URL(targetUrl);
  } catch (error) {
    throw new Error(`无效的目标URL: ${targetUrl}. 错误: ${error.message}`);
  }
  const domain = urlObj.hostname; // 获取域名 (e.g., "www.example.com" 或 "example.com")
console.log(domain);

  // 根据域名查找对应的采集规则
  const rule = crawlerRules.find(r => r.domain === domain || r.domain === urlObj.host); // 匹配完整主机名或仅域名

  if (!rule) {
    throw new Error(`未找到域名 ${domain} 的采集规则。请在 crawler_rules.js 中添加该网站的规则。`);
  }

  const videos = [];
  let res;
  try {
    res = await axios.get(targetUrl);
  } catch (error) {
    throw new Error(`请求目标URL失败: ${targetUrl}. 错误: ${error.message}`);
  }

  const $ = cheerio.load(res.data);

  $(rule.videoItemSelector).each((i, el) => {
    const title = $(el).find(rule.titleSelector).text().trim();
    let videoUrl = $(el).find(rule.videoUrlSelector).attr(rule.videoUrlAttr);
    let coverUrl = $(el).find(rule.coverUrlSelector).attr(rule.coverUrlAttr);

    // 将相对URL转换为绝对URL
    videoUrl = resolveAbsoluteUrl(targetUrl, videoUrl);
    coverUrl = resolveAbsoluteUrl(targetUrl, coverUrl);

    if (title && videoUrl && coverUrl) {
      videos.push({ title, videoUrl, coverUrl });
    } else {
      console.warn(`[Crawler] 跳过不完整的视频项 (可能缺少标题/URL/封面) 在 ${targetUrl}：`, {
        index: i,
        title, videoUrl, coverUrl,
        elementHtml: $(el).html().substring(0, 200) + '...' // 输出部分HTML，避免过长
      });
    }
  });
  console.log(`[Crawler] 从 ${targetUrl} 采集到 ${videos.length} 个视频。`);
  return videos;
}

/**
 * 下载文件到指定目录
 * @param {string} url - 文件的URL
 * @param {string} destFolder - 目标文件夹路径
 * @returns {Promise<string>} 下载成功后的文件名
 */
async function downloadFile(url, destFolder) {
  // 确保目标文件夹存在
  if (!fs.existsSync(destFolder)) {
    fs.mkdirSync(destFolder, { recursive: true });
  }

  const ext = path.extname(new URL(url).pathname).split('?')[0] || '.mp4'; // 更健壮地获取扩展名
  const filename = Date.now() + '-' + Math.floor(Math.random() * 1000000) + ext;
  const filePath = path.join(destFolder, filename);

  const writer = fs.createWriteStream(filePath);

  let response;
  try {
    response = await axios({ url, method: 'GET', responseType: 'stream' });
  } catch (error) {
    writer.close(); // 关闭写入流
    // 如果文件已部分写入，可以考虑删除部分文件
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    throw new Error(`下载文件失败: ${url}. 错误: ${error.message}`);
  }

  response.data.pipe(writer);

  return new Promise((resolve, reject) => {
    writer.on('finish', () => {
      console.log(`[Download] 文件 ${filename} 下载完成: ${url}`);
      resolve(filename);
    });
    writer.on('error', (err) => {
      writer.close(); // 确保流关闭
      // 删除可能已部分写入的文件
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      reject(new Error(`写入文件失败: ${filePath}. 错误: ${err.message}`));
    });
  });
}

// 导入Tebi存储工具
const { uploadToTebi } = require('../../utils/tebiStorage');

/**
 * 获取文件的MIME类型
 * @param {string} filename - 文件名
 * @returns {string} MIME类型
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
    '.webm': 'video/webm',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif'
  };
  return mimeTypes[extension] || 'application/octet-stream';
}

/**
 * 使用Tebi对象存储上传视频和封面
 * @param {Object} uploadData - 包含上传所需数据的对象
 * @param {string} uploadData.title - 视频标题
 * @param {string} uploadData.description - 视频描述
 * @param {string} uploadData.category - 视频分类
 * @param {string} uploadData.videoPath - 本地视频文件完整路径
 * @param {string} uploadData.coverPath - 本地封面文件完整路径
 */
async function uploadToServer({ title, description, category, videoPath, coverPath }) {
  console.log(`[Upload] 准备上传视频: "${title}"到Tebi存储`);

  // 确保文件存在
  if (!fs.existsSync(videoPath)) {
    throw new Error(`视频文件不存在: ${videoPath}`);
  }
  if (!fs.existsSync(coverPath)) {
    throw new Error(`封面文件不存在: ${coverPath}`);
  }

  try {
    // 读取视频文件并上传到Tebi
    const videoBuffer = fs.readFileSync(videoPath);
    const videoFileName = path.basename(videoPath);
    const videoUploadResult = await uploadToTebi(
      videoBuffer,
      videoFileName,
      getContentType(videoFileName)
    );
    
    if (!videoUploadResult.success) {
      throw new Error(`视频上传到Tebi失败: ${videoUploadResult.error}`);
    }
    
    const videoUrl = videoUploadResult.url;
    console.log('视频上传到Tebi成功:', videoUrl);

    // 读取封面文件并上传到Tebi
    const coverBuffer = fs.readFileSync(coverPath);
    const coverFileName = path.basename(coverPath);
    const coverUploadResult = await uploadToTebi(
      coverBuffer,
      coverFileName,
      getContentType(coverFileName)
    );
    
    if (!coverUploadResult.success) {
      throw new Error(`封面上传到Tebi失败: ${coverUploadResult.error}`);
    }
    
    const coverUrl = coverUploadResult.url;
    console.log('封面上传到Tebi成功:', coverUrl);

    // 清理本地临时文件
    console.log(`[Cleanup] 删除本地文件: ${videoPath}, ${coverPath}`);
    fs.unlinkSync(videoPath);
    fs.unlinkSync(coverPath);

    // 这里可以添加保存视频信息到数据库的逻辑
    // 如果需要，调用API保存视频元数据
    const formData = {
      title,
      description: description || '',
      category: category || '采集',
      video_url: videoUrl,
      cover_url: coverUrl
    };

    const response = await axios.post(`${pdfbseUrl}/api/admin/videos`, formData, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log(`[Upload] 视频 "${title}" 信息保存成功。服务器响应:`, response.data);
    return response.data;
  } catch (error) {
    // 更详细的错误信息
    const errMsg = error.response ? `Status: ${error.response.status}, Data: ${JSON.stringify(error.response.data)}` : error.message;
    throw new Error(`上传视频到Tebi失败: ${title}. 错误: ${errMsg}`);
  }
}

/**
 * 采集主流程，作为 Express 路由处理函数
 * @param {Object} req - Express 请求对象
 * @param {Object} res - Express 响应对象
 * @param {Function} next - Express next 中间件函数
 */
exports.crawl = async (req, res, next) => {
  const { url } = req.body;
  console.log('-------------------------------------------');
  console.log('[API Request] 接收到视频采集请求，目标 URL：', url);

  if (!url) {
    return res.status(400).json({ error: '缺少采集目标url' });
  }

  const uploadsDir = path.join(__dirname, '../../uploads'); // 定义上传目录

  try {
    const videos = await fetchVideoList(url);

    if (videos.length === 0) {
      console.warn(`[API Response] 未从 ${url} 采集到任何视频。`);
      return res.json({ count: 0, results: [], message: '未采集到任何视频，请检查目标网站结构或采集规则。' });
    }

    const results = [];
    for (const video of videos) {
      try {
        console.log(`[Processing] 开始处理视频: "${video.title}"`);
        const videoFilename = await downloadFile(video.videoUrl, uploadsDir);
        const coverFilename = await downloadFile(video.coverUrl, uploadsDir);

        await uploadToServer({
          title: video.title,
          description: '', // 默认描述为空，或可根据需求从规则中读取
          category: '采集', // 默认分类为采集，或可从规则中读取
          videoPath: path.join(uploadsDir, videoFilename),
          coverPath: path.join(uploadsDir, coverFilename),
        });
        results.push({ title: video.title, status: 'success', videoFilename, coverFilename });
        console.log(`[Processing] 视频 "${video.title}" 采集并上传成功。`);
      } catch (e) {
        results.push({ title: video.title, status: 'fail', error: e.message });
        console.error(`[Processing Error] 视频 "${video.title}" 采集或上传失败:`, e.message);
        // 可以在这里决定是否删除失败下载的文件，避免占用空间
      }
    }
    console.log(`[API Response] 视频采集和上传完成。成功: ${results.filter(r => r.status === 'success').length}，失败: ${results.filter(r => r.status === 'fail').length}`);
    res.json({ count: results.length, results });
  } catch (error) {
    console.error('[API Error] 主采集流程出错:', error.message, error);
    next(error); // 将错误传递给 Express 错误处理中间件
  } finally {
    console.log('-------------------------------------------');
  }
};