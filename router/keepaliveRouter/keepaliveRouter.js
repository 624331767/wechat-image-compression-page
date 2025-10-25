const express = require('express');
const router = express.Router();
const keepaliveController = require('../../controllers/keepalive/keepalive')


router.get('/keepalive', keepaliveController.sendkeepalive)

module.exports = router;
