# 邮箱令牌功能 — 变更说明

## 方案变更

从 **数据库Hash方案** 切换为 **AES加密方案**。

- 旧方案：为每个邮箱生成随机令牌，存储SHA-256 hash到 `mailbox_api_token` 表
- 新方案：使用 AES-GCM 直接加密邮箱地址生成令牌，解密即可还原邮箱，无需数据库

## 文件变更清单

### 重写

| 文件 | 说明 |
|------|------|
| `mail-worker/src/service/mailbox-token-service.js` | 移除DB相关逻辑，改用AES-GCM加解密；新增速率限制、IP封禁、令牌黑名单功能 |
| `mail-worker/src/api/mailbox-token-api.js` | 接口从 `reset` 改为 `generate/ban/unban` 三个管理接口 |

### 修改

| 文件 | 说明 |
|------|------|
| `mail-worker/src/const/kv-const.js` | 新增4个KV常量：`TOKEN_BAN`、`CODE_RATE_LIMIT`、`CODE_IP_BAN`、`CODE_IP_FAIL` |
| `mail-worker/src/security/security.js` | `requirePerms` 中将 `/mailboxToken/reset` 替换为 `/mailboxToken/generate`、`/mailboxToken/ban`、`/mailboxToken/unban` |
| `mail-worker/src/init/init.js` | 移除 `v2_8DB` 方法及其调用（不再需要 `mailbox_api_token` 表） |

### 删除

| 文件 | 说明 |
|------|------|
| `mail-worker/src/entity/mailbox-token.js` | 不再需要数据库实体定义 |

### 未改动

| 文件 | 说明 |
|------|------|
| `mail-vue/src/views/code/index.vue` | 前端验证码查询页面，无需改动 |
| `mail-vue/src/router/index.js` | `/code` 路由及免登录放行，无需改动 |
| `mail-worker/src/hono/webs.js` | API注册入口，无需改动 |

## 新增接口

| 接口 | 方法 | 权限 | 说明 |
|------|------|------|------|
| `/code/latest` | POST | 无需登录 | 通过令牌获取最近10分钟验证码 |
| `/mailboxToken/generate` | POST | 仅超级管理员 | 为指定邮箱生成令牌 |
| `/mailboxToken/ban` | POST | 仅超级管理员 | 禁用指定邮箱的令牌 |
| `/mailboxToken/unban` | POST | 仅超级管理员 | 解除指定邮箱的令牌禁用 |

## 安全机制

### 速率限制（KV实现，自动过期）

| 机制 | 规则 | KV Key | TTL |
|------|------|--------|-----|
| 令牌冷却 | 同一邮箱30秒内只能查询一次 | `code_limit:{email}` | 30秒 |
| IP错误计数 | 记录连续错误令牌次数 | `code_ip_fail:{ip}` | 30分钟 |
| IP封禁 | 连续4次错误令牌，封禁IP | `code_ip_ban:{ip}` | 30分钟 |
| 令牌黑名单 | 管理员手动禁用某个邮箱的令牌 | `token_ban:{email}` | 永久（手动解除） |

### 请求处理流程

```
请求 /code/latest
  → 检查IP是否被封禁
  → AES-GCM解密令牌
    → 解密失败：IP错误计数+1，>=4次则封禁IP 30分钟
    → 解密成功：清除该IP的错误计数
  → 检查邮箱是否在黑名单
  → 检查30秒冷却
  → 查询最近20封收件，筛选10分钟内含验证码的邮件
  → 返回结果
```

## 加密说明

- 算法：AES-256-GCM（Web Crypto API）
- 密钥：由 `jwt_secret` 经 SHA-256 派生
- 令牌结构：`hex(12字节IV + 密文 + 16字节认证标签)`
- 每次生成的令牌不同（随机IV），但都能解密回同一邮箱
- AES-GCM自带认证，篡改令牌会导致解密失败

## 权限说明

`/mailboxToken/generate`、`/mailboxToken/ban`、`/mailboxToken/unban` 在 `requirePerms` 中但未配置 `premKey` 映射，因此只有超级管理员（`env.admin`）可以访问。如需开放给其他管理员角色，需在 `premKey` 中添加权限映射并在数据库 `perm` 表中添加对应权限条目。
