# 公众号图片压缩上传服务
## 项目介绍
这是一个专为微信公众号文章准备的图片压缩上传服务。该服务接收前端上传的图片，使用sharp库进行智能压缩处理（保持比例、自动纠正旋转方向），然后将压缩后的图片转发到指定的目标服务器。

## 主要功能
- 图片智能压缩 ：自动根据原图尺寸进行等比例压缩，最长边不超过2000像素
- 旋转方向修正 ：自动读取EXIF信息并纠正图片方向（解决手机拍照竖屏变横屏问题）
- 文件类型校验 ：仅允许上传图片类型文件（JPEG、PNG等）
- 文件大小限制 ：限制上传文件不超过10MB
- Token验证 ：简单的token验证机制，可扩展为JWT验证
- 错误处理 ：完善的错误处理机制，包括文件类型错误、大小超限、上传超时等

## 技术栈
- Express ：Web服务框架
- Multer ：文件上传中间件
- Sharp ：高性能图片处理库
- Axios ：HTTP客户端，用于转发请求
- CORS ：跨域资源共享支持

## 项目目录结构
`
├── app.js                # 应用程序入口文件，配置Express服务器和中间件
├── config\               # 配置文件目录
│   ├── config.js         # 全局配置参数，如目标服务器上传地址
│   └── multerConfig.js   # 文件上传配置（大小限制、类型过滤等）
├── controllers\         # 控制器目录
│   └── imageController.js # 图片处理控制器，实现压缩和上传逻辑
├── router\              # 路由目录
│   └── imageRouter.js    # 图片相关路由定义
├── package.json         # 项目依赖配置文件
└── package-lock.json    # 依赖版本锁定文件
`

`

### 目录说明

#### app.js
应用程序的入口文件，负责：
- 创建Express应用实例
- 配置CORS跨域支持
- 挂载API路由
- 设置全局错误处理中间件
- 启动HTTP服务器

#### config目录
包含项目的各种配置文件：
- **config.js**：存储全局配置参数，如目标服务器的上传地址
- **multerConfig.js**：配置文件上传中间件(multer)，设置文件存储方式、大小限制和类型过滤

#### controllers目录
包含业务逻辑控制器：
- **imageController.js**：实现图片处理的核心逻辑，包括：
  - token验证
  - 图片压缩处理（使用sharp库）
  - 将压缩后的图片转发到目标服务器
  - 错误处理和响应格式化

#### router目录
定义API路由：
- **imageRouter.js**：定义图片处理相关的路由，包括：
  - 图片压缩上传接口（/api/compress-image）
  - 路由级别的错误处理中间件

## 安装步骤

1. 克隆项目到本地

```bash
git clone <项目仓库地址>
cd 公众号压缩后端
```

2. 安装依赖

```bash
npm install
```

3. 配置目标服务器地址

编辑 `config/config.js` 文件，设置目标服务器上传地址：

```javascript
const uploadUrl = "http://your-target-server.com/upload";
```

## 运行方法

启动服务器：

```bash
node app.js
```

服务将在 http://localhost:3001 上运行。

## API文档

### 图片压缩上传

**接口地址**：`POST /api/compress-image`

**请求头**：
- `Content-Type`: `multipart/form-data`
- `token`: 用户认证令牌（必填）

**请求参数**：

| 参数名 | 类型 | 必填 | 说明 |
| ----- | ---- | ---- | ---- |
| file | File | 是 | 要上传的图片文件，必须是图片类型（如jpg、png等），大小不超过10MB |

**响应示例**：

成功响应：
```json
{
  "code": 0,
  "message": "图片压缩并上传成功",
  "resultdata": {}, // 目标服务器返回的数据
  "fileInfo": {
    "originalName": "example.jpg",
    "originalSizeKB": "1024.00",
    "compressedSizeKB": "512.00",
    "originalDimension": "3000x2000",
    "compressedDimension": "2000x1333"
  }
}
```

错误响应：
```json
{
  "code": 400,
  "message": "仅支持图片文件（如jpg、png、jpeg等）"
}
```

## 前端调用示例

### 使用Fetch API

```javascript
async function uploadImage(imageFile, token) {
  const formData = new FormData();
  formData.append('file', imageFile);
  
  try {
    const response = await fetch('http://localhost:3001/api/compress-image', {
      method: 'POST',
      headers: {
        'token': token
      },
      body: formData
    });
    
    const result = await response.json();
    return result;
  } catch (error) {
    console.error('上传失败:', error);
    throw error;
  }
}

// 使用示例
document.getElementById('uploadForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const fileInput = document.getElementById('imageInput');
  const token = 'your-auth-token'; // 替换为实际的token
  
  if (fileInput.files.length > 0) {
    try {
      const result = await uploadImage(fileInput.files[0], token);
      console.log('上传成功:', result);
      // 处理上传成功的逻辑
    } catch (error) {
      // 处理错误
    }
  }
});
```

### 使用Axios

```javascript
import axios from 'axios';

async function uploadImage(imageFile, token) {
  const formData = new FormData();
  formData.append('file', imageFile);
  
  try {
    const response = await axios.post('http://localhost:3001/api/compress-image', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
        'token': token
      }
    });
    
    return response.data;
  } catch (error) {
    console.error('上传失败:', error.response?.data || error.message);
    throw error;
  }
}
```

## 注意事项

1. 确保前端上传字段名为 `file`
2. 必须在请求头中包含有效的 `token`
3. 仅支持图片类型文件上传
4. 文件大小限制为10MB
5. 服务默认监听3001端口，可在app.js中修改

## 错误处理

服务会返回以下错误码：

- `400`: 客户端错误（文件类型错误、文件过大、缺少文件等）
- `401`: 认证失败（token无效或缺失）
- `500`: 服务器内部错误
- `504`: 上传超时

## 扩展与优化建议

1. 添加更完善的JWT认证
2. 增加日志记录功能
3. 添加图片格式转换选项
4. 实现可配置的压缩质量和尺寸
5. 添加图片水印功能
`