<template>
  <div class="admin-tool-page">
    <div class="toolbar">
      <div class="toolbar-title">
        <Icon icon="fluent:key-20-regular" width="22" height="22" />
        <div>
          <div class="title-text">令牌工具</div>
          <div class="title-desc">一个邮箱只保留一个当前有效令牌。更换后旧令牌立即失效，禁用后客户无法继续访问。</div>
        </div>
      </div>
      <el-tag type="info" effect="plain">@{{ ADMIN_TOOL_DOMAIN }}</el-tag>
    </div>

    <div class="control-card">
      <div class="control-head">
        <label class="control-label" for="admin-tool-prefix">邮箱前缀</label>
        <span class="control-tip">输入前缀后可直接获取当前令牌、换新令牌或查询最近 3 封邮件。</span>
      </div>

      <div class="control-row">
        <el-input
          id="admin-tool-prefix"
          v-model="prefix"
          class="prefix-input"
          placeholder="例如 demo.user"
          clearable
          spellcheck="false"
          autocomplete="off"
          @keyup.enter="handlePrimaryEnter"
        >
          <template #append>
            <span class="domain-suffix">@{{ ADMIN_TOOL_DOMAIN }}</span>
          </template>
        </el-input>
        <el-button v-if="canRegisterAccount" :loading="regLoading" @click="handleAddAccount">注册子账号</el-button>
        <el-button v-if="canUseTokenTool" :loading="currentLoading" @click="handleLoadCurrentToken">获取当前令牌</el-button>
        <el-button v-if="canUseTokenTool" type="primary" :loading="rotateLoading" @click="handleRotateToken">更换令牌</el-button>
        <el-button v-if="canQueryRecentMails" :loading="mailLoading" @click="handleQueryRecentMails">查询最近 3 封</el-button>
      </div>

      <div v-if="canManageTokenStatus && tokenInfo" class="action-row">
        <el-button
          v-if="tokenInfo.tokenStatus === ADMIN_TOOL_TOKEN_STATUS.ACTIVE"
          type="danger"
          plain
          :loading="statusLoading"
          @click="handleDisableToken"
        >
          禁用令牌
        </el-button>
        <el-button
          v-else
          type="success"
          plain
          :loading="statusLoading"
          @click="handleEnableToken"
        >
          启用并发新令牌
        </el-button>
      </div>

      <div class="control-meta">
        <span v-if="resolvedEmail">当前结果邮箱：{{ resolvedEmail }}</span>
        <span v-else>当前尚未加载任何账号令牌或邮件内容。</span>
      </div>
    </div>

    <div v-if="canUseTokenTool && tokenInfo" class="token-card">
      <div class="token-head">
        <div class="token-summary">
          <span class="token-title">当前令牌</span>
          <el-tag :type="tokenStatusMeta.type">{{ tokenStatusMeta.label }}</el-tag>
          <span class="token-meta">版本 {{ tokenInfo.tokenVersion }}</span>
          <span v-if="tokenInfo.tokenRotatedAt" class="token-meta">更新时间 {{ tokenInfo.tokenRotatedAt }}</span>
        </div>
        <el-button v-if="tokenInfo.token" size="small" text @click="copyText(tokenInfo.token, '令牌')">复制令牌</el-button>
      </div>
      <div class="token-value">{{ tokenInfo.token || '当前状态下没有可展示的令牌。' }}</div>
    </div>

    <div v-if="canQueryRecentMails" class="mail-panel">
      <div class="mail-list">
        <div class="panel-title">最近 3 封邮件</div>
        <div v-if="mailLoading" class="panel-loading">
          <el-skeleton :rows="4" animated />
        </div>
        <div v-else-if="recentMails.length === 0" class="panel-empty">
          <el-empty description="暂无可展示邮件。你可以先获取当前令牌，再查询最近 3 封邮件。" />
        </div>
        <div
          v-for="mail in recentMails"
          :key="mail.emailId"
          class="mail-item"
          :class="{ active: mail.emailId === activeMailId }"
          role="button"
          tabindex="0"
          @click="activeMailId = mail.emailId"
          @keyup.enter="activeMailId = mail.emailId"
          @keyup.space.prevent="activeMailId = mail.emailId"
        >
          <div class="mail-item-top">
            <span class="mail-subject">{{ mail.subject || '无主题' }}</span>
            <span class="mail-time">{{ formatMailTime(mail.createTime) }}</span>
          </div>
          <div class="mail-from">{{ mail.sendEmail || '未知发件人' }}</div>
          <div class="mail-preview">{{ buildMailPreview(mail) }}</div>
          <div class="mail-actions">
            <el-tag v-if="mail.verifyCode" size="small" type="success" effect="plain">
              验证码 {{ mail.verifyCode }}
            </el-tag>
            <el-button
              v-if="mail.verifyCode"
              size="small"
              text
              @click.stop="copyText(mail.verifyCode, '验证码')"
            >
              复制验证码
            </el-button>
          </div>
        </div>
      </div>

      <div class="mail-detail">
        <template v-if="selectedMail">
          <div class="detail-head">
            <div>
              <div class="detail-subject">{{ selectedMail.subject || '无主题' }}</div>
              <div class="detail-meta">
                <span>FROM: {{ selectedMail.sendEmail || '未知发件人' }}</span>
                <span>{{ formatMailTime(selectedMail.createTime) }}</span>
              </div>
            </div>
            <div class="detail-actions">
              <el-tag v-if="selectedMail.verifyCode" type="success">验证码 {{ selectedMail.verifyCode }}</el-tag>
              <el-button
                v-if="selectedMail.verifyCode"
                size="small"
                type="primary"
                plain
                @click="copyText(selectedMail.verifyCode, '验证码')"
              >
                复制验证码
              </el-button>
            </div>
          </div>
          <el-scrollbar class="detail-scroll">
            <ShadowHtml
              v-if="selectedMail.content"
              class="detail-html"
              :html="formatMailHtml(selectedMail.content)"
            />
            <pre v-else class="detail-text">{{ selectedMail.text || '这封邮件没有可展示的正文内容。' }}</pre>
          </el-scrollbar>
        </template>
        <div v-else class="panel-empty">
          <el-empty description="选择左侧邮件后，这里会显示完整内容。" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { ElMessageBox } from 'element-plus'
