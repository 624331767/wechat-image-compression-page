<template>
  <div class="video-detail-container">
    <!-- 顶部导航栏 -->
    <div class="header-bar">
      <el-button 
        type="text" 
        :icon="ArrowLeft" 
        @click="goBack"
        class="back-btn"
        size="large"
      >
        返回
      </el-button>
      <h1 class="page-title">视频详情</h1>
      <div class="header-placeholder"></div>
    </div>

    <!-- 主要内容区 -->
    <el-card class="detail-card" shadow="hover" v-loading="loading">
      <!-- 视频标题 -->
      <div class="video-header">
        <h2 class="video-title">{{ video.title || '加载中...' }}</h2>
        <div class="video-meta">
          <el-tag :type="getCategoryTagType(video.category)" size="large" class="category-tag">
            {{ video.category || '未分类' }}
          </el-tag>
          <span class="create-time" v-if="video.created_at">
            <el-icon><Clock /></el-icon>
            {{ formatTime(video.created_at) }}
          </span>
        </div>
      </div>

      <!-- 视频播放器 -->
      <div class="player-section">
        <div class="player-wrapper">
          <video
            v-if="video.video_url"
            :src="video.video_url"
            class="detail-player"
            controls
            :poster="video.cover_url || ''"
            preload="metadata"
            @error="handleVideoError"
          >
            您的浏览器不支持视频播放
          </video>
          <div v-else class="player-placeholder">
            <el-icon class="placeholder-icon"><VideoCamera /></el-icon>
            <p>视频加载失败</p>
          </div>
        </div>
      </div>

      <!-- 视频信息 -->
      <div class="info-section">
        <div class="section-title">
          <el-icon><Document /></el-icon>
          <span>视频信息</span>
        </div>
        
        <div class="info-content">
          <div class="info-item">
            <div class="info-label">
              <el-icon><FolderOpened /></el-icon>
              <span>分类</span>
            </div>
            <div class="info-value">
              <el-tag :type="getCategoryTagType(video.category)" size="default">
                {{ video.category || '未分类' }}
              </el-tag>
            </div>
          </div>

          <div class="info-item" v-if="video.description">
            <div class="info-label">
              <el-icon><EditPen /></el-icon>
              <span>描述</span>
            </div>
            <div class="info-value">
              <p class="description-text">{{ video.description }}</p>
            </div>
          </div>

          <div class="info-item" v-else>
            <div class="info-label">
              <el-icon><EditPen /></el-icon>
              <span>描述</span>
            </div>
            <div class="info-value">
              <span class="empty-text">暂无描述</span>
            </div>
          </div>

          <div class="info-item" v-if="video.created_at">
            <div class="info-label">
              <el-icon><Clock /></el-icon>
              <span>创建时间</span>
            </div>
            <div class="info-value">
              <span>{{ formatTime(video.created_at) }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 操作按钮 -->
      <div class="action-section">
        <el-button 
          type="primary" 
          @click="onEdit" 
          size="large"
          :icon="Edit"
          class="action-btn"
        >
          编辑信息
        </el-button>
        <el-button 
          type="danger" 
          @click="onDelete" 
          size="large"
          :icon="Delete"
          class="action-btn"
        >
          删除视频
        </el-button>
        <el-button 
          type="default" 
          @click="goBack" 
          size="large"
          :icon="ArrowLeft"
          class="action-btn"
        >
          返回列表
        </el-button>
      </div>
    </el-card>

    <!-- 编辑弹窗 -->
    <el-dialog 
      v-model="showEdit" 
      title="编辑视频信息" 
      width="600px"
      :close-on-click-modal="false"
      class="edit-dialog"
    >
      <el-form 
        :model="editForm" 
        label-width="100px" 
        :rules="editRules" 
        ref="editFormRef"
      >
        <el-form-item label="视频标题" prop="title">
          <el-input 
            v-model="editForm.title" 
            placeholder="请输入视频标题"
            :maxlength="100"
            show-word-limit
            size="large"
          />
        </el-form-item>
        <el-form-item label="视频描述" prop="description">
          <el-input 
            v-model="editForm.description" 
            type="textarea" 
            :rows="4"
            placeholder="请输入视频描述（可选）"
            :maxlength="500"
            show-word-limit
          />
        </el-form-item>
        <el-form-item label="视频分类" prop="categoryId">
          <el-select 
            v-model="editForm.categoryId" 
            placeholder="请选择分类"
            style="width: 100%"
            size="large"
          >
            <el-option
              v-for="item in categoryOptions"
              :key="item.value"
              :label="item.text"
              :value="item.value"
            />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="showEdit = false" size="large">取消</el-button>
          <el-button 
            type="primary" 
            :loading="saving" 
            @click="onSave"
            size="large"
          >
            保存修改
          </el-button>
        </div>
      </template>
    </el-dialog>

    <!-- 删除确认弹窗 -->
    <el-dialog 
      v-model="showDeleteDialog" 
      title="确认删除" 
      width="400px"
      :close-on-click-modal="false"
    >
      <div class="delete-content">
        <el-icon class="delete-icon"><WarningFilled /></el-icon>
        <p class="delete-text">确认要删除视频 <strong>"{{ video.title }}"</strong> 吗？</p>
        <p class="delete-warning">此操作不可恢复，请谨慎操作</p>
      </div>
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="showDeleteDialog = false" size="large">取消</el-button>
          <el-button 
            type="danger" 
            :loading="deleting"
            @click="confirmDelete"
            size="large"
          >
            确认删除
          </el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import axios from 'axios'
import { ElMessage } from 'element-plus'
import {
  ArrowLeft, Edit, Delete, Document, FolderOpened, 
  EditPen, Clock, VideoCamera, WarningFilled
} from '@element-plus/icons-vue'

const SERVER_URL = import.meta.env.VITE_BASE_URL || 'http://localhost:3000'
const route = useRoute()
const router = useRouter()

const video = ref({})
const loading = ref(false)
const showEdit = ref(false)
const saving = ref(false)
const deleting = ref(false)
const showDeleteDialog = ref(false)
const editForm = ref({ 
  id: null, 
  title: '', 
  description: '', 
  categoryId: null 
})
const categoryOptions = ref([])
const editFormRef = ref(null)

// 表单验证规则
const editRules = {
  title: [
    { required: true, message: '请输入视频标题', trigger: 'blur' },
    { max: 100, message: '标题不能超过100个字符', trigger: 'blur' }
  ],
  categoryId: [
    { required: true, message: '请选择视频分类', trigger: 'change' }
  ]
}

// 工具函数
function formatTime(timeStr) {
  if (!timeStr) return '-'
  try {
    const date = new Date(timeStr)
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const hours = String(date.getHours()).padStart(2, '0')
    const minutes = String(date.getMinutes()).padStart(2, '0')
    return `${year}-${month}-${day} ${hours}:${minutes}`
  } catch {
    return timeStr
  }
}

// 分类标签样式映射
function getCategoryTagType(category) {
  const colorMap = {
    '科技': 'primary',
    '娱乐': 'success',
    '教育': 'info',
    '音乐': 'warning',
    '电影': 'danger',
    '体育': 'success',
    '新闻': 'info'
  }
  return colorMap[category] || 'default'
}

// 加载分类数据
async function loadCategories() {
  try {
    const res = await axios.get(`${SERVER_URL}/api/categories`)
    if (res.data && (res.data.code === 0 || res.data.code === 200)) {
      categoryOptions.value = (res.data.data || res.data).map(item => ({
        text: item.name,
        value: item.id
      }))
    }
  } catch (err) {
    console.error('加载分类失败:', err)
  }
}

// 加载视频详情
async function loadVideoDetail() {
  loading.value = true
  try {
    const id = route.params.id
    const res = await axios.get(`${SERVER_URL}/api/videos/${id}`)
    
    if (res.data && (res.data.code === 0 || res.data.code === 200)) {
      const item = res.data.data
      video.value = {
        ...item,
        video_url: item.video_url ? `${item.video_url}` : '',
        cover_url: item.cover_url ? `${item.cover_url}` : ''
      }
    } else {
      ElMessage.error(res.data.message || '加载失败')
      router.back()
    }
  } catch (err) {
    console.error('加载失败:', err)
    ElMessage.error('加载失败，请检查网络连接')
    router.back()
  } finally {
    loading.value = false
  }
}

// 处理视频加载错误
function handleVideoError() {
  ElMessage.warning('视频加载失败，请检查视频地址')
}

// 返回
function goBack() {
  router.back()
}

// 编辑
function onEdit() {
  editForm.value = {
    id: video.value.id,
    title: video.value.title || '',
    description: video.value.description || '',
    categoryId: video.value.category_id
  }
  showEdit.value = true
}

// 保存
async function onSave() {
  if (!editFormRef.value) return
  
  try {
    await editFormRef.value.validate()
  } catch {
    return
  }

  saving.value = true
  try {
    const res = await axios.put(`${SERVER_URL}/api/admin/videos/${editForm.value.id}`, {
      title: editForm.value.title,
      description: editForm.value.description,
      categoryId: editForm.value.categoryId
    })
    
    if (res.data && (res.data.code === 0 || res.data.code === 200)) {
      ElMessage.success('保存成功')
      showEdit.value = false
      await loadVideoDetail()
    } else {
      ElMessage.error(res.data.message || '保存失败')
    }
  } catch (err) {
    console.error('保存失败:', err)
    ElMessage.error('保存失败，请重试')
  } finally {
    saving.value = false
  }
}

// 删除
function onDelete() {
  showDeleteDialog.value = true
}

// 确认删除
async function confirmDelete() {
  deleting.value = true
  try {
    const res = await axios.delete(`${SERVER_URL}/api/admin/videos/${video.value.id}`)
    
    if (res.data && (res.data.code === 0 || res.data.code === 200)) {
      ElMessage.success('删除成功')
      router.back()
    } else {
      ElMessage.error(res.data.message || '删除失败')
    }
  } catch (err) {
    console.error('删除失败:', err)
    ElMessage.error('删除失败，请重试')
  } finally {
    deleting.value = false
    showDeleteDialog.value = false
  }
}

// 初始化
onMounted(() => {
  loadCategories().then(() => loadVideoDetail())
})
</script>

<style scoped>
.video-detail-container {
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 20px;
}

/* 顶部导航栏 */
.header-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  max-width: 1200px;
  margin: 0 auto 20px;
  padding: 20px 30px;
  background: rgba(255, 255, 255, 0.95);
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
}

