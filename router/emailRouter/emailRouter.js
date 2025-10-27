


/**
 * @swagger
 * tags:
 *   name: 邮件服务
 *   description: 邮件发送相关接口
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     EmailRequest:
 *       type: object
 *       required:
 *         - to
 *         - subject
 *         - text
 *       properties:
 *         to:
 *           type: string
 *           description: 收件人邮箱地址
 *           example: recipient@example.com
 *         subject:
 *           type: string
 *           description: 邮件主题
 *           example: 测试邮件
 *         text:
 *           type: string
 *           description: 邮件内容
 *           example: 这是一封测试邮件
 *         html:
 *           type: string
 *           description: 邮件HTML内容(可选)
 *           example: <h1>这是一封测试邮件</h1>
 *     EmailResponse:
 *       type: object
 *       properties:
 *         code:
 *           type: integer
 *           description: 状态码，200表示成功
 *           example: 200
 *         message:
 *           type: string
 *           description: 响应消息
 *           example: 邮件发送成功
 *         data:
 *           type: object
 *           properties:
 *             messageId:
 *               type: string
 *               description: 邮件ID
 *               example: <123456@example.com>
 */

const express = require('express');
const router = express.Router();
const imageController = require('../../controllers/email/index'); // 图片处理业务逻辑

/**
 * @swagger
 * /api/send-email:
 *   post:
 *     summary: 发送邮件
 *     description: 发送邮件到指定收件人
 *     tags: [邮件服务]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/EmailRequest'
 *     responses:
 *       200:
 *         description: 邮件发送成功
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/EmailResponse'
 *       400:
 *         description: 请求参数错误
 *       500:
 *         description: 服务器内部错误
 */
router.post('/send-email', imageController.sendEmail);

module.exports = router;