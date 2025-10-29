<template>
    <el-card class="upload-page" shadow="hover">
        <div class="page-header">上传视频</div>
        <el-form :model="form" label-width="80px" class="upload-form" :rules="rules" ref="formRef">
            <el-row :gutter="20">
                <el-col :xs="24" :sm="12">
                    <el-form-item label="标题" prop="title" required>
                        <el-input v-model="form.title" placeholder="请输入视频标题" />
                    </el-form-item>
                </el-col>
                <el-col :xs="24" :sm="12">
                    <el-form-item label="分类" prop="categoryId" required>
                        <el-select v-model="form.categoryId" placeholder="请选择分类">
                            <el-option v-for="item in categoryOptions" :key="item.value" :label="item.text"
                                :value="item.value" />
                        </el-select>
                    </el-form-item>
                </el-col>
            </el-row>
            <el-form-item label="描述">
                <el-input type="textarea" v-model="form.description" placeholder="可选：视频简介"
                    :autosize="{ minRows: 2, maxRows: 4 }" />
            </el-form-item>

            <el-row :gutter="20">
                <el-col :xs="24" :sm="12">
                    <el-form-item label="视频文件" prop="videoFile" required>
                        <el-upload class="upload-block" drag :show-file-list="false" :before-upload="beforeVideoUpload"
                            :on-change="onVideoChange" :auto-upload="false" accept="video/*">
                            <i class="el-icon-upload"></i>
                            <div class="el-upload__text">拖拽或点击上传视频</div>
                            <div v-if="videoName" class="file-name">文件名：{{ videoName }}</div>
                            <el-progress v-if="videoUploading" :percentage="videoProgress" />
                        </el-upload>
                        <div v-if="videoPreview" class="media-preview">
                            <video ref="videoElement" :src="videoPreview" controls class="video-thumb"
                                @loadedmetadata="onVideoLoaded"></video>
                            <el-slider v-if="videoDuration > 0" v-model="currentTime" :min="0" :max="videoDuration"
                                :step="0.1" @input="onSeek" style="margin-top: 10px" />
                            <el-button v-if="videoDuration > 0" size="small" @click="captureFrame"
                                style="margin-top: 10px">截取封面</el-button>
                        </div>
                    </el-form-item>
                </el-col>
                <el-col :xs="24" :sm="12">
                    <el-form-item label="封面图片">
                        <el-upload class="upload-block" drag :show-file-list="false" :before-upload="beforeCoverUpload"
                            :on-change="onCoverChange" :auto-upload="false" accept="image/*">
                            <i class="el-icon-picture"></i>
                            <div class="el-upload__text">拖拽或点击上传封面</div>
                            <div v-if="coverName" class="file-name">封面名：{{ coverName }}</div>
                            <el-progress v-if="coverUploading" :percentage="coverProgress" />
                        </el-upload>
                        <div v-if="coverPreview" class="media-preview" @click="onImagePreview">
                            <img :src="coverPreview" class="img-thumb" />
                        </div>
                    </el-form-item>
                </el-col>
            </el-row>
            <el-form-item>
                <el-button type="primary" :loading="loading" @click="onSubmit" style="width: 100%">{{ loading ? '上传中...'
                    : '上传' }}</el-button>
            </el-form-item>
        </el-form>
    </el-card>
</template>

 
<script setup>
import { ref, onMounted } from 'vue'

// const SERVER_URL = 'http://192.168.101.238:3000'
const SERVER_URL = import.meta.env.VITE_BASE_URL

const form = ref({
  title: '',
  description: '',
  categoryId: ''
})

const categoryOptions = ref([])

const videoFile = ref(null)
const coverFile = ref(null)
const videoName = ref('')
const coverName = ref('')
const loading = ref(false)

const videoPreview = ref('')
const coverPreview = ref('')
const videoElement = ref(null)
const videoDuration = ref(0)
const currentTime = ref(0)

// 上传状态
const videoUploading = ref(false)
const videoProgress = ref(0)

const coverUploading = ref(false)
const coverProgress = ref(0)

onMounted(async () => {
  const res = await fetch(`${SERVER_URL}/api/categories`)
  const data = await res.json()
  if (data.code === 0 || data.code === 200) {
    categoryOptions.value = (data.data || data).map(item => ({
      text: item.name,
      value: item.id
    }))
  }
})

// 视频上传前校验，返回 false 阻止自动上传
function beforeVideoUpload(file) {
  if (!file.type.startsWith('video/')) {
    alert('请上传视频文件')
    return false
  }
  if (file.size > 2000 * 1024 * 1024) {
    alert('视频大小不能超过2000MB')
    return false
  }
  return false // 阻止自动上传，改由手动上传
}

// 视频文件变化时触发
function onVideoChange(file) {
  if (!file) return
  videoFile.value = file.raw
  videoName.value = file.name
  videoPreview.value = URL.createObjectURL(file.raw)
}

// 封面上传前校验，返回 false 阻止自动上传
function beforeCoverUpload(file) {
  if (!file.type.startsWith('image/')) {
    alert('请上传图片文件作为封面')
    return false
  }
  return false // 阻止自动上传
}

// 封面文件变化时触发
function onCoverChange(file) {
  if (!file) return
  coverFile.value = file.raw
  coverName.value = file.name
  const reader = new FileReader()
  reader.onload = e => {
    coverPreview.value = e.target.result
  }
  reader.readAsDataURL(file.raw)
}

function onVideoLoaded() {
  if (videoElement.value) {
    videoDuration.value = videoElement.value.duration
  }
}

