// controllers/videos/crawler_rules.js

/**
 * 视频采集规则配置
 * 每条规则对应一个目标网站的解析方式
 */
module.exports = [
  {
    domain: "serve.ts1.fun", // 替换为你实际要采集的第一个网站域名
    name: "示例网站1视频采集规则",
    videoItemSelector: ".video-card", // 视频条目的容器
    titleSelector: ".video-title",         // 视频标题的选择器
    videoUrlSelector: "video",       // 包含视频URL的元素 (可以是video, a, source等)
    videoUrlAttr: "src",             // 视频URL所在的属性 (src, href, data-src等)
    coverUrlSelector: "img.cover",   // 封面图片的选择器
    coverUrlAttr: "src",             // 封面图片URL所在的属性
    // 可以添加额外的注释或自定义逻辑
    // 例如：该网站视频URL是相对路径，需要拼接
    // customVideoUrlResolver: (relativeUrl, baseUrl) => {
    //    return new URL(relativeUrl, baseUrl).href;
    // }
  },
 
];