.back-btn {
  color: #606266;
  font-size: 16px;
}

.back-btn:hover {
  color: #409eff;
}

.page-title {
  font-size: 28px;
  font-weight: 600;
  color: #303133;
  margin: 0;
  flex: 1;
  text-align: center;
}

.header-placeholder {
  width: 80px;
}

/* 主卡片 */
.detail-card {
  max-width: 1200px;
  margin: 0 auto;
  border-radius: 16px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

/* 视频头部 */
.video-header {
  padding: 30px;
  border-bottom: 1px solid #f0f0f0;
}

.video-title {
  font-size: 28px;
  font-weight: 600;
  color: #303133;
  margin: 0 0 16px 0;
  line-height: 1.4;
}

.video-meta {
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
}

.category-tag {
  font-size: 14px;
  padding: 6px 16px;
}

.create-time {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  color: #909399;
}

/* 播放器区域 */
.player-section {
  padding: 30px;
  background: #000;
}

.player-wrapper {
  width: 100%;
  border-radius: 12px;
  overflow: hidden;
  background: #000;
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.3);
  transition: transform 0.3s;
}

.player-wrapper:hover {
  transform: scale(1.01);
}

.detail-player {
  width: 100%;
  height: auto;
  aspect-ratio: 16 / 9;
  display: block;
  background: #000;
}

