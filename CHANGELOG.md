# 更新日志

## 2026-03-17

### 新增功能

#### 令牌工具页面（管理员专属）

新增 `/admin-tool` 路由页面，为管理员提供以下能力：

- **子账号注册**：输入邮箱前缀，后缀固定为 `@yx909.indevs.in`，一键注册子邮箱。注册成功后子账号挂在当前管理员名下，登录后可在收件箱侧边栏直接看到。
- **令牌生成**：输入邮箱前缀，调用 `/mailboxToken/generate` 接口生成 AES 加密令牌，生成后自动复制到剪贴板。
- **验证码查看**：基于已生成的令牌调用 `/code/latest` 接口，自动提取最新一封邮件中的验证码（支持4~8位数字），提取成功后自动复制到剪贴板并显示来源邮箱、主题、接收时间。

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

---

### 体验优化

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
| `mail-vue/src/request/admin-tool.js` | 新增 | 令牌生成、验证码查询、子账号注册三个请求函数 |
| `mail-vue/src/views/admin-tool/index.vue` | 新增 | 令牌工具页面组件 |
| `mail-vue/src/router/index.js` | 修改 | 注册 `/admin-tool` 路由 |
| `mail-vue/src/layout/aside/index.vue` | 修改 | 系统设置改为超管专属；令牌工具根据权限+开关双重控制显示；新增 `isAdmin`、`showAdminTool` 计算属性 |
| `mail-vue/src/views/sys-setting/index.vue` | 修改 | 网站设置卡片新增令牌工具开关 |
| `mail-vue/src/views/login/index.vue` | 修改 | 账号输入框加 Tab 跳转密码框功能 |
