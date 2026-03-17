# Account Token Rotation Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 mailbox token 改造成账号级单令牌模型，支持管理员按账号更换/禁用/启用令牌，并移除 `/code` 与 `/mailboxToken/recent` 的查询频率限制。

**Architecture:** 在 `account` 表增加令牌状态字段，token 改为携带 `accountId + email + version` 的加密载荷。后端统一按账号当前 `token_version/token_status` 校验，管理端改成“当前令牌 / 更换 / 禁用 / 启用 / 查询最近 3 封邮件”的单页流。

**Tech Stack:** Cloudflare Workers, D1, KV, Drizzle ORM, Vue 3, Element Plus, Vitest, Node test runner

---

## Chunk 1: 后端令牌模型

### Task 1: 账号表扩展与初始化迁移

**Files:**
- Modify: `mail-worker/src/entity/account.js`
- Modify: `mail-worker/src/init/init.js`
- Modify: `CHANGELOG.md`

- [ ] **Step 1: 写出字段存在性的失败测试**

在 `mail-worker/src/service/mailbox-token-service.test.js` 添加对账号令牌字段语义的最小断言，先引用将新增的辅助函数或常量。

- [ ] **Step 2: 运行测试确认失败**

Run: `npx vitest run --config vitest.unit.config.mjs src/service/mailbox-token-service.test.js`
Expected: FAIL，提示新导出或行为不存在。

- [ ] **Step 3: 为 `account` 增加令牌字段并补迁移**

新增：
- `tokenVersion`
- `tokenStatus`
- `tokenRotatedAt`
- `tokenRotatedBy`

在 `init.js` 增加一个新版本迁移，确保老库补字段。

- [ ] **Step 4: 重新运行测试**

Run: `npx vitest run --config vitest.unit.config.mjs src/service/mailbox-token-service.test.js`
Expected: PASS

- [ ] **Step 5: 提交本任务**

```bash
git add mail-worker/src/entity/account.js mail-worker/src/init/init.js CHANGELOG.md mail-worker/src/service/mailbox-token-service.test.js
git commit -m "feat: add account token state fields"
```

### Task 2: token 载荷版本化并去掉查询限流

**Files:**
- Modify: `mail-worker/src/service/mailbox-token-service.js`
- Modify: `mail-worker/src/service/mailbox-token-utils.js`
- Modify: `mail-worker/src/service/mailbox-token-utils.test.js`
- Modify: `mail-worker/src/service/mailbox-token-service.test.js`

- [ ] **Step 1: 写失败测试覆盖新行为**

补测试覆盖：
- token 载荷包含账号版本信息
- 版本不匹配时旧 token 失效
- `token_status = disabled` 时拒绝访问
- 不再写入 5 秒限流 KV

- [ ] **Step 2: 运行测试确认失败**

Run: `npx vitest run --config vitest.unit.config.mjs src/service/mailbox-token-utils.test.js src/service/mailbox-token-service.test.js`
Expected: FAIL，提示旧逻辑不支持版本校验或仍依赖旧限流常量。

- [ ] **Step 3: 实现最小后端逻辑**

实现：
- `generateCurrentToken`
- `rotateToken`
- `disableToken`
- `enableToken`
- `resolveAvailableAccount`

移除基于 `CODE_RATE_LIMIT` 的邮箱查询限流，但保留无效 token 的 IP 失败计数逻辑。

- [ ] **Step 4: 重新运行测试**

Run: `npx vitest run --config vitest.unit.config.mjs src/service/mailbox-token-utils.test.js src/service/mailbox-token-service.test.js`
Expected: PASS

- [ ] **Step 5: 提交本任务**

```bash
git add mail-worker/src/service/mailbox-token-service.js mail-worker/src/service/mailbox-token-utils.js mail-worker/src/service/mailbox-token-utils.test.js mail-worker/src/service/mailbox-token-service.test.js
git commit -m "feat: version mailbox tokens per account"
```

### Task 3: API 与权限映射

**Files:**
- Modify: `mail-worker/src/api/mailbox-token-api.js`
- Modify: `mail-worker/src/security/perm-paths.js`
- Modify: `mail-worker/src/security/perm-paths.test.js`

- [ ] **Step 1: 写失败测试**

为权限映射增加断言，要求以下接口都映射到 `mailboxToken:generate`：
- `/mailboxToken/current`
- `/mailboxToken/rotate`
- `/mailboxToken/disable`
- `/mailboxToken/enable`
- `/mailboxToken/recent`

- [ ] **Step 2: 运行测试确认失败**

Run: `npx vitest run --config vitest.unit.config.mjs src/security/perm-paths.test.js`
Expected: FAIL

- [ ] **Step 3: 实现 API**

新增接口：
- `POST /mailboxToken/current`
- `POST /mailboxToken/rotate`
- `POST /mailboxToken/disable`
- `POST /mailboxToken/enable`

保留 `/mailboxToken/recent`。

- [ ] **Step 4: 重新运行测试**

Run: `npx vitest run --config vitest.unit.config.mjs src/security/perm-paths.test.js`
Expected: PASS

