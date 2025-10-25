
const express = require('express');
const router = express.Router();
const { 
    getZones, 
    getDnsRecords, 
    addDnsRecord, 
    deleteDnsRecord, 
    updateDnsRecord
} = require('../../controllers/cloudflare/cloudflare'); // 确保路径正确

// Cloudflare DNS 路由定义
router.get('/zones', getZones); // 获取 Cloudflare 账户下的所有域名 (Zones)
router.get('/dns-records', getDnsRecords); // 获取指定 Zone 的 DNS 记录
router.post('/dns-records', addDnsRecord); // 添加 DNS 记录
router.delete('/dns-records', deleteDnsRecord); // 删除 DNS 记录
router.put('/dns-records', updateDnsRecord); // 更新 DNS 记录

module.exports = router;