.player-placeholder {
  width: 100%;
  aspect-ratio: 16 / 9;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #909399;
  background: #1a1a1a;
}

.placeholder-icon {
  font-size: 64px;
  margin-bottom: 16px;
  color: #606266;
}

.player-placeholder p {
  font-size: 16px;
  margin: 0;
}

/* 信息区域 */
.info-section {
  padding: 30px;
  border-top: 1px solid #f0f0f0;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 18px;
  font-weight: 600;
  color: #303133;
  margin-bottom: 24px;
}

.section-title .el-icon {
  font-size: 20px;
  color: #409eff;
}

.info-content {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.info-item {
  display: flex;
  align-items: flex-start;
  gap: 16px;
  padding: 16px;
  background: #f5f7fa;
  border-radius: 8px;
  transition: all 0.3s;
}

.info-item:hover {
  background: #ebedf0;
  transform: translateX(4px);
}

.info-label {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 100px;
  font-weight: 500;
  color: #606266;
  flex-shrink: 0;
}

.info-label .el-icon {
  font-size: 18px;
  color: #409eff;
}

.info-value {
  flex: 1;
  min-width: 0;
}

.description-text {
  margin: 0;
  line-height: 1.6;
  color: #303133;
  word-break: break-word;
}

.empty-text {
  color: #909399;
  font-style: italic;
}

/* 操作按钮区域 */
.action-section {
  padding: 30px;
  border-top: 1px solid #f0f0f0;
  display: flex;
  gap: 16px;
  justify-content: center;
  flex-wrap: wrap;
  background: #fafafa;
}

.action-btn {
  min-width: 140px;
  display: flex;
  align-items: center;
  gap: 6px;
  transition: all 0.3s;
}

.action-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

/* 删除弹窗 */
.delete-content {
  text-align: center;
  padding: 20px 0;
}

.delete-icon {
  font-size: 48px;
  color: #f56c6c;
  margin-bottom: 16px;
}

.delete-text {
  font-size: 16px;
  color: #303133;
  margin: 0 0 8px 0;
}

.delete-text strong {
  color: #409eff;
}

.delete-warning {
  font-size: 13px;
  color: #909399;
  margin: 0;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

/* 响应式 */
@media (max-width: 768px) {
  .video-detail-container {
    padding: 10px;
  }

  .header-bar {
    padding: 15px 20px;
  }

  .page-title {
    font-size: 20px;
  }

  .header-placeholder {
    width: 60px;
  }

  .video-header {
    padding: 20px;
  }

  .video-title {
    font-size: 22px;
  }

  .player-section {
    padding: 20px;
  }

  .info-section {
    padding: 20px;
  }

  .info-item {
    flex-direction: column;
    gap: 12px;
  }

  .info-label {
    min-width: auto;
  }

  .action-section {
    padding: 20px;
    flex-direction: column;
  }

  .action-btn {
    width: 100%;
    justify-content: center;
  }
}
</style>
