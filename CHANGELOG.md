# 更新日志

## 2026-03-17

### 新增功能

#### 令牌工具页面（管理员专属）

新增 `/admin-tool` 路由页面，为管理员提供以下能力：

- **子账号注册**：输入邮箱前缀，后缀固定为 `@yx909.indevs.in`，一键注册子邮箱。注册成功后子账号挂在当前管理员名下，登录后可在收件箱侧边栏直接看到。
- **令牌生成**：输入邮箱前缀，调用 `/mailboxToken/generate` 接口生成 AES 加密令牌，生成后自动复制到剪贴板。
- **最近邮件核对**：基于已生成的令牌调用 `/mailboxToken/recent` 接口，直接查看最近 3 封完整邮件内容，并自动识别每封邮件中的验证码，支持一键复制与人工核对。
- **验证码查询**：`/code/latest` 仍保留轻量查询能力，用于对外快速获取最近一封命中验证码的邮件结果。

#### 系统设置新增开关

系统设置页「网站设置」卡片新增「令牌工具（管理员）」开关：

- 开关**开启**时：具有管理员权限的用户可以在侧边栏看到「令牌工具」入口。
- 开关**关闭**时：仅超级管理员可见「令牌工具」，普通管理员不显示。
- 超级管理员无论开关状态如何，始终可以访问令牌工具。

---

### 权限优化

#### 系统设置入口仅对超级管理员开放

侧边栏「系统设置」菜单项由原来基于 RBAC 权限（`setting:query`）控制，改为仅超级管理员（`permKeys` 包含 `*`）可见。普通管理员登录后侧边栏不再显示「系统设置」入口。

#### 令牌工具权限控制逻辑

| 角色 | 权限 |
|------|------|
| 超级管理员 | 始终显示令牌工具，不受开关影响 |
| 普通管理员 | 需具有 `mailboxToken:generate` 或 `account:add` 权限，且系统设置中开关为开启状态才显示 |
| 普通用户 | 永不显示 |

#### 令牌查询接口权限补全

- `/mailboxToken/recent` 已纳入权限校验，与 `/mailboxToken/generate` 一样要求 `mailboxToken:generate` 或超级管理员权限。
- 前端路由与侧边栏权限判断保持一致，避免“菜单隐藏但仍可直达页面”的问题。

---

### 体验优化

#### 令牌工具改为嵌入主布局

- 点击「令牌工具」后，不再跳转到脱离后台框架的独立页面。
- 页面改为和系统管理一样，作为主布局中的内容页显示。

#### 单输入框操作流

- 子账号注册、令牌生成、最近邮件查询共用一个邮箱前缀输入框。
- 减少重复输入，便于管理员连续完成“注册 -> 生成令牌 -> 核对邮件”操作。

#### 最近 3 封邮件核对视图

- 左侧显示最近 3 封邮件列表，右侧显示当前选中邮件的完整正文。
- 每封邮件都会自动提取 4 到 8 位数字验证码，并提供复制按钮，方便人工核对。

#### 公共验证码页可用性优化

- `/code` 页面输入说明更明确，复制验证码改为独立按钮。
- 查询限流从 **30 秒** 调整为 **5 秒**，降低 OTP 高频操作时的等待成本。
- 错误提示更清晰，便于用户区分空密钥、请求过快与网络异常。

#### 登录页 Tab 键焦点跳转

登录页账号输入框按下 `Tab` 键时，焦点自动跳转到密码输入框，无需鼠标点击切换，提升键盘操作效率。

---

### 数据库变更

`setting` 表新增字段，部署后需在 Cloudflare D1 执行以下迁移语句：

```sql
ALTER TABLE setting ADD COLUMN admin_tool_switch INTEGER NOT NULL DEFAULT 1;
```

> 默认值 `1` 表示关闭（与项目现有开关约定一致：`0` = 开启，`1` = 关闭）。

---

### 涉及文件清单

| 文件路径 | 变更类型 | 说明 |
|---------|---------|------|
| `mail-worker/src/entity/setting.js` | 修改 | 新增 `adminToolSwitch` 字段定义 |
| `mail-worker/src/service/setting-service.js` | 修改 | `websiteConfig` 方法新增 `adminToolSwitch` 下发 |
| `mail-worker/src/service/mailbox-token-service.js` | 修改 | 令牌查询限流调整为 5 秒，并新增最近邮件查询能力 |
| `mail-worker/src/service/mailbox-token-utils.js` | 新增 | 验证码提取、最近邮件映射、最近有效验证码查找等工具函数 |
| `mail-worker/src/api/mailbox-token-api.js` | 修改 | 新增 `/mailboxToken/recent` 接口 |
| `mail-worker/src/security/perm-paths.js` | 修改 | 新增 `/mailboxToken/recent` 权限映射 |
| `mail-vue/src/request/admin-tool.js` | 修改 | 增加最近邮件查询请求函数 |
| `mail-vue/src/views/admin-tool/index.vue` | 修改 | 令牌工具改为单输入框和最近 3 封邮件核对视图 |
| `mail-vue/src/views/admin-tool/model.js` | 新增 | 令牌工具邮箱、令牌复用与选中邮件逻辑封装 |
| `mail-vue/src/router/index.js` | 修改 | 将 `/admin-tool` 调整为主布局子路由 |
| `mail-vue/src/layout/main/index.vue` | 修改 | 令牌工具页纳入 `keep-alive` |
| `mail-vue/src/views/code/index.vue` | 修改 | 优化输入说明、复制操作与错误反馈 |
| `mail-vue/src/layout/aside/index.vue` | 修改 | 系统设置改为超管专属；令牌工具根据权限加开关控制显示 |
| `mail-vue/src/views/sys-setting/index.vue` | 修改 | 网站设置卡片新增令牌工具开关 |
| `mail-vue/src/views/login/index.vue` | 修改 | 账号输入框加 Tab 跳转密码框功能 |
