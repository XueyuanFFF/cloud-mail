<template>
  <div class="code-page">
    <div class="code-container">
      <span class="code-title">验证码查询</span>
      <span class="code-desc">输入邮箱专属密钥，获取最近10分钟内的验证码</span>
      <el-input
          v-model="token"
          placeholder="请输入密钥 (Token)"
          type="text"
          autocomplete="off"
          @keyup.enter="query"
      />
      <el-button class="btn" type="primary" @click="query" :loading="loading">
        查询验证码
      </el-button>
      <div v-if="result" class="result-card">
        <div class="result-row">
          <span class="label">邮箱</span>
          <span class="value">{{ result.email }}</span>
        </div>
        <div class="result-row highlight">
          <span class="label">验证码</span>
          <span class="value code-value" @click="copy(result.verifyCode)">
            {{ result.verifyCode }}
            <el-icon class="copy-icon"><DocumentCopy /></el-icon>
          </span>
        </div>
        <div class="result-row">
          <span class="label">主题</span>
          <span class="value">{{ result.subject }}</span>
        </div>
        <div class="result-row">
          <span class="label">发件人</span>
          <span class="value">{{ result.sendEmail }}</span>
        </div>
        <div class="result-row">
          <span class="label">时间</span>
          <span class="value">{{ result.createTime }}</span>
        </div>
      </div>
      <div v-if="errMsg" class="err-msg">{{ errMsg }}</div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import axios from 'axios';
import { DocumentCopy } from '@element-plus/icons-vue';

const token = ref('');
const loading = ref(false);
const result = ref(null);
const errMsg = ref('');

const baseUrl = import.meta.env.VITE_BASE_URL || '/api';

async function query() {
  const val = token.value.trim();
  if (!val) {
    ElMessage({ message: '请输入密钥', type: 'warning', plain: true });
    return;
  }

  loading.value = true;
  result.value = null;
  errMsg.value = '';

  try {
    const res = await axios.post(baseUrl + '/code/latest', { token: val });
    const data = res.data;
    if (data.code === 200) {
      result.value = data.data;
    } else {
      errMsg.value = data.message || '查询失败';
    }
  } catch (e) {
    errMsg.value = '网络错误，请重试';
  } finally {
    loading.value = false;
  }
}

function copy(text) {
  navigator.clipboard.writeText(text).then(() => {
    ElMessage({ message: '已复制到剪贴板', type: 'success', plain: true });
  });
}
</script>

<style lang="scss" scoped>
.code-page {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.code-container {
  background: var(--el-bg-color);
  padding: 40px;
  border-radius: 12px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15);
  display: flex;
  flex-direction: column;
  width: 440px;
  @media (max-width: 500px) {
    width: calc(100% - 32px);
    margin: 0 16px;
    padding: 24px 20px;
  }

  .code-title {
    font-weight: bold;
    font-size: 22px;
  }

  .code-desc {
    margin-top: 6px;
    margin-bottom: 20px;
    color: var(--form-desc-color);
    font-size: 13px;
  }

  .el-input {
    height: 40px;
    margin-bottom: 16px;
    :deep(.el-input__wrapper) {
      border-radius: 8px;
    }
  }

  .btn {
    height: 40px;
    width: 100%;
    border-radius: 8px;
    font-size: 15px;
  }
}

.result-card {
  margin-top: 20px;
  border: 1px solid var(--el-border-color-light);
  border-radius: 8px;
  overflow: hidden;

  .result-row {
    display: flex;
    align-items: center;
    padding: 10px 16px;
    border-bottom: 1px solid var(--el-border-color-lighter);
    &:last-child {
      border-bottom: none;
    }
  }

  .result-row.highlight {
    background: var(--el-color-primary-light-9);
  }

  .label {
    width: 60px;
    flex-shrink: 0;
    color: var(--secondary-text-color);
    font-size: 13px;
  }

  .value {
    flex: 1;
    word-break: break-all;
    font-size: 14px;
  }

  .code-value {
    font-size: 24px;
    font-weight: bold;
    color: var(--el-color-primary);
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 8px;
    letter-spacing: 4px;
  }

  .copy-icon {
    font-size: 16px;
    color: var(--secondary-text-color);
  }
}

.err-msg {
  margin-top: 16px;
  text-align: center;
  color: var(--el-color-danger);
  font-size: 14px;
}
</style>
