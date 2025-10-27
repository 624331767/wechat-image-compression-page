const express = require('express');
const router = express.Router();
const keepaliveController = require('../../controllers/keepalive/keepalive');

/**
 * @swagger
 * tags:
 *   name: KeepAlive
 *   description: 服务保活相关接口
 */

/**
 * @swagger
 * /api/keepalive/keepalive:
 *   get:
 *     summary: 发送保活请求
 *     description: 用于 Render 或其他服务的定时保活接口
 *     tags: [KeepAlive]
 *     responses:
 *       200:
 *         description: 成功返回保活信息
 *         content:
 *           application/json:
 *             example:
 *               code: 200
 *               message: 保活成功
 *               data:
 *                 status: alive
 */
router.get('/keepalive', keepaliveController.sendkeepalive);

module.exports = router;
