
/**
 * Cloudflare DNS 管理路由模块
 * 功能：提供 Cloudflare 域名和 DNS 记录管理接口
 */
const express = require('express');
const router = express.Router();
const { 
    getZones, 
    getDnsRecords, 
    addDnsRecord, 
    deleteDnsRecord, 
    updateDnsRecord
} = require('../../controllers/cloudflare/cloudflare'); // 确保路径正确

/**
 * @swagger
 * components:
 *   schemas:
 *     Zone:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           description: Cloudflare Zone ID
 *           example: "023e105f4ecef8ad9ca31a8372d0c353"
 *         name:
 *           type: string
 *           description: 域名名称
 *           example: "example.com"
 *         status:
 *           type: string
 *           description: 域名状态
 *           example: "active"
 *         paused:
 *           type: boolean
 *           description: 是否暂停
 *           example: false
 *     DnsRecord:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           description: DNS 记录 ID
 *           example: "f77f630461422fca1b9b8a27265e42a0"
 *         type:
 *           type: string
 *           description: 记录类型 (A, CNAME, MX 等)
 *           example: "A"
 *         name:
 *           type: string
 *           description: 记录名称
 *           example: "www.example.com"
 *         content:
 *           type: string
 *           description: 记录内容
 *           example: "192.0.2.1"
 *         ttl:
 *           type: integer
 *           description: 生存时间
 *           example: 3600
 *     DnsRecordCreate:
 *       type: object
 *       properties:
 *         zoneId:
 *           type: string
 *           description: Cloudflare Zone ID
 *           example: "023e105f4ecef8ad9ca31a8372d0c353"
 *         type:
 *           type: string
 *           description: 记录类型
 *           example: "A"
 *         name:
 *           type: string
 *           description: 记录名称
 *           example: "api.example.com"
 *         content:
 *           type: string
 *           description: 记录内容
 *           example: "192.0.2.2"
 *         ttl:
 *           type: integer
 *           description: 生存时间
 *           example: 3600
 *     DnsRecordUpdate:
 *       type: object
 *       properties:
 *         zoneId:
 *           type: string
 *           description: Cloudflare Zone ID
 *           example: "023e105f4ecef8ad9ca31a8372d0c353"
 *         recordId:
 *           type: string
 *           description: DNS 记录 ID
 *           example: "f77f630461422fca1b9b8a27265e42a0"
 *         type:
 *           type: string
 *           description: 记录类型
 *           example: "A"
 *         name:
 *           type: string
 *           description: 记录名称
 *           example: "www.example.com"
 *         content:
 *           type: string
 *           description: 记录内容
 *           example: "192.0.2.3"
 *         ttl:
 *           type: integer
 *           description: 生存时间
 *           example: 3600
 *     DnsRecordDelete:
 *       type: object
 *       properties:
 *         zoneId:
 *           type: string
 *           description: Cloudflare Zone ID
 *           example: "023e105f4ecef8ad9ca31a8372d0c353"
 *         recordId:
 *           type: string
 *           description: DNS 记录 ID
 *           example: "f77f630461422fca1b9b8a27265e42a0"
 *     ApiResponse:
 *       type: object
 *       properties:
 *         code:
 *           type: integer
 *           description: 状态码
 *           example: 200
 *         message:
 *           type: string
 *           description: 响应消息
 *           example: "操作成功"
 *         data:
 *           type: object
 *           description: 响应数据
 *
 * @swagger
 * tags:
 *   name: Cloudflare
 *   description: Cloudflare 域名与 DNS 管理接口
 */

/**
 * @swagger
 * /api-dns/zones:
 *   get:
 *     summary: 获取 Cloudflare 账户下的所有域名
 *     description: 获取当前账户下的所有 Cloudflare 域名列表
 *     tags: [Cloudflare]
 *     responses:
 *       200:
 *         description: 域名列表获取成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 code:
 *                   type: integer
 *                   example: 200
 *                 message:
 *                   type: string
 *                   example: "获取域名列表成功"
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Zone'
 *       500:
 *         description: 服务器内部错误
 */
router.get('/zones', getZones);

/**
 * @swagger
 * /api-dns/dns-records:
 *   get:
 *     summary: 获取指定域名的 DNS 记录
 *     description: 获取指定 Cloudflare Zone 的所有 DNS 记录
 *     tags: [Cloudflare]
 *     parameters:
 *       - in: query
 *         name: zoneId
 *         schema:
 *           type: string
 *         required: true
 *         description: Cloudflare Zone ID
 *         example: "023e105f4ecef8ad9ca31a8372d0c353"
 *     responses:
 *       200:
 *         description: DNS 记录获取成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 code:
 *                   type: integer
 *                   example: 200
 *                 message:
 *                   type: string
 *                   example: "获取 DNS 记录成功"
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/DnsRecord'
 *       400:
 *         description: 请求参数错误
 *       500:
 *         description: 服务器内部错误
 */
router.get('/dns-records', getDnsRecords);

/**
 * @swagger
 * /api-dns/dns-records:
 *   post:
 *     summary: 添加 DNS 记录
 *     description: 向指定的 Cloudflare Zone 添加一条新的 DNS 记录
 *     tags: [Cloudflare]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/DnsRecordCreate'
 *     responses:
 *       200:
 *         description: DNS 记录添加成功
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *       400:
 *         description: 请求参数错误
 *       500:
 *         description: 服务器内部错误
 */
router.post('/dns-records', addDnsRecord);

/**
 * @swagger
 * /api-dns/dns-records:
 *   delete:
 *     summary: 删除 DNS 记录
 *     description: 删除指定的 Cloudflare DNS 记录
 *     tags: [Cloudflare]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/DnsRecordDelete'
 *     responses:
 *       200:
 *         description: DNS 记录删除成功
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *       400:
 *         description: 请求参数错误
 *       500:
 *         description: 服务器内部错误
 */
router.delete('/dns-records', deleteDnsRecord);

/**
 * @swagger
 * /api-dns/dns-records:
 *   put:
 *     summary: 更新 DNS 记录
 *     description: 更新指定的 Cloudflare DNS 记录
 *     tags: [Cloudflare]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/DnsRecordUpdate'
 *     responses:
 *       200:
 *         description: DNS 记录更新成功
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *       400:
 *         description: 请求参数错误
 *       500:
 *         description: 服务器内部错误
 */
router.put('/dns-records', updateDnsRecord);

module.exports = router;
