


exports.validateParams = (params, req, res, source = "query") => {
  for (const [key, message] of Object.entries(params)) {
    const value =
      source === "query"
        ? req.query[key]
        : source === "body"
          ? req.body[key]
          : source === "params"
            ? req.params[key]
            : null;

    if (!value) {
      return res.status(400).json({
        code: 400,
        msg: `${message || key} 不能为空`,
      });
    }
  }
  return null; // 表示所有参数都有效
};

// 全局中间件
exports.responseWrapper = (req, res, next) => {
  res.success = (data = {}, msg = "操作成功", code = 200, extra = {}) => {
    res.json({
      code,
      message: msg,
      data,
      ...extra, // 👈 支持动态附加其他字段
    });
  };

  res.fail = (msg = "操作失败", code = 500, error = null, extra = {}) => {
    res.status(code).json({
      code,
      message: msg,
      error,
      ...extra,
    });
  };

  next();
};