function onSeek() {
  if (videoElement.value) {
    videoElement.value.currentTime = currentTime.value
  }
}

function captureFrame() {
  const video = videoElement.value
  if (!video) return

  const canvas = document.createElement('canvas')
  canvas.width = video.videoWidth
  canvas.height = video.videoHeight
  const ctx = canvas.getContext('2d')
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
  const dataUrl = canvas.toDataURL('image/jpeg')
  coverPreview.value = dataUrl

  canvas.toBlob(blob => {
    coverFile.value = new File([blob], 'cover.jpg', { type: 'image/jpeg' })
    coverName.value = 'cover.jpg'
  }, 'image/jpeg')
}

function onImagePreview() {
  if (coverPreview.value) {
    window.open(coverPreview.value, '_blank')
  }
}

// 带上传进度的XHR上传
function uploadWithProgress(url, formData, onProgress) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('POST', url, true)
    xhr.upload.onprogress = e => {
      if (e.lengthComputable && onProgress) {
        onProgress((e.loaded / e.total) * 100)
      }
    }
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(JSON.parse(xhr.responseText))
      } else {
        reject(new Error(xhr.statusText || '上传失败'))
      }
    }
    xhr.onerror = () => reject(new Error('上传出错'))
    xhr.send(formData)
  })
}

async function onSubmit() {
  if (!form.value.title.trim()) return alert('请输入标题')
  if (!form.value.categoryId) return alert('请选择分类')
  if (!videoFile.value) return alert('请选择视频')
  if (videoFile.value.size > 2000 * 1024 * 1024) return alert('视频不能超过2000MB')

  loading.value = true
  videoUploading.value = true
  coverUploading.value = false
  videoProgress.value = 0
  coverProgress.value = 0

  // 分片上传参数
  const chunkSize = 5 * 1024 * 1024 // 5MB 分片大小
  const totalChunks = Math.ceil(videoFile.value.size / chunkSize)

  try {
    // 逐片上传
    for (let i = 0; i < totalChunks; i++) {
      const start = i * chunkSize
      const end = Math.min(videoFile.value.size, start + chunkSize)
      const chunkBlob = videoFile.value.slice(start, end)

      const chunkForm = new FormData()
      chunkForm.append('file', chunkBlob, `${videoName.value}.part${i}`)
      chunkForm.append('chunkIndex', i)
      chunkForm.append('totalChunks', totalChunks)
      chunkForm.append('fileName', videoName.value)

      await uploadWithProgress(
        `${SERVER_URL}/api/admin/videos/chunk`,
        chunkForm,
        progress => {
          // 计算总体进度：已完成分片 + 当前分片进度占比
          const overall = ((i + progress / 100) / totalChunks) * 100
          videoProgress.value = Math.min(100, Math.floor(overall))
        }
      )
    }

    // 所有分片完成后，调用合并接口
    let mergeRes
    if (coverFile.value) {
      // 如果有封面，使用 multipart 方式上传封面（字段名为 file）并携带文本参数
      const mergeForm = new FormData()
      mergeForm.append('file', coverFile.value)
      mergeForm.append('fileName', videoName.value)
      mergeForm.append('totalChunks', totalChunks)
      mergeForm.append('title', form.value.title)
      mergeForm.append('description', form.value.description || '')
      mergeForm.append('categoryId', form.value.categoryId)

      mergeRes = await uploadWithProgress(
        `${SERVER_URL}/api/admin/videos/merge`,
        mergeForm,
        progress => {
          coverUploading.value = true
          coverProgress.value = progress
        }
      )
    } else {
      // 无封面时走 JSON 合并（服务端将自动截取封面）
      const res = await fetch(`${SERVER_URL}/api/admin/videos/merge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: videoName.value,
          totalChunks,
          title: form.value.title,
          description: form.value.description || '',
          categoryId: form.value.categoryId
        })
      })
      mergeRes = await res.json()
    }

    if (mergeRes.code === 0 || mergeRes.code === 200) {
      videoProgress.value = 100
      alert('上传成功')
      // 重置
      form.value.title = ''
      form.value.description = ''
      form.value.categoryId = ''
      videoFile.value = null
      coverFile.value = null
      videoName.value = ''
      coverName.value = ''
      videoPreview.value = ''
      coverPreview.value = ''
      videoDuration.value = 0
      currentTime.value = 0
      videoProgress.value = 0
      coverProgress.value = 0
      coverUploading.value = false
    } else {
      alert(mergeRes.message || '分片合并失败')
    }
  } catch (err) {
    alert(err.message || '上传出错')
  } finally {
    loading.value = false
    videoUploading.value = false
  }
}
</script>

<style scoped>
.upload-page {
    max-width: 800px;
    margin: 30px auto;
    padding: 24px 16px;
    background: #fff;
    border-radius: 16px;
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
}

.page-header {
    font-size: 22px;
    font-weight: bold;
    margin-bottom: 24px;
    text-align: center;
}

.upload-form {
    margin-top: 10px;
}

.upload-block {
    width: 100%;
}

.media-preview {
    margin-top: 10px;
}

.img-thumb,
.video-thumb {
    width: 160px;
    height: 100px;
    object-fit: cover;
    border-radius: 8px;
    border: 1px solid #eee;
    background-color: #000;
    cursor: pointer;
}

.file-name {
    font-size: 13px;
    color: #888;
    margin-top: 6px;
}

@media (max-width: 600px) {
    .upload-page {
        padding: 8px 2px;
        border-radius: 0;
        box-shadow: none;
    }

    .img-thumb,
    .video-thumb {
        width: 100px;
        height: 60px;
    }
}
</style>