import { Icon } from '@iconify/vue'
import ShadowHtml from '@/components/shadow-html/index.vue'
import {
  addSubAccount,
  disableToken,
  enableToken,
  getCurrentToken,
  getRecentTokenMails,
  rotateToken,
} from '@/request/admin-tool.js'
import { useSettingStore } from '@/store/setting.js'
import { useUserStore } from '@/store/user.js'
import { formatDetailDate } from '@/utils/day.js'
import { toOssDomain } from '@/utils/convert.js'
import {
  canAddSubAccount,
  canGenerateMailboxToken,
  canUseAdminToolExtraButtons,
  canUseAdminToolRecentMails,
  canUseAdminToolTokenActions,
} from '@/perm/access.js'
import {
  ADMIN_TOOL_DOMAIN,
  ADMIN_TOOL_TOKEN_STATUS,
  buildAdminToolEmail,
  getSelectedMailId,
  getTokenStatusMeta,
  shouldResetAdminToolState,
} from './model.js'

defineOptions({
  name: 'admin-tool',
})

const settingStore = useSettingStore()
const userStore = useUserStore()

const prefix = ref('')
const regLoading = ref(false)
const currentLoading = ref(false)
const rotateLoading = ref(false)
const statusLoading = ref(false)
const mailLoading = ref(false)

const currentEmail = ref('')
const resolvedEmail = ref('')
const tokenInfo = ref(null)
const recentMails = ref([])
const activeMailId = ref(null)

const canRegisterAccount = computed(() => (
  canAddSubAccount(userStore.user.permKeys)
  && canUseAdminToolExtraButtons(userStore.user.permKeys, settingStore.settings.adminToolExtraSwitch)
))
const canUseTokenTool = computed(() => canUseAdminToolTokenActions(userStore.user.permKeys))
const canManageTokenStatus = computed(() => canGenerateMailboxToken(userStore.user.permKeys))
const canQueryRecentMails = computed(() => (
  canUseAdminToolRecentMails(userStore.user.permKeys, settingStore.settings.adminToolExtraSwitch)
))
const targetEmail = computed(() => buildAdminToolEmail(prefix.value))
const tokenStatusMeta = computed(() => getTokenStatusMeta(tokenInfo.value?.tokenStatus))
const selectedMail = computed(() => recentMails.value.find(mail => mail.emailId === activeMailId.value) || null)

function ensureTargetEmail() {
  if (!targetEmail.value) {
    ElMessage.warning('请输入邮箱前缀')
    return ''
  }
  return targetEmail.value
}

function resetToolState(nextEmail) {
  if (!shouldResetAdminToolState(currentEmail.value, nextEmail)) {
    return
  }

  tokenInfo.value = null
  recentMails.value = []
  activeMailId.value = null
  resolvedEmail.value = ''
}

