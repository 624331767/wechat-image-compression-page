/**
 * @file apiLoggerMiddleware.js
 * @description 全局 API 请求日志中间件，记录请求信息及客户端 IP、地理位置
 */

const { logApiCall } = require('../utils/logApiCall');
const dayjs = require('dayjs');
const iconv = require('iconv-lite');
const axios = require('axios');

// 太平洋在线 IP 查询接口基础路径
const base_Path = "https://whois.pconline.com.cn";

/**
 * 获取客户端真实 IP
 * @param {import('express').Request} req - Express 请求对象
 * @returns {string} 客户端 IP
 */
function getClientIp(req) {
    let ip = req.headers['x-forwarded-for']?.split(',')[0].trim() // Nginx 或代理转发
        || req.ip                                             // Express 内置获取 IP
        || req.connection.remoteAddress                      // Node 原生获取
        || '';

    // IPv6 映射 IPv4 处理
    if (ip.startsWith('::ffff:')) {
        ip = ip.substring(7);
    }
    // 本地访问处理
    if (ip === '::1') {
        ip = '127.0.0.1';
    }
    return ip;
}

/**
 * API 日志中间件
 * - 请求开始时间记录
 * - 请求结束时（res.finish）异步获取 IP 地理位置并写入日志
 * @param {import('express').Request} req - Express 请求对象
 * @param {import('express').Response} res - Express 响应对象
 * @param {import('express').NextFunction} next - Express 下一中间件
 */
function apiLoggerMiddleware(req, res, next) {
    const start = dayjs(); // 请求开始时间

    // 响应完成事件
    res.on('finish', async () => {
        const responseTime = dayjs().diff(start); // 计算接口耗时
        const ip = getClientIp(req);              // 获取客户端 IP

        try {
            // 查询 IP 地理位置（太平洋在线）
            const response = await axios.get(`${base_Path}/ipJson.jsp?json=true&ip=${ip}`, {
                responseType: 'arraybuffer' // 保持编码一致
            });

            // 将 GBK 编码转换为 UTF-8
            const decoded = iconv.decode(response.data, 'gbk');
            const result = JSON.parse(decoded);

            // 调用日志记录工具写入数据库或文件
            await logApiCall({
                apiName: req.originalUrl || req.baseUrl,  // 请求接口
                ip,                                       // 客户端 IP
                userAgent: req.headers['user-agent'] || '', // UA 信息
                statusCode: res.statusCode,               // 响应状态码

                remark: '',                               // 备注，可拓展
                addr: result.addr,                        // 地理位置
                cityCode: result.cityCode,                // 城市编码
                pro: result.pro,                          // 省份
                proCode: result.proCode,                  // 省份编码
                city: result.city                         // 城市
            });
        } catch (err) {
            console.error('记录接口日志失败:', err);
        }
    });

    next(); // 执行下一个中间件或路由处理
}

module.exports = apiLoggerMiddleware;
