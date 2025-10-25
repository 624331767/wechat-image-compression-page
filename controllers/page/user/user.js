/**
 * @file controllers/index.js
 * @description 主 API 的控制器，处理用户、上传等核心逻辑。
 */

const db = require("../../../db/index"); // 引入数据库模块
const { pdfbseUrl } = require('../../../config/database');
/**
 * 获取用户列表（分页）
 * @param {import('express').Request} req - Express 请求对象
 * @param {import('express').Response} res - Express 响应对象
 * @param {import('express').NextFunction} next - Express next 中间件函数
 */
 exports.getUsers = async (req, res, next) => {
  try {
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const pageSize = Math.min(parseInt(req.query.pageSize) || 10, 100);
    const offset = (page - 1) * pageSize;

    // 查询数据（LIMIT/OFFSET 直接拼数字，兼容 Aiven MySQL）
    const [rows, countResult] = await Promise.all([
      db.query(`SELECT * FROM contacts ORDER BY contactid DESC LIMIT ${pageSize} OFFSET ${offset}`),
      db.query("SELECT COUNT(*) as count FROM contacts")
    ]);

    if (!countResult || countResult.length === 0) {
      throw new Error("无法查询到用户总数。");
    }

    const totalRecords = countResult[0].count;
    const totalPages = Math.ceil(totalRecords / pageSize);

    const pagination = {
      currentPage: page,
      pageSize,
      totalRecords,
      totalPages,
    };

    res.success(rows, "获取用户列表成功！", 200, { pagination });
  } catch (error) {
    next(error);
  }
};


/**
 * 添加新用户
 * @param {import('express').Request} req - Express 请求对象
 * @param {import('express').Response} res - Express 响应对象
 * @param {import('express').NextFunction} next - Express next 中间件函数
 */
exports.addUser = async (req, res, next) => {
  try {
    const { ContactName, ContactPhone, WeChatID, ShippingAddress } = req.body;

    // 参数校验：这是客户端的责任，如果校验失败，属于客户端错误 (Bad Request)。
    if (!ContactName || !ContactPhone || !WeChatID || !ShippingAddress) {
      // 直接使用 res.fail 响应 400 错误，无需动用全局的服务器错误处理器。
      return res.fail("姓名、电话、微信和地址均为必填项。", 400);
    }

    // 执行插入操作
    const result = await db.query(
      "INSERT INTO contacts (contactname, contactphone, wechatid, shippingaddress) VALUES (?, ?, ?, ?)",
      [ContactName, ContactPhone, WeChatID, ShippingAddress]
    );

    const insertId = result.insertId;

    // 查询刚刚插入的数据以返回给前端
    const [newUser] = await db.query(
      "SELECT * FROM contacts WHERE contactid = ?",
      [insertId]
    );

    res.success(newUser, "用户添加成功！", 200);
  } catch (error) {
    // 将数据库或其他意外的、非客户端造成的错误传递给全局错误处理器
    next(error);
  }
};

/**
 * 处理文件上传成功后的逻辑
 * @param {import('express').Request} req - Express 请求对象 (此时 req.file 已由 multer 中间件填充)
 * @param {import('express').Response} res - Express 响应对象
 * @param {import('express').NextFunction} next - Express next 中间件函数
 */
 exports.uploadMethods = (req, res, next) => {
  // 多字段上传时，文件在 req.files['image'][0]
  const fileArray = req.files && req.files['image'];
  if (!fileArray || fileArray.length === 0) {
    return res.fail("文件上传失败，未在请求中找到文件。", 400);
  }

  const file = fileArray[0];

  const fileInfo = {
    originalName: file.originalname,
    fileName: file.filename,
    filePath: `${pdfbseUrl}/uploads/${file.filename}`,
    fileSize: file.size,
    fileType: file.mimetype,
  };

  res.success(fileInfo, "文件上传成功！");
};


/**
 * 获取所有视频分类（带 id 和 name）
 */
exports.getCategories = async (req, res, next) => {
  try {
    const result = await db.query('SELECT id, name FROM categories ORDER BY id ASC');
    res.success(result, '获取分类列表成功');
  } catch (error) {
    next(error);
  }
};

exports.uploadVideo = async (req, res, next) => {
  try {
    const { title, description, categoryId } = req.body;
    const videoFile = req.files && req.files.videoFile ? req.files.videoFile[0] : null;

    // 校验 categoryId
    if (!title || !categoryId || !videoFile) {
      return res.fail("标题、分类和视频文件均为必填项", 400);
    }
    // 校验分类是否存在
    const [categoryRow] = await db.query("SELECT name FROM categories WHERE id = ?", [categoryId]);
    if (!categoryRow) {
      return res.fail("分类不存在", 400);
    }
    // ...后续逻辑不变...
    // 存库时用 categoryId 和 categoryRow.name
    const result = await db.query(
      "INSERT INTO videos (title, description, category, category_id, video_url, cover_url) VALUES (?, ?, ?, ?, ?, ?)",
      [title, description, categoryRow.name, categoryId, videoUrl, coverUrl]
    );
    // ...
  } catch (error) {
    next(error);
  }
};
