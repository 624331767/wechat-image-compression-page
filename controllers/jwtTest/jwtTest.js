// ========================= 通用依赖模块 ========================= //
const fs = require('fs');
const path = require('path');
const os = require('os');
const db = require('../../db/index');
const { exec } = require('child_process');
const execa = require('execa');
const axios = require('axios');
const which = require('which');
const iconv = require('iconv-lite');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');
const dayjs=require('dayjs');

// ========================= 自定义模块 ========================= //
const { singleFile } = require('../../utils/upload');
const taskQueue = require('../../utils/taskQueue');
const { pdfbseUrl } = require('../../config/database');

// ========================= 基础目录配置 ========================= //
const ROOT_DIR = process.cwd();
const OUTPUT_DIR = path.join(ROOT_DIR, 'uploads');
const COMPRESSED_DIR = path.join(ROOT_DIR, 'compressed');
const CHUNK_DIR = path.join(ROOT_DIR, 'chunks');

// 初始化目录结构
[OUTPUT_DIR, COMPRESSED_DIR, CHUNK_DIR].forEach(dir => fs.mkdirSync(dir, { recursive: true }));

// 获取当前平台
const systemType = () => {
  const p = os.platform();
  return p === 'win32' ? 'Windows' : p === 'darwin' ? 'macOS' : 'Linux';
};

// 获取 Ghostscript 命令路径
const getGhostscriptCmd = () => {
  const platform = os.platform();
  return platform === 'win32'
    ? process.env.GHOSTSCRIPT_PATH || 'gswin64c.exe'
    : 'gs';
};

// ========================= 工具函数 ========================= //

// 创建按日期分类的目录
const createDailyDirectory = (baseDir) => {
  const dateStr = new Date().toISOString().split('T')[0];
  const targetDir = path.join(baseDir, dateStr);
  fs.mkdirSync(targetDir, { recursive: true });
  return targetDir;
};

// 下载 PDF 文件保存到本地
const downloadPdfFromUrl = async (url, targetPath) => {
  const response = await axios({ url, responseType: 'stream' });
  const writer = fs.createWriteStream(targetPath);
  response.data.pipe(writer);
  return new Promise(resolve => writer.on('finish', resolve));
};

// 压缩 PDF（Ghostscript）
const compressPDF = async (inputPath, outputPath, comprtype = 'screen') => {
  const gsCmd = getGhostscriptCmd();
  try {
    const resolvedPath = which.sync(gsCmd);
    await execa(resolvedPath, [
      '-sDEVICE=pdfwrite',
      '-dCompatibilityLevel=1.4',
      `-dPDFSETTINGS=/${comprtype}`,
      '-dNOPAUSE', '-dQUIET', '-dBATCH',
      `-sOutputFile=${outputPath}`,
      inputPath
    ]);
    return '压缩完成';
  } catch (err) {
    if (err.code === 'ENOENT') throw new Error(`Ghostscript 未安装或未配置: ${gsCmd}`);
    throw new Error(`压缩失败: ${err.message}`);
  }
};

// 合并分片为 PDF 文件
const mergeChunks = async (chunkDir, totalChunks, outputFilePath) => {
  const files = fs.readdirSync(chunkDir).sort((a, b) => Number(a.split('.')[0]) - Number(b.split('.')[0]));
  if (files.length !== Number(totalChunks)) throw new Error('分片数量不匹配');

  const writeStream = fs.createWriteStream(outputFilePath);
  for (const file of files) {
    const readStream = fs.createReadStream(path.join(chunkDir, file));
    await new Promise((resolve, reject) => {
      readStream.pipe(writeStream, { end: false });
      readStream.on('end', resolve);
      readStream.on('error', reject);
    });
  }
  await new Promise(resolve => writeStream.end(resolve));
  fs.rmSync(chunkDir, { recursive: true, force: true });
};

// 将 PDF 转为 PNG 图片
const convertPDFToImages = async (inputPath, outputPattern, dpi = 144) => {
  const gsCmd = getGhostscriptCmd();
  const resolvedPath = which.sync(gsCmd);
  await execa(resolvedPath, [
    '-dNOPAUSE', '-dBATCH',
    '-sDEVICE=png16m',
    `-r${dpi}`,
    `-sOutputFile=${outputPattern}`,
    inputPath
  ]);
};

// 提取文件名（去掉 .pdf 后缀）
const getName = (url) => {
  try {
    return path.basename(new URL(url).pathname, '.pdf');
  } catch {
    return null;
  }
};

