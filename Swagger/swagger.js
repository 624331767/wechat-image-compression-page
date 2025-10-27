const swaggerJSDoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');
const path = require('path');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: '公众号图片压缩与上传服务API文档',
      version: '1.0.0',
      description: '提供图片压缩、邮件发送、视频管理等服务的API接口文档',
    },
    tags: [
      {
        name: '图片处理',
        description: '图片压缩与上传相关接口'
      },
      {
        name: '邮件服务',
        description: '邮件发送相关接口'
      },
      {
        name: '视频管理',
        description: '视频管理相关接口'
      },
      {
        name: '天气服务',
        description: '天气查询相关接口'
      }
    ]
  },
  // 使用绝对路径 + 通配符确保能匹配多层目录
  apis: [
    path.join(__dirname, '../router/imageRouter.js'),
    path.join(__dirname, '../router/emailRouter/emailRouter.js'),
    path.join(__dirname, '../router/videosRouter/videosRouter.js'),
    path.join(__dirname, '../router/weatherRouter/weatherRouter.js'),
    path.join(__dirname, '../router/jwtTestRouter/jwtTestRouter.js'),
      path.join(__dirname, '../router/keepaliveRouter/keepaliveRouter.js')
  ],
};

const swaggerSpec = swaggerJSDoc(options);

// 调试输出
console.log('🔍 Swagger 扫描结果 keys:', Object.keys(swaggerSpec.paths || {}));

module.exports = { swaggerUi, swaggerSpec };
