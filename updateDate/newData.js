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
            let ipInfo = {
                addr: '未知地区',
                cityCode: '',
                pro: '未知省份',
                proCode: '',
                city: '未知城市'
            };
            
            try {
                // 设置超时时间，防止长时间等待
                const response = await axios.get(`${base_Path}/ipJson.jsp?json=true&ip=${ip}`, {
                    responseType: 'arraybuffer', // 保持编码一致
                    timeout: 3000 // 3秒超时
                });
                
                // 将 GBK 编码转换为 UTF-8
                const decoded = iconv.decode(response.data, 'gbk');
                const result = JSON.parse(decoded);
                
                // 如果成功获取IP信息，则更新ipInfo
                if (result && result.addr) {
                    ipInfo = {
                        addr: result.addr || '未知地区',
                        cityCode: result.cityCode || '',
                        pro: result.pro || '未知省份',
                        proCode: result.proCode || '',
                        city: result.city || '未知城市'
                    };
                }
            } catch (ipError) {
                console.warn('IP地理位置查询失败，使用默认值:', ipError.message);
                // 继续使用默认值，不影响主程序
            }

            // 获取API路径（只保存路径部分，不包含查询参数，避免字段过长）
            // 使用 req.path 获取路径，如果不存在则从 originalUrl 中提取路径部分
            let apiPath = req.path;
            if (!apiPath || apiPath === '/') {
                // 如果 path 不存在，从 originalUrl 中提取路径部分（去掉查询参数）
                const originalUrl = req.originalUrl || req.baseUrl || req.url || '';
                apiPath = originalUrl.split('?')[0]; // 只取路径部分，去掉查询参数
            }
            
            // 限制 api_name 长度，避免数据库字段溢出（通常数据库字段限制为255或更短）
            const maxApiNameLength = 255;
            if (apiPath.length > maxApiNameLength) {
                apiPath = apiPath.substring(0, maxApiNameLength);
            }
            
            // 调用日志记录工具写入数据库或文件
            await logApiCall({
                apiName: apiPath,                         // 请求接口（只保存路径，不包含查询参数）
                ip,                                       // 客户端 IP
                userAgent: req.headers['user-agent'] || '', // UA 信息
                statusCode: res.statusCode,               // 响应状态码
                remark: '',                               // 备注，可拓展
                ...ipInfo // 展开IP信息（可能是默认值或查询结果）
            });
        } catch (err) {
            console.error('记录接口日志失败:', err);
            // 即使日志记录失败，也不影响主程序
        }
    });

    next(); // 执行下一个中间件或路由处理
}

module.exports = { apiLoggerMiddleware };