// 计算文件的 MD5 哈希值
function getFileHash(filePath) {
  const buffer = fs.readFileSync(filePath);
  return crypto.createHash('md5').update(buffer).digest('hex');
}

// ========================= 控制器实现 ========================= //

/**
 * 分片上传处理
 */
exports.handleChunkUpload = async (req, res) => {
  try {
    const { chunkIndex, totalChunks, fileName } = req.body;
    const file = req.file;
    if (!file || chunkIndex === undefined || !totalChunks || !fileName) {
      return res.fail('参数不完整', 400);
    }
    const chunkPath = path.join(CHUNK_DIR, fileName);
    fs.mkdirSync(chunkPath, { recursive: true });
    fs.renameSync(file.path, path.join(chunkPath, `${chunkIndex}.part`));
    res.success({ chunkIndex }, `分片 ${chunkIndex} 上传成功`);
  } catch (e) {
    res.fail(`上传失败: ${e.message}`, 500);
  }
};

/**
 * 合并分片 + 压缩
 */
exports.handleMergeChunks = async (req, res) => {
  try {
    const { fileName, totalChunks } = req.body;
    if (!fileName || !totalChunks) return res.fail('参数缺失', 400);

    const chunkDir = path.join(CHUNK_DIR, fileName);
    const outputPath = path.join(OUTPUT_DIR, fileName);
    await mergeChunks(chunkDir, totalChunks, outputPath);

    const dailyDir = createDailyDirectory(COMPRESSED_DIR);
    const compressedFileName = `${path.basename(fileName, '.pdf')}_compressed.pdf`;
    const compressedPath = path.join(dailyDir, compressedFileName);

    await compressPDF(outputPath, compressedPath);
    fs.unlinkSync(outputPath);

    const fileUrl = `${pdfbseUrl}/compressed/${path.basename(dailyDir)}/${compressedFileName}`;
    res.success([{ fileName: compressedFileName, fileUrl }], '压缩成功');
  } catch (e) {
    res.fail(`合并失败: ${e.message}`, 500);
  }
};

/**
 * 上传或通过 URL 压缩
 */
exports.handleCompress = async (req, res) => {
  try {
    const { url, comprtype } = req.body;
    let inputPath;

    if (url) {
      const fileName = getName(url) || `${Date.now()}.pdf`;
      inputPath = path.join(OUTPUT_DIR, `${fileName}.pdf`);
      await downloadPdfFromUrl(url, inputPath);
    } else if (req.file) {
      inputPath = req.file.path;
    } else {
      throw new Error('未提供文件或 URL');
    }

    const dailyDir = createDailyDirectory(COMPRESSED_DIR);
    const compressedFileName = `${path.basename(inputPath, '.pdf')}_compressed.pdf`;
    const compressedPath = path.join(dailyDir, compressedFileName);

    await compressPDF(inputPath, compressedPath, comprtype || 'screen');
    fs.unlinkSync(inputPath);

    const fileUrl = `${pdfbseUrl}/compressed/${path.basename(dailyDir)}/${compressedFileName}`;
    res.success([{ fileName: compressedFileName, fileUrl }], '压缩成功');
  } catch (e) {
    res.fail(`压缩失败: ${e.message}`, 500);
  }
};

/**
 * Ghostscript 检查
 */
exports.checkGhostscript = (req, res) => {
  const platform = os.platform();
  const readable = systemType();
  const cmd = getGhostscriptCmd();

  try {
    const resolvedPath = which.sync(cmd);
    res.success({ platform: readable, path: resolvedPath }, 'Ghostscript 安装正常');
  } catch {
    const fallback = {
      win32: {
        downloadUrl: `${pdfbseUrl}/download/gs10040w32.exe`,
        note: '请下载并配置环境变量 GHOSTSCRIPT_PATH',
        pathHint: 'C:\\Program Files\\gs\\gs10.03.0\\bin\\gswin64c.exe'
      },
      linux: {
        note: '请使用命令安装：sudo apt/yum install ghostscript',
        pathHint: '/usr/bin/gs'
      },
      darwin: {
        note: '请使用命令安装：brew install ghostscript',
        pathHint: '/opt/homebrew/bin/gs'
      }
    }[platform] || { note: '请手动安装 Ghostscript' };

    res.fail('Ghostscript 未安装', 500, null, fallback);
  }
};

/**
 * 上传 PDF 并转换为多张 PNG（带图片内容去重）
 */