async function copyText(text, label) {
  if (!text) return

  try {
    await navigator.clipboard.writeText(text)
    ElMessage.success(`${label}已复制`)
  } catch {
    ElMessage.error(`${label}复制失败，请手动复制`)
  }
}

function applyTokenInfo(info, email) {
  tokenInfo.value = info
  currentEmail.value = email
  resolvedEmail.value = info?.email || email
}

async function loadCurrentToken(email, options = {}) {
  resetToolState(email)

  const info = await getCurrentToken(email)
  applyTokenInfo(info, email)

  if (options.copy && info?.token) {
    await copyText(info.token, '令牌')
  }

  return info
}

async function ensureActiveToken(email) {
  const info = !tokenInfo.value || currentEmail.value !== email
    ? await loadCurrentToken(email)
    : tokenInfo.value

  if (info?.tokenStatus !== ADMIN_TOOL_TOKEN_STATUS.ACTIVE) {
    ElMessage.warning('该账号令牌已被禁用，请先启用并获取新令牌')
    return null
  }

  return info?.token || null
}

function buildMailPreview(mail) {
  const content = mail.text || mail.content || ''
  return content.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim() || '这封邮件没有可预览的文字内容。'
}

function formatMailTime(time) {
  return time ? formatDetailDate(time) : '--'
}

function formatMailHtml(content) {
  const domain = settingStore.settings.r2Domain
  return (content || '').replace(/{{domain}}/g, `${toOssDomain(domain)}/`)
}

async function handlePrimaryEnter() {
  if (canQueryRecentMails.value) {
    await handleQueryRecentMails()
    return
  }

  if (canUseTokenTool.value) {
    await handleLoadCurrentToken()
  }
}

async function handleAddAccount() {
  const email = ensureTargetEmail()
  if (!email) return

  regLoading.value = true
  try {
    await addSubAccount(email)
    ElMessage.success(`${email} 注册成功`)
  } finally {
    regLoading.value = false
  }
}

async function handleLoadCurrentToken() {
  const email = ensureTargetEmail()
  if (!email) return

  currentLoading.value = true
  try {
    await loadCurrentToken(email, { copy: true })
  } finally {
    currentLoading.value = false
  }
}

async function handleRotateToken() {
  const email = ensureTargetEmail()
  if (!email) return

  try {
    await ElMessageBox.confirm('更换后旧令牌会立即失效，客户必须使用新令牌才能继续访问。', '确认更换令牌', {
      confirmButtonText: '继续更换',
      cancelButtonText: '取消',
      type: 'warning',
    })
  } catch {
    return
  }

  rotateLoading.value = true
  try {
    const info = await rotateToken(email)
    applyTokenInfo(info, email)
    await copyText(info.token, '新令牌')
  } finally {
    rotateLoading.value = false
  }
}

async function handleDisableToken() {
  const email = ensureTargetEmail()
  if (!email) return

  try {
    await ElMessageBox.confirm('禁用后客户使用当前令牌将无法访问验证码页和最近邮件查询。', '确认禁用令牌', {
      confirmButtonText: '确认禁用',
      cancelButtonText: '取消',
      type: 'warning',
    })
  } catch {
    return
  }

  statusLoading.value = true
  try {
    const info = await disableToken(email)
    applyTokenInfo({ ...(tokenInfo.value || {}), ...info }, email)
    ElMessage.success('该账号令牌已禁用')
  } finally {
    statusLoading.value = false
  }
}

async function handleEnableToken() {
  const email = ensureTargetEmail()
  if (!email) return

  statusLoading.value = true
  try {
    const info = await enableToken(email)
    applyTokenInfo(info, email)
    await copyText(info.token, '新令牌')
  } finally {
    statusLoading.value = false
  }
}

async function handleQueryRecentMails() {
  const email = ensureTargetEmail()
  if (!email) return

  mailLoading.value = true
  try {
    const token = await ensureActiveToken(email)
    if (!token) return

    const res = await getRecentTokenMails(token)
    recentMails.value = Array.isArray(res.mails) ? res.mails : []
    activeMailId.value = getSelectedMailId(recentMails.value, activeMailId.value)
    resolvedEmail.value = res.email || email

    if (recentMails.value.length === 0) {
      ElMessage.info('最近没有可展示的邮件')
    }
  } finally {
    mailLoading.value = false
  }
}
</script>