- [ ] **Step 5: 提交本任务**

```bash
git add mail-worker/src/api/mailbox-token-api.js mail-worker/src/security/perm-paths.js mail-worker/src/security/perm-paths.test.js
git commit -m "feat: add account token management endpoints"
```

## Chunk 2: 前端管理端

### Task 4: 管理端请求层与模型层

**Files:**
- Modify: `mail-vue/src/request/admin-tool.js`
- Modify: `mail-vue/src/views/admin-tool/model.js`
- Modify: `mail-vue/src/views/admin-tool/model.test.js`

- [ ] **Step 1: 写失败测试**

补充模型测试，覆盖：
- 同邮箱复用“当前令牌”接口，而非无状态生成
- 切换邮箱时清空旧状态
- 管理动作文案状态映射

- [ ] **Step 2: 运行测试确认失败**

Run: `node --test src/views/admin-tool/model.test.js`
Expected: FAIL

- [ ] **Step 3: 实现请求和模型**

新增请求：
- `getCurrentToken`
- `rotateToken`
- `disableToken`
- `enableToken`

模型层补状态辅助函数。

- [ ] **Step 4: 重新运行测试**

Run: `node --test src/views/admin-tool/model.test.js`
Expected: PASS

- [ ] **Step 5: 提交本任务**

```bash
git add mail-vue/src/request/admin-tool.js mail-vue/src/views/admin-tool/model.js mail-vue/src/views/admin-tool/model.test.js
git commit -m "feat: add admin token management client helpers"
```

### Task 5: `admin-tool` 页面改为令牌管理页

**Files:**
- Modify: `mail-vue/src/views/admin-tool/index.vue`

- [ ] **Step 1: 写最小失败测试或快照辅助测试**

如果不做组件测试，先在模型测试里增加页面依赖的状态切换用例，确保“当前令牌 / 更换 / 禁用 / 启用”流程有可验证的状态机。

- [ ] **Step 2: 运行测试确认失败**

Run: `node --test src/views/admin-tool/model.test.js`
Expected: FAIL

- [ ] **Step 3: 实现页面**

页面调整为：
- 显示账号当前令牌状态
- `复制当前令牌`
- `更换令牌`
- `禁用令牌`
- `启用令牌`
- 查询最近 3 封邮件时直接使用当前有效 token

要求：
- 更换后旧 token 立即失效
- 禁用后查询按钮不可继续成功
- 启用后可再次查询

- [ ] **Step 4: 手动验证并重新跑模型测试**

Run: `node --test src/views/admin-tool/model.test.js`
Expected: PASS

- [ ] **Step 5: 提交本任务**

```bash
git add mail-vue/src/views/admin-tool/index.vue
git commit -m "feat: manage account tokens in admin tool"
```

### Task 6: 公共 `/code` 页对接新 token 逻辑

**Files:**
- Modify: `mail-vue/src/views/code/index.vue`

- [ ] **Step 1: 写出需要保留的行为清单**

确认公共页仍只做：
- 输入 token
- 查询最新验证码
- 显示“令牌失效/被禁用”错误

- [ ] **Step 2: 实现最小调整**

移除任何关于 5 秒重试的提示文案，改为说明：
- token 失效需联系管理员
- 若被更换或禁用将无法访问

- [ ] **Step 3: 本地构建验证**

Run: `npm run build`
Expected: PASS

- [ ] **Step 4: 提交本任务**

```bash
git add mail-vue/src/views/code/index.vue
git commit -m "feat: align public code page with token rotation"
```

## Chunk 3: 最终验证

### Task 7: 全量验证与发布前检查

**Files:**
- Review only

- [ ] **Step 1: 跑后端单测**

Run: `npx vitest run --config vitest.unit.config.mjs src/service/mailbox-token-utils.test.js src/service/mailbox-token-service.test.js src/security/perm-paths.test.js`
Expected: PASS

- [ ] **Step 2: 跑前端单测**

Run: `node --test src/views/admin-tool/model.test.js src/perm/access.test.js`
Expected: PASS

- [ ] **Step 3: 跑前端构建**

Run: `npm run build`
Expected: PASS

- [ ] **Step 4: 检查工作区**

Run: `git status --short`
Expected: 只剩本次相关改动和用户已有未跟踪文件

- [ ] **Step 5: 最终提交**

```bash
git add CHANGELOG.md mail-worker/src/entity/account.js mail-worker/src/init/init.js mail-worker/src/service/mailbox-token-service.js mail-worker/src/service/mailbox-token-utils.js mail-worker/src/service/mailbox-token-utils.test.js mail-worker/src/service/mailbox-token-service.test.js mail-worker/src/api/mailbox-token-api.js mail-worker/src/security/perm-paths.js mail-worker/src/security/perm-paths.test.js mail-vue/src/request/admin-tool.js mail-vue/src/views/admin-tool/model.js mail-vue/src/views/admin-tool/model.test.js mail-vue/src/views/admin-tool/index.vue mail-vue/src/views/code/index.vue
git commit -m "feat: rotate mailbox tokens per account"
git push origin main
```