exports.uploadAndConvertPdf = async (req, res) => {
  try {
    if (!req.file) return res.fail('请上传 PDF 文件', 400);

    const inputPath = req.file.path;
    const baseName = path.basename(req.file.originalname, '.pdf');
    const dailyDir = createDailyDirectory(COMPRESSED_DIR);

    // 1. 创建临时目录
    const tempDir = path.join(dailyDir, `tmp_${Date.now()}_${Math.floor(Math.random() * 10000)}`);
    fs.mkdirSync(tempDir, { recursive: true });
    const outputPattern = path.join(tempDir, `${baseName}_page_%03d.png`);

    // 2. 转换PDF为图片到临时目录
    await convertPDFToImages(inputPath, outputPattern);
    fs.unlinkSync(inputPath);

    // 3. 对每张图片做hash去重，复用已有图片
    const tempFiles = fs.readdirSync(tempDir).filter(f => f.endsWith('.png'));
    const existedFiles = fs.readdirSync(dailyDir).filter(f => f.endsWith('.png'));
    const resultFiles = [];

    for (const tempFile of tempFiles) {
      const tempPath = path.join(tempDir, tempFile);
      const tempHash = getFileHash(tempPath);

      let found = false;
      for (const existedFile of existedFiles) {
        const existedPath = path.join(dailyDir, existedFile);
        if (getFileHash(existedPath) === tempHash) {
          // 找到相同图片，复用
          resultFiles.push(existedFile);
          found = true;
          break;
        }
      }
      if (!found) {
        // 没有相同图片，移动过去
        const newName = `${baseName}_page_${tempFile.split('_page_')[1]}`;
        fs.renameSync(tempPath, path.join(dailyDir, newName));
        resultFiles.push(newName);
      } else {
        // 删除临时文件
        fs.unlinkSync(tempPath);
      }
    }
    // 删除临时目录
    fs.rmdirSync(tempDir);

    const fileUrls = resultFiles.map(name => ({
      fileName: name,
      fileUrl: `${pdfbseUrl}/compressed/${path.basename(dailyDir)}/${name}`
    }));

    res.success(fileUrls, 'PDF 转图片成功');
  } catch (e) {
    res.fail(`转换失败: ${e.message}`, 500);
  }
};

/**
 * 分片合并 + 转 PNG（异步任务，带图片内容去重）
 */
exports.handleMergeChunksConvert = async (req, res) => {
  try {
    const { fileName, totalChunks } = req.body;
    if (!fileName || !totalChunks) return res.fail('缺少参数', 400);

    const taskId = uuidv4();
    taskQueue.addTask(taskId, async () => {
      const chunkDir = path.join(CHUNK_DIR, fileName);
      const mergedPath = path.join(OUTPUT_DIR, fileName);

      await mergeChunks(chunkDir, totalChunks, mergedPath);

      const dailyDir = createDailyDirectory(COMPRESSED_DIR);
      const compressedName = `${path.basename(fileName, '.pdf')}_compressed.pdf`;
      const compressedPath = path.join(dailyDir, compressedName);

      await compressPDF(mergedPath, compressedPath, 'screen');
      fs.unlinkSync(mergedPath);

      // 1. 创建临时目录
      const tempDir = path.join(dailyDir, `tmp_${Date.now()}_${Math.floor(Math.random() * 10000)}`);
      fs.mkdirSync(tempDir, { recursive: true });
      const outputPattern = path.join(tempDir, `${path.basename(fileName, '.pdf')}_page_%03d.png`);

      // 2. 转换PDF为图片到临时目录
      await convertPDFToImages(compressedPath, outputPattern, 36); // 低分辨率
      fs.unlinkSync(compressedPath);

      // 3. 对每张图片做hash去重，复用已有图片
      const tempFiles = fs.readdirSync(tempDir).filter(f => f.endsWith('.png'));
      const existedFiles = fs.readdirSync(dailyDir).filter(f => f.endsWith('.png'));
      const resultFiles = [];

      for (const tempFile of tempFiles) {
        const tempPath = path.join(tempDir, tempFile);
        const tempHash = getFileHash(tempPath);

        let found = false;
        for (const existedFile of existedFiles) {
          const existedPath = path.join(dailyDir, existedFile);
          if (getFileHash(existedPath) === tempHash) {
            // 找到相同图片，复用
            resultFiles.push(existedFile);
            found = true;
            break;
          }
        }
        if (!found) {
          // 没有相同图片，移动过去
          const newName = `${path.basename(fileName, '.pdf')}_page_${tempFile.split('_page_')[1]}`;
          fs.renameSync(tempPath, path.join(dailyDir, newName));
          resultFiles.push(newName);
        } else {
          // 删除临时文件
          fs.unlinkSync(tempPath);
        }
      }
      // 删除临时目录
      fs.rmdirSync(tempDir);

      return resultFiles.map(name => ({
        fileName: name,
        fileUrl: `${pdfbseUrl}/compressed/${path.basename(dailyDir)}/${name}`
      }));
    });

    res.success({ taskId }, '任务已加入队列');
  } catch (e) {
    res.fail(`任务创建失败: ${e.message}`, 500);
  }
};

