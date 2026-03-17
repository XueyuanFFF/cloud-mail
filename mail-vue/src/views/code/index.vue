<template>
  <div class="code-page">
    <div class="code-card">
      <div class="hero">
        <div class="hero-badge">Token Query</div>
        <div class="hero-title">验证码查询</div>
        <div class="hero-desc">
          输入密钥后可获取最近 10 分钟内最新一封包含验证码的邮件。查询过快时，请在 5 秒后重试。
        </div>
      </div>

      <div class="query-form">
        <label class="field-label" for="token-input">邮箱密钥</label>
        <el-input
          id="token-input"
          v-model="token"
          placeholder="请输入完整 token"
          type="text"
          name="token"
          spellcheck="false"
          autocomplete="off"
          @keyup.enter="query"
        />
        <div class="field-tip">复制令牌后可直接粘贴，系统会自动校验是否有效。</div>
        <el-button class="query-btn" type="primary" :loading="loading" @click="query">
          查询验证码
        </el-button>
      </div>

      <div v-if="result" class="result-card">
        <div class="result-head">
          <div>
            <div class="result-title">查询结果</div>
            <div class="result-subtitle">{{ result.email }}</div>
          </div>
          <el-button type="primary" plain @click="copy(result.verifyCode)">复制验证码</el-button>
        </div>

        <div class="code-highlight">
          <span class="code-label">验证码</span>
          <span class="code-value">{{ result.verifyCode }}</span>
        </div>

        <div class="result-grid">
          <div class="result-item">
            <span class="item-label">主题</span>
            <span class="item-value">{{ result.subject || '无主题' }}</span>
          </div>
          <div class="result-item">
            <span class="item-label">发件人</span>
            <span class="item-value">{{ result.sendEmail || '未知发件人' }}</span>
          </div>
          <div class="result-item">
            <span class="item-label">时间</span>
            <span class="item-value">{{ result.createTime || '--' }}</span>
          </div>
        </div>
      </div>

      <el-alert
        v-if="errMsg"
        class="error-alert"
        type="error"
        :closable="false"
        show-icon
        :title="errMsg"
      />
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import axios from 'axios'

const token = ref('')
const loading = ref(false)
const result = ref(null)
const errMsg = ref('')

const baseUrl = import.meta.env.VITE_BASE_URL || '/api'

function normalizeError(error) {
  const responseMessage = error?.response?.data?.message
  if (responseMessage) {
    return responseMessage
  }
  return '网络异常，请稍后重试'
}

async function query() {
  const value = token.value.trim()
  if (!value) {
    ElMessage({ message: '请输入密钥', type: 'warning', plain: true })
    return
  }

  loading.value = true
  result.value = null
  errMsg.value = ''

  try {
    const response = await axios.post(`${baseUrl}/code/latest`, { token: value })
    const data = response.data

    if (data.code === 200) {
      result.value = data.data
      return
    }

    errMsg.value = data.message || '查询失败，请稍后再试'
  } catch (error) {
    errMsg.value = normalizeError(error)
  } finally {
    loading.value = false
  }
}

async function copy(text) {
  if (!text) return

  try {
    await navigator.clipboard.writeText(text)
    ElMessage({ message: '验证码已复制到剪贴板', type: 'success', plain: true })
  } catch {
    ElMessage({ message: '复制失败，请手动复制验证码', type: 'error', plain: true })
  }
}
</script>

<style lang="scss" scoped>
.code-page {
  width: 100%;
  min-height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background:
    radial-gradient(circle at top left, rgba(0, 113, 227, 0.26), transparent 28%),
    radial-gradient(circle at bottom right, rgba(22, 163, 74, 0.22), transparent 30%),
    linear-gradient(140deg, #eff6ff 0%, #f8fafc 45%, #fefce8 100%);
}

.code-card {
  width: min(560px, 100%);
  padding: 28px;
  border-radius: 24px;
  background: rgba(255, 255, 255, 0.94);
  border: 1px solid rgba(15, 23, 42, 0.08);
  box-shadow: 0 24px 60px rgba(15, 23, 42, 0.12);
}

.hero-badge {
  display: inline-flex;
  padding: 6px 10px;
  border-radius: 999px;
  background: rgba(0, 113, 227, 0.12);
  color: #005fcc;
  font-size: 12px;
  font-weight: 600;
}

.hero-title {
  margin-top: 14px;
  font-size: 28px;
  font-weight: 800;
  color: #10243f;
}

.hero-desc {
  margin-top: 10px;
  color: #5b6b84;
  font-size: 14px;
  line-height: 1.7;
}

.query-form {
  margin-top: 24px;
}

.field-label {
  display: block;
  margin-bottom: 8px;
  color: #10243f;
  font-size: 13px;
  font-weight: 700;
}

.field-tip {
  margin-top: 8px;
  color: #6b7b93;
  font-size: 12px;
}

.query-btn {
  width: 100%;
  height: 42px;
  margin-top: 16px;
  border-radius: 12px;
}

.result-card {
  margin-top: 22px;
  padding: 18px;
  border-radius: 18px;
  border: 1px solid #dce7f7;
  background: linear-gradient(180deg, #f8fbff 0%, #ffffff 100%);
}

.result-head {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: flex-start;
}

.result-title {
  color: #10243f;
  font-size: 16px;
  font-weight: 700;
}

.result-subtitle {
  margin-top: 6px;
  color: #62748e;
  font-size: 13px;
  word-break: break-all;
}

.code-highlight {
  margin-top: 18px;
  padding: 18px;
  border-radius: 16px;
  background: linear-gradient(135deg, #e0f2fe 0%, #ecfccb 100%);
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.code-label {
  color: #35516d;
  font-size: 12px;
  font-weight: 700;
}

.code-value {
  color: #0f172a;
  font-size: 34px;
  font-weight: 800;
  letter-spacing: 6px;
}

.result-grid {
  margin-top: 18px;
  display: grid;
  gap: 12px;
}

.result-item {
  display: grid;
  gap: 6px;
  padding: 12px 14px;
  border-radius: 12px;
  background: #f8fafc;
}

.item-label {
  color: #62748e;
  font-size: 12px;
}

.item-value {
  color: #10243f;
  font-size: 14px;
  line-height: 1.6;
  word-break: break-all;
}

.error-alert {
  margin-top: 20px;
}

@media (max-width: 640px) {
  .code-page {
    padding: 16px;
  }

  .code-card {
    padding: 22px 18px;
    border-radius: 20px;
  }

  .result-head {
    flex-direction: column;
  }

  .code-value {
    font-size: 28px;
    letter-spacing: 4px;
  }
}
</style>
