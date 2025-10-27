const express = require('express')
const router = express.Router()
const { getLocationMethods, getweatherMethods } = require('../../controllers/weather/index')

/**
 * @swagger
 * tags:
 *   name: Weather
 *   description: 天气相关接口
 */

/**
 * @swagger
 * /api/weather/getLocation:
 *   get:
 *     summary: 获取城市搜索定位信息
 *     description: 根据城市名称获取定位信息（使用和风天气API）
 *     tags: [Weather]
 *     parameters:
 *       - in: query
 *         name: location
 *         schema:
 *           type: string
 *         required: true
 *         description: 城市名称，如 "北京"
 *     responses:
 *       200:
 *         description: 成功返回定位信息
 */
router.get('/getLocation', getLocationMethods)

/**
 * @swagger
 * /api/weather/weather:
 *   get:
 *     summary: 获取实时天气信息
 *     description: 根据城市名或 location ID 获取实时天气
 *     tags: [Weather]
 *     parameters:
 *       - in: query
 *         name: location
 *         schema:
 *           type: string
 *         required: true
 *         description: 城市名或 ID
 *     responses:
 *       200:
 *         description: 成功返回天气数据
 */
router.get('/weather', getweatherMethods)

module.exports = router