/**
 * 查询任务状态
 */
exports.queryTaskStatus = (req, res) => {
  const { taskId } = req.query;
  if (!taskId) return res.fail('缺少 taskId 参数', 400);

  const status = taskQueue.getStatus(taskId);
  if (!status) return res.fail('未找到该任务', 404);

  res.success(status, '任务状态查询成功');
};

/**
 * 获取客户端公网 IP 归属地信息
 */
exports.getproxyIP = async (req, res) => {
  try {
    const clientIp = req.ip;


    const response = await axios.get(`https://whois.pconline.com.cn/ipJson.jsp?json=true&ip=${clientIp}`, {
      responseType: 'arraybuffer'
    });

    const decoded = iconv.decode(response.data, 'gbk');
    const result = JSON.parse(decoded);


    res.success(result);
  } catch (e) {
    // res.status(500).json({ error: '获取 IP 信息失败' });
    res.fail(`获取 IP 信息失败: ${e.message}`);
  }
};



function formatDateRows(rows, fields = ['created_at', 'updated_at']) {
  return rows.map(row => {
    const formatted = { ...row };
    fields.forEach(field => {
      if (row[field]) {
        formatted[field] = dayjs(row[field]).format('YYYY-MM-DD HH:mm:ss');
      }
    });
    return formatted;
  });
}


 /**
 * 处理获取API调用日志的请求
 * 功能：接收前端传入的查询参数（分页、筛选条件），从数据库查询符合条件的API调用日志，
 * 格式化数据后返回结果及分页信息
 * @param {Object} req - Express请求对象，包含查询参数（page, pageSize, apiName, ip等）
 * @param {Object} res - Express响应对象，用于返回处理结果
 */
 exports.getproxyLogs = async (req, res) => {
  try {
    // 分页参数
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const pageSize = Math.min(parseInt(req.query.pageSize) || 20, 100);

    // 筛选参数
    const apiName = req.query.apiName ? `%${req.query.apiName}%` : null;
    const ip = req.query.ip ? `%${req.query.ip}%` : null;

    // 构建 WHERE 条件
    let whereClauses = [];
    let params = [];

    if (apiName) {
      whereClauses.push('api_name LIKE ?');
      params.push(apiName);
    }
    if (ip) {
      whereClauses.push('ip LIKE ?');
      params.push(ip);
    }

    const whereSQL = whereClauses.length ? 'WHERE ' + whereClauses.join(' AND ') : '';

    // 查询总条数（可选）
    let total = null;
    if (whereClauses.length) {
      const countResult = await db.query(`SELECT COUNT(*) as count FROM api_call_logs ${whereSQL}`, params);
      total = countResult[0].count;
    }

    // 查询数据
    let dataSQL = `
      SELECT api_name, ip, user_agent, call_count, status_code, response_time,
             addr, cityCode, pro, proCode, city,
             created_at, updated_at, remark
      FROM api_call_logs
      ${whereSQL}
      ORDER BY updated_at DESC
    `;

    // Aiven MySQL 不支持 LIMIT ? OFFSET ? 参数绑定，需要直接拼数字
    const offset = (page - 1) * pageSize;
    dataSQL += ` LIMIT ${pageSize} OFFSET ${offset}`;

    // 执行查询，params 里只剩下 apiName 和 ip
    const rows = await db.query(dataSQL, params);

    // 格式化日期
    const formattedRows = formatDateRows(rows);

    // 总条数处理
    if (total === null) total = rows.length;

    // 分页信息
    const pagination = {
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };

    res.success(formattedRows, "获取请求列表数据成功", 200, { pagination });
  } catch (err) {
    console.error('查询接口调用日志失败:', err);
    res.fail(`获取请求数据失败: ${err.message}`);
  }
};




exports.getproxyLogsText=async (req, res) => { 
  const countResult = await db.query(`SELECT * FROM api_call_logs`);
   res.success({ count: countResult.length }, "获取请求列表数据成功", 200);
};