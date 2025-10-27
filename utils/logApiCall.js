const db = require("../db/index");
const dayjs = require("dayjs");

/**
 * 记录接口调用日志（相同 IP + 接口只加次数）
 * 支持 MySQL / PostgreSQL
 * @param {Object} options
 */
exports.logApiCall = async (options) => {
  const {
    apiName,
    ip,
    userAgent = "",
    statusCode = 200,
    remark = "",
    addr = null,
    cityCode = null,
    pro = null,
    proCode = null,
    city = null,
  } = options;

  const startTime = dayjs(); // 记录当前时间点

  try {
    // 根据 db.type 判断占位符
    const isPostgres = db.type === "postgres"; 
    const placeholder = (i) => (isPostgres ? `$${i}` : `?`);
    const nowFunc = isPostgres ? "CURRENT_TIMESTAMP" : "NOW()";

    const selectSql = `
      SELECT id FROM api_call_logs
      WHERE api_name = ${placeholder(1)} AND ip = ${placeholder(2)} AND user_agent = ${placeholder(3)}
      LIMIT 1
    `;
    const rows = await db.query(selectSql, [apiName, ip, userAgent]);

    const responseTime = dayjs().diff(startTime);

    if (rows.length > 0) {
      const updateSql = `
        UPDATE api_call_logs
        SET call_count = call_count + 1,
            status_code = ${placeholder(1)},
            response_time = ${placeholder(2)},
            updated_at = ${nowFunc},
            remark = ${placeholder(3)},
            addr = ${placeholder(4)},
            cityCode = ${placeholder(5)},
            pro = ${placeholder(6)},
            proCode = ${placeholder(7)},
            city = ${placeholder(8)}
        WHERE id = ${placeholder(9)}
      `;
      await db.query(updateSql, [
        statusCode,
        responseTime,
        remark,
        addr,
        cityCode,
        pro,
        proCode,
        city,
        rows[0].id,
      ]);
      if (process.env.NODE_ENV !== "production") {
        console.log(`🔁 更新调用次数: ${apiName} - ${ip}`);
      }
    } else {
      const insertSql = `
        INSERT INTO api_call_logs (
          api_name, ip, user_agent, call_count,
          status_code, response_time, created_at,
          updated_at, remark,
          addr, cityCode, pro, proCode, city
        ) VALUES (
          ${placeholder(1)}, ${placeholder(2)}, ${placeholder(3)}, 1,
          ${placeholder(4)}, ${placeholder(5)}, ${nowFunc},
          ${nowFunc}, ${placeholder(6)},
          ${placeholder(7)}, ${placeholder(8)}, ${placeholder(9)}, ${placeholder(10)}, ${placeholder(11)}
        )
      `;
      await db.query(insertSql, [
        apiName,
        ip,
        userAgent,
        statusCode,
        responseTime,
        remark,
        addr,
        cityCode,
        pro,
        proCode,
        city,
      ]);
      if (process.env.NODE_ENV !== "production") {
        console.log(`🆕 插入调用日志: ${apiName} - ${ip}`);
      }
    }
  } catch (err) {
    console.error(`❌ 日志写入失败: ${apiName} - ${ip}`);
    console.error(err.message);
  }
};
