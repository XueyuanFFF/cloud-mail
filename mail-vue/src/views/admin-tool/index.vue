<template>
  <div class="admin-tool-wrap">
    <div class="page-header">
      <Icon icon="fluent:key-20-regular" width="22" height="22" />
      <span>令牌工具</span>
    </div>

    <div v-if="canRegisterAccount" class="card-section">
      <div class="section-title">子账号注册</div>
      <div class="input-row">
        <el-input
          v-model="regPrefix"
          placeholder="输入邮箱前缀"
          class="prefix-input"
          @keyup.enter="handleAddAccount"
        >
          <template #append>
            <span class="domain-suffix">@{{ DOMAIN }}</span>
          </template>
        </el-input>
        <el-button type="primary" :loading="regLoading" @click="handleAddAccount">注册</el-button>
      </div>
    </div>

    <div v-if="canUseTokenTool" class="card-section">
      <div class="section-title">生成令牌 / 查看验证码</div>
      <div class="input-row">
        <el-input
          v-model="tokenPrefix"
          placeholder="输入邮箱前缀"
          class="prefix-input"
          @keyup.enter="handleGenerateToken"
        >
          <template #append>
            <span class="domain-suffix">@{{ DOMAIN }}</span>
          </template>
        </el-input>
        <el-button type="primary" :loading="tokenLoading" @click="handleGenerateToken">生成令牌</el-button>
        <el-button :loading="codeLoading" :disabled="!currentToken" @click="handleGetCode">查看验证码</el-button>
      </div>

      <div v-if="currentToken" class="result-block">
        <div class="result-row">
          <span class="result-label">令牌</span>
          <span class="result-value token-text">{{ currentToken }}</span>
          <el-button size="small" text @click="copyText(currentToken, '令牌')">
            <Icon icon="fluent:copy-20-regular" width="16" height="16" />
          </el-button>
        </div>
      </div>

      <div v-if="codeResult" class="result-block code-block">
        <div class="result-row">
          <span class="result-label">验证码</span>
          <span class="code-value">{{ codeResult.verifyCode }}</span>
          <el-tag size="small" type="success" style="margin-left:8px">已复制</el-tag>
        </div>
        <div class="result-row meta-row">
          <span class="meta-text">来自：{{ codeResult.sendEmail }}</span>
          <span class="meta-text">主题：{{ codeResult.subject }}</span>
          <span class="meta-text">时间：{{ codeResult.createTime }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { Icon } from '@iconify/vue'
import { generateToken, getLatestCode, addSubAccount } from '@/request/admin-tool.js'
import { useUserStore } from '@/store/user.js'
import { canAddSubAccount, canGenerateMailboxToken } from '@/perm/access.js'

const DOMAIN = 'yx909.indevs.in'
const userStore = useUserStore()

const regPrefix = ref('')
const regLoading = ref(false)

const tokenPrefix = ref('')
const tokenLoading = ref(false)
const codeLoading = ref(false)
const currentToken = ref('')
const currentEmail = ref('')
const codeResult = ref(null)
const canRegisterAccount = computed(() => canAddSubAccount(userStore.user.permKeys))
const canUseTokenTool = computed(() => canGenerateMailboxToken(userStore.user.permKeys))

function copyText(text, label) {
    navigator.clipboard.writeText(text).then(() => {
        ElMessage.success(`${label}已复制`)
    })
}

async function handleAddAccount() {
    const prefix = regPrefix.value.trim()
    if (!prefix) {
        ElMessage.warning('请输入邮箱前缀')
        return
    }
    regLoading.value = true
    try {
        await addSubAccount(`${prefix}@${DOMAIN}`)
        ElMessage.success(`${prefix}@${DOMAIN} 注册成功`)
        regPrefix.value = ''
    } finally {
        regLoading.value = false
    }
}

async function handleGenerateToken() {
    const prefix = tokenPrefix.value.trim()
    if (!prefix) {
        ElMessage.warning('请输入邮箱前缀')
        return
    }
    tokenLoading.value = true
    codeResult.value = null
    try {
        const email = `${prefix}@${DOMAIN}`
        const res = await generateToken(email)
        currentToken.value = res.token
        currentEmail.value = email
        copyText(res.token, '令牌')
    } finally {
        tokenLoading.value = false
    }
}

async function handleGetCode() {
    if (!currentToken.value) return
    codeLoading.value = true
    codeResult.value = null
    try {
        const res = await getLatestCode(currentToken.value)
        codeResult.value = res
        if (res?.verifyCode) {
            navigator.clipboard.writeText(res.verifyCode)
            ElMessage.success(`验证码 ${res.verifyCode} 已复制`)
        }
    } finally {
        codeLoading.value = false
    }
}
</script>

<style scoped>
.admin-tool-wrap {
  padding: 20px 24px;
  max-width: 780px;
}

.page-header {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 18px;
  font-weight: 600;
  margin-bottom: 24px;
  color: var(--el-text-color-primary);
}

.card-section {
  background: var(--el-bg-color);
  border: 1px solid var(--el-border-color-light);
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 18px;
}

.section-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--el-text-color-secondary);
  margin-bottom: 14px;
}

.input-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.prefix-input {
  flex: 1;
}

.domain-suffix {
  color: var(--el-text-color-secondary);
  font-size: 13px;
  white-space: nowrap;
}

.result-block {
  margin-top: 14px;
  padding: 12px 14px;
  background: var(--el-fill-color-light);
  border-radius: 6px;
}

.result-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.result-label {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  flex-shrink: 0;
  width: 36px;
}

.result-value {
  font-size: 13px;
  color: var(--el-text-color-primary);
  flex: 1;
  word-break: break-all;
}

.token-text {
  font-family: monospace;
  font-size: 12px;
}

.code-block {
  border-left: 3px solid var(--el-color-success);
}

.code-value {
  font-size: 22px;
  font-weight: 700;
  color: var(--el-color-success);
  letter-spacing: 4px;
}

.meta-row {
  margin-top: 8px;
  flex-wrap: wrap;
  gap: 12px;
}

.meta-text {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}
</style>
