

const express = require('express');
const router = express.Router();

const { getLocationMethods ,getweatherMethods} = require('../../controllers/weather/index'); // 确保路径正确


// 获取城市搜索定位信息
router.get('/getLocation',getLocationMethods)

// 获取实时天气信息
router.get('/weather',getweatherMethods)


module.exports = router;