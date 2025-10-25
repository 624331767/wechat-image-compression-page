/**
 * @file db/index.js
 * @description 数据库连接与查询模块。
 * 该模块使用 mysql2 创建了一个数据库连接池，并提供了一个基于 Promise 的查询方法。
 */

const mysql = require('mysql2');
const { pdfbseUrl, ...config } = require('../config/database');  // 引入数据库配置


// 创建一个连接池。连接池可以复用数据库连接，避免了为每个查询都建立新连接的开销，
// 从而显著提高了性能和应用的可伸缩性。
const pool = mysql.createPool({
    ...config,  // 确保包含 host、user、password、database、port
    waitForConnections: true,  // 当连接池满时，新的请求会排队等待而不是立即失败。
    connectionLimit: 10,       // 连接池中允许的最大连接数。
    queueLimit: 0              // 排队队列的限制，0 表示不限制。
});

// 在应用启动时，尝试获取一个连接来测试数据库配置的正确性。
// 这是一种主动检查（Eager Check），可以帮助在应用启动阶段就发现数据库配置问题。
pool.getConnection((err, connection) => {
    if (err) {
        console.error('❌ 数据库连接失败! 请检查 /config/database.js 中的配置。');
        console.error(err.stack);
        // 在严重错误下，可以选择退出进程，防止应用在无法连接数据库的情况下运行。
        process.exit(1);
    } else {
        console.log('✅ 数据库连接池已成功初始化。');
        connection.release(); // 获取成功后必须释放连接，使其返回连接池。
    }
});

/**
 * 封装的通用 SQL 查询函数
 * @param {string} sql - 要执行的 SQL 语句，可以使用 '?'作为占位符。
 * @param {any[]} [params] - (可选) 用于替换 SQL 语句中占位符的参数数组。
 * @returns {Promise<any>} 返回一个 Promise，成功时 resolve 查询结果，失败时 reject 错误对象。
 */
const query = (sql, params) => {
    return new Promise((resolve, reject) => {
        pool.execute(sql, params, (err, results) => {
            if (err) {
                // 在生产环境中，我们只记录关键的错误信息。
                // 在开发环境中，可以记录更详细的堆栈信息以方便调试。
                console.error('❌ SQL 查询执行失败:', err.message);
                if (process.env.NODE_ENV !== 'production') {
                    console.error(err.stack);
                }
                reject(err);
            } else {
                // 仅在非生产环境中打印成功的查询日志，避免在生产环境中产生大量噪音。
                if (process.env.NODE_ENV !== 'production') {
                    console.log('✅ SQL 查询成功。');
                }
                resolve(results);
            }
        });
    });
};

module.exports = {
    query
};
