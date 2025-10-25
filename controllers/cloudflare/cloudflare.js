/**
 * @file controllers/cloudflare/index.js
 * @description Cloudflare API 控制器，封装了域名 Zone 和 DNS 记录的常用操作。
 */

const axios = require("axios");

// ⚠️ Cloudflare API Token（建议通过 .env 配置，当前为硬编码值，仅供测试用）
const CLOUDFLARE_API_TOKEN = process.env.CLOUDFLARE_API_TOKEN||"";

// 创建 axios 实例，设置默认请求头
const cloudflareApi = axios.create({
  baseURL: "https://api.cloudflare.com/client/v4",
  headers: {
    "Authorization": `Bearer ${CLOUDFLARE_API_TOKEN}`,
    "Content-Type": "application/json",
  },
});

/**
 * 获取账户下所有域名（Zones）
 */
exports.getZones = async (req, res, next) => {
    console.log(CLOUDFLARE_API_TOKEN,'CLOUDFLARE_API_TOKEN');
    
  try {
    const response = await cloudflareApi.get("/zones");
    const { result } = response.data;

    // 如果有结果，返回第一个 Zone 的 ID 作为参考
    const zoneId = result.length > 0 ? result[0].id : null;

    res.success(result, "✅ 获取 Zone 列表成功", 200, { zoneId });
  } catch (error) {
    if (error.response?.data) {
      const msg = error.response.data.errors?.[0]?.message || "Cloudflare API 请求失败";
      const code = error.response.status || 500;
      return res.fail(`❌ 获取 Zone 失败：${msg}`, code);
    }

    // 系统级错误交由全局错误处理中间件处理
    next(error);
  }
};

/**
 * 获取指定 Zone 下的所有 DNS 记录
 */
exports.getDnsRecords = async (req, res, next) => {
  try {
    const { zoneId } = req.query;

    if (!zoneId) {
      return res.fail("❌ 请求参数错误：必须提供 Zone ID。", 400);
    }

    const response = await cloudflareApi.get(`/zones/${zoneId}/dns_records`);
    res.success(response.data.result, "✅ 获取 DNS 记录成功");
  } catch (error) {
    if (error.response?.data) {
      const msg = error.response.data.errors?.[0]?.message || "Cloudflare 请求失败";
      const code = error.response.status || 500;
      return res.fail(`❌ 获取 DNS 记录失败：${msg}`, code);
    }

    next(error);
  }
};

/**
 * 添加一条新的 DNS 记录
 */
exports.addDnsRecord = async (req, res, next) => {
  try {
    const { zoneId, type, name, content, ttl, proxied, comment } = req.body;

    if (!zoneId || !type || !name || !content || ttl === undefined || typeof proxied !== "boolean") {
      return res.fail("❌ 请求体参数错误：缺少必要的参数。", 400);
    }

    const response = await cloudflareApi.post(`/zones/${zoneId}/dns_records`, {
      type, name, content, ttl, proxied, comment,
    });

    res.success(response.data.result, "✅ DNS 记录添加成功");
  } catch (error) {
    if (error.response?.data) {
      const msg = error.response.data.errors?.[0]?.message || "Cloudflare API 请求失败";
      const code = error.response.status || 500;
      return res.fail(`❌ 添加失败：${msg}`, code);
    }

    next(error);
  }
};

/**
 * 删除一条 DNS 记录
 */
exports.deleteDnsRecord = async (req, res, next) => {
  try {
    const { zoneId, recordId } = req.query;

    if (!zoneId || !recordId) {
      return res.fail("❌ 请求参数错误：必须提供 Zone ID 和 Record ID。", 400);
    }

    await cloudflareApi.delete(`/zones/${zoneId}/dns_records/${recordId}`);
    res.success({ id: recordId }, "✅ DNS 记录删除成功");
  } catch (error) {
    if (error.response?.data) {
      const msg = error.response.data.errors?.[0]?.message || "Cloudflare 请求失败";
      const code = error.response.status || 500;
      return res.fail(`❌ 删除 DNS 记录失败：${msg}`, code);
    }

    next(error);
  }
};

/**
 * 更新指定的 DNS 记录
 */
exports.updateDnsRecord = async (req, res, next) => {
  try {
    const { zoneId, recordId, type, name, content, ttl, proxied, comment } = req.body;

    if (!zoneId || !recordId || !type || !name || !content || ttl === undefined || typeof proxied !== "boolean") {
      return res.fail("❌ 请求体参数错误：缺少必要的参数。", 400);
    }

    const response = await cloudflareApi.put(`/zones/${zoneId}/dns_records/${recordId}`, {
      type, name, content, ttl, proxied, comment,
    });

    res.success(response.data.result, "✅ DNS 记录更新成功");
  } catch (error) {
    if (error.response?.data) {
      const msg = error.response.data.errors?.[0]?.message || "Cloudflare 请求失败";
      const code = error.response.status || 500;
      return res.fail(`❌ 更新 DNS 记录失败：${msg}`, code);
    }

    next(error);
  }
};
