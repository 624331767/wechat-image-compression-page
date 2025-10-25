


const express = require('express');
const router = express.Router();
const imageController = require('../../controllers/email/index'); // 图片处理业务逻辑

router.post('/send-email', imageController.sendEmail);

module.exports = router;