<style scoped lang="scss">
.admin-tool-page {
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 18px 20px;
  background:
    radial-gradient(circle at top right, rgba(64, 158, 255, 0.08), transparent 32%),
    linear-gradient(180deg, #f8fbff 0%, #ffffff 24%);
  overflow: hidden;
}

.toolbar,
.control-card,
.token-card,
.mail-list,
.mail-detail {
  background: rgba(255, 255, 255, 0.94);
  border: 1px solid rgba(20, 35, 60, 0.08);
  border-radius: 16px;
  box-shadow: 0 12px 30px rgba(23, 44, 84, 0.05);
}

.toolbar {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  padding: 18px 20px;
}

.toolbar-title {
  display: flex;
  gap: 12px;
  align-items: flex-start;
}

.title-text {
  font-size: 20px;
  font-weight: 700;
  color: #12233d;
}

.title-desc {
  margin-top: 4px;
  color: #51627f;
  font-size: 13px;
}

.control-card {
  padding: 18px 20px;
}

.control-head {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
  flex-wrap: wrap;
}

.control-label {
  font-size: 13px;
  font-weight: 600;
  color: #12233d;
}

.control-tip,
.control-meta {
  color: #65748d;
  font-size: 12px;
}

.control-row,
.action-row {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.action-row {
  margin-top: 12px;
}

.prefix-input {
  flex: 1;
  min-width: 260px;
}

.domain-suffix {
  white-space: nowrap;
  color: #51627f;
}

.control-meta {
  margin-top: 10px;
}

.token-card {
  padding: 16px 20px;
}

.token-head {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  align-items: center;
  margin-bottom: 10px;
}

.token-summary {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  align-items: center;
}

.token-title,
.panel-title {
  font-size: 14px;
  font-weight: 700;
  color: #12233d;
}

.token-meta {
  color: #65748d;
  font-size: 12px;
}

.token-value {
  font-family: Consolas, Monaco, monospace;
  font-size: 13px;
  line-height: 1.6;
  color: #1f3558;
  word-break: break-all;
}

.mail-panel {
  min-height: 0;
  flex: 1;
  display: grid;
  grid-template-columns: minmax(320px, 360px) minmax(0, 1fr);
  gap: 16px;
}

.mail-list,
.mail-detail {
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.mail-list {
  padding: 16px;
  overflow: auto;
}

.panel-loading,
.panel-empty {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

.mail-item {
  margin-top: 12px;
  padding: 14px;
  border: 1px solid #d9e3f3;
  border-radius: 12px;
  background: #f9fbff;
  text-align: left;
  cursor: pointer;
  transition: all 0.18s ease;
}

.mail-item:hover,
.mail-item.active {
  border-color: #409eff;
  background: #eef6ff;
  box-shadow: 0 10px 22px rgba(64, 158, 255, 0.12);
}

.mail-item-top {
  display: flex;
  gap: 10px;
  align-items: flex-start;
  justify-content: space-between;
}

.mail-subject {
  color: #12233d;
  font-weight: 600;
  line-height: 1.4;
}

.mail-time,
.mail-from {
  color: #65748d;
  font-size: 12px;
}

.mail-from {
  margin-top: 6px;
}

.mail-preview {
  margin-top: 10px;
  color: #435471;
  font-size: 13px;
  line-height: 1.6;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.mail-actions {
  margin-top: 12px;
  display: flex;
  justify-content: space-between;
  gap: 8px;
  align-items: center;
  flex-wrap: wrap;
}

.mail-detail {
  padding: 18px 20px;
}

.detail-head {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: flex-start;
  padding-bottom: 16px;
  border-bottom: 1px solid #e6edf7;
}

.detail-subject {
  font-size: 24px;
  font-weight: 700;
  color: #12233d;
  line-height: 1.4;
}

.detail-meta {
  margin-top: 8px;
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
  color: #65748d;
  font-size: 13px;
}

.detail-actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  align-items: center;
}

.detail-scroll {
  flex: 1;
  min-height: 0;
  margin-top: 18px;
}

.detail-html {
  min-height: 100%;
}

.detail-text {
  margin: 0;
  white-space: pre-wrap;
  word-break: break-word;
  font-family: inherit;
  color: #1f3558;
  line-height: 1.7;
}

@media (max-width: 1024px) {
  .mail-panel {
    grid-template-columns: 1fr;
  }

  .mail-list {
    max-height: 320px;
  }

  .detail-head,
  .token-head {
    flex-direction: column;
  }
}

@media (max-width: 767px) {
  .admin-tool-page {
    padding: 14px;
  }

  .toolbar,
  .control-card,
  .token-card,
  .mail-list,
  .mail-detail {
    border-radius: 14px;
  }

  .toolbar {
    flex-direction: column;
  }

  .prefix-input {
    min-width: 100%;
  }
}
</style>
