# 账号令牌可更换/禁用方案

## 目标

让管理员或超级管理员可以针对单个邮箱账号执行以下操作：

- 生成当前有效令牌
- 更换令牌，并让旧令牌立即失效
- 禁用该账号的令牌访问能力，禁止客户继续访问 `/code`
- 恢复该账号的令牌访问能力

默认前提：

- 同一个邮箱账号在同一时间只保留一个有效令牌
- 客户端仍然通过现有 `/code` 页面输入 token 查询验证码
- 管理端入口仍然在 `/admin-tool`

---

## 当前实现分析

### 当前逻辑

现有 `mailboxToken` 逻辑本质上是：

- 用 `jwt_secret` 对邮箱地址做 AES-GCM 加密，生成 token
- `/code/latest` 收到 token 后只做一件事：解密出邮箱地址
- 只要 token 能解密成邮箱，且该邮箱未被封禁，就允许继续查询邮件

### 当前问题

这套模型有一个核心限制：

- **系统并不知道某个 token 是否“是当前有效 token”**

因为现在校验时只看：

- token 能不能解出来
- 邮箱有没有被整体 ban

所以会出现这几个问题：

1. **无法真正做到“更换令牌”**
   - 重新生成一个新 token 以后，旧 token 仍然能继续解密成功并访问。

2. **无法做到“只禁某一个旧 token”**
   - 现有 ban 维度是邮箱，不是 token。
   - 一旦 ban，所有能解出这个邮箱的 token 都一起失效。

3. **缺少令牌状态**
   - 没有“当前有效版本”
   - 没有“禁用中/启用中”
   - 没有“最后更换时间”
   - 没有“谁执行了更换/禁用”

结论：

- 你现在的“生成令牌”只是**额外发一个新 token**
- 并不是**替换旧 token**

---

## 方案选项

## 方案 A：账号级版本号令牌

### 思路

在 `account` 表上增加令牌状态字段，例如：

- `token_version`
- `token_status`
- `token_rotated_at`
- `token_rotated_by`

生成 token 时，把这些最小必要信息写进 token 载荷：

- `email`
- `accountId`
- `version`
- `issuedAt`

校验 token 时：

1. 先解密出 token 里的账号信息
2. 查 `account` 当前记录
3. 校验：
   - 账号存在
   - 账号未删除
   - `token_status = active`
   - `token.version === account.token_version`

如果管理员点击“更换令牌”：

- `token_version + 1`
- 重新生成新 token
- 旧 token 因为版本号不匹配，立即失效

如果管理员点击“禁用令牌”：

- `token_status = disabled`
- 所有该账号 token 立即不可用

### 优点

- 实现简单，改动集中
- 非常符合“一个账号一个当前有效 token”的业务
- 能立即实现“更换即失效”
- 不需要存储每一条 token 明文或摘要
- 查询性能稳定，校验路径清晰

### 缺点

- 同一个账号不能同时发多个有效 token
- 如果以后要支持“一个账号多个客户/设备同时访问”，扩展性一般

### 适用场景

- 一个邮箱账号只服务一个客户
- 你的目标是“替换旧 token”，而不是“管理一批并行 token”

---

## 方案 B：独立 token 表，按 token 粒度管理

### 思路

新增 `mailbox_token` 表，按“每次签发一个 token”存储记录，例如：

- `token_id`
- `account_id`
- `token_hash`
- `status`
- `issued_at`
- `revoked_at`
- `revoked_by`
- `last_used_at`
- `remark`

生成 token 时：

- 生成随机 token
- 只把 token 摘要存库，不存明文
- 返回明文给管理员复制

校验 token 时：

1. 计算 token hash
2. 查 `mailbox_token`
3. 校验状态是否为 active
4. 再找到对应账号继续查询邮件

如果管理员点击“更换令牌”：

- 新建一条 active token
- 同时把旧 token 标记 revoked

如果管理员点击“禁用令牌访问”：

- 可选：
  - 只 revoke 当前 token
  - revoke 该账号全部 token

### 优点

- 精细度最高
- 真正支持“单独禁某一个 token”
- 支持审计、备注、最近使用时间
- 将来可以扩展为“同账号多 token 并行”

### 缺点

- 实现复杂度最高
- 需要新增表、接口、索引、状态管理
- 前后端都要改得更完整

### 适用场景

- 一个邮箱账号可能同时发给多个客户/设备
- 你以后想做“令牌列表”“历史记录”“按 token 回收”

---

## 方案 C：账号级密钥盐轮换

### 思路

在 `account` 上增加一个 `token_salt` 或 `token_secret_version`。

生成 token 时：

- 不只依赖全局 `jwt_secret`
- 还混入账号自己的 `token_salt`

校验 token 时：

- 查账号当前 `token_salt`
- 用它参与解密/验签

更换令牌时：

- 更新 `token_salt`
- 所有旧 token 因为旧 salt 不匹配而失效

### 优点

- 也能做到“更换即失效”
- 不必维护独立 token 列表

### 缺点

- 实际收益和“版本号方案”接近
- 但加密/解密耦合更重，排查问题更麻烦
- 不如版本号方案直观

### 适用场景

- 非常强调密钥级轮换
- 团队更偏好把撤销能力绑定到密码学材料而不是业务状态

---

## 推荐方案

## 推荐：方案 A

原因很直接：

1. 你的目标是**针对单个账号更换令牌并立即让旧 token 失效**
2. 你没有明确提出“一个账号同时保留多个 token”
3. 现有系统是围绕 `account.email` 运转的，最自然的承载点就是 `account` 表
4. 方案 A 的迁移成本、开发成本、运维成本都最低

一句话概括：

- **如果你要的是“账号级令牌替换/禁用”，选 A**
- **如果你要的是“token 资产管理平台”，选 B**

---

## 推荐方案的详细设计

## 1. 数据模型

建议在 `account` 表增加以下字段：

```sql
ALTER TABLE account ADD COLUMN token_version INTEGER NOT NULL DEFAULT 1;
ALTER TABLE account ADD COLUMN token_status INTEGER NOT NULL DEFAULT 0;
ALTER TABLE account ADD COLUMN token_rotated_at TEXT;
ALTER TABLE account ADD COLUMN token_rotated_by INTEGER;
```

状态约定建议：

- `0 = active`
- `1 = disabled`

字段说明：

- `token_version`：当前有效令牌版本号
- `token_status`：当前账号令牌是否可用
- `token_rotated_at`：最后一次更换时间
- `token_rotated_by`：最后一次更换/禁用操作者

---

## 2. token 载荷

不要再只加密邮箱字符串，建议改为加密一个 JSON 载荷：

```json
{
  "accountId": 123,
  "email": "demo@yx909.indevs.in",
  "version": 3,
  "issuedAt": "2026-03-17T20:00:00Z"
}
```

这样做的意义：

- 能直接绑定账号 ID
- 能校验当前版本
- 后续更容易扩展过期时间、来源等字段

---

## 3. 校验流程

`/code/latest` 和 `/mailboxToken/recent` 的校验统一改成：

1. 解密 token，拿到 `accountId/email/version`
2. 查询 `account`
3. 校验账号存在且未删除
4. 校验 `token_status = active`
5. 校验 `token.version === account.token_version`
6. 校验通过后再按账号邮箱查邮件

失败时建议区分错误：

- token 格式无效
- token 已失效，请联系管理员获取新令牌
- 该账号令牌已被禁用

这样客户和管理员都更容易定位问题。

---

## 4. 管理端操作设计

`/admin-tool` 页面建议从“生成令牌”升级为“令牌管理”。

### 对单个账号显示

- 邮箱
- 当前状态：启用 / 已禁用
- 当前版本号
- 最后更换时间
- 最后操作人

### 操作按钮

- `复制当前令牌`
- `更换令牌`
- `禁用令牌`
- `启用令牌`

### 交互规则

- 点击 `更换令牌`
  - 弹确认框：`更换后旧令牌将立即失效`
  - 成功后返回新 token 并自动复制

- 点击 `禁用令牌`
  - 该账号所有 token 立即不可用

- 点击 `启用令牌`
  - 建议只恢复可用状态，不自动换版本
  - 如果业务想更严格，也可以“启用时强制换新 token”

我更推荐：

- **禁用后重新启用时，默认顺带换一次版本并重新发 token**

这样更安全，避免旧 token 在“禁用前已泄露”的情况下重新恢复可用。

---

## 5. 权限设计

建议继续沿用当前权限模型，但细分操作能力：

- `mailboxToken:generate`
- `mailboxToken:rotate`
- `mailboxToken:disable`

权限建议：

- 超级管理员：全部允许
- 普通管理员：
  - 至少需要 `mailboxToken:generate`
  - 若要“更换/禁用”，再要求 `mailboxToken:rotate` 或 `mailboxToken:disable`

如果你不想新增过多权限项，也可以先简化为：

- 只要有 `mailboxToken:generate`，就允许查看、生成、更换、禁用

这是更快上线的版本。

---

## 6. 接口设计建议

建议新增以下接口：

- `POST /mailboxToken/current`
  - 查询账号当前令牌状态

- `POST /mailboxToken/rotate`
  - 更换账号令牌
  - 返回新 token

- `POST /mailboxToken/disable`
  - 禁用账号令牌

- `POST /mailboxToken/enable`
  - 启用账号令牌
  - 可选：是否同时自动换新 token

现有接口建议调整：

- `POST /mailboxToken/generate`
  - 如果保留，语义建议改成：
    - “获取当前有效令牌”
    - 而不是“无状态生成一个新 token”

否则名称会继续误导。

---

## 7. 兼容与迁移

### 兼容策略

这是这次改造最关键的决策点。

### 兼容方案 1：直接失效旧 token

上线后：

- 所有旧 token 因为没有 `version/accountId` 载荷，统一判定失效
- 管理员需要重新给客户发新 token

优点：

- 逻辑最干净
- 代码最简单

缺点：

- 上线瞬间会影响所有存量客户

### 兼容方案 2：过渡期兼容旧 token

校验时：

- 如果是新格式 token，走新逻辑
- 如果是旧格式 token，允许一段过渡时间继续使用

优点：

- 平滑迁移

缺点：

- 代码和状态判断会更复杂
- 在过渡期内，“旧 token 无法被精准撤销”的问题仍然存在

### 推荐

如果你控制的客户量不大，推荐：

- **直接失效旧 token**
- 在管理端提供“批量重新生成并复制”的辅助能力

因为这能最快进入真正可控的令牌体系。

---

## 8. 风险点

1. **“更换令牌”与“获取当前令牌”语义必须分开**
   - 否则管理员会误触发版本变更。

2. **账号删除/恢复时要同步考虑 token 状态**
   - 已删除账号不能继续通过 token 查询。

3. **启用/禁用操作必须写审计**
   - 至少记录操作者、账号、时间、动作。

4. **公共 `/code` 错误文案要升级**
   - 让客户知道是“令牌失效”而不是“系统坏了”。

---

## 9. 最小可行落地范围

如果你想先快速上线，建议第一期只做：

1. `account` 表增加 `token_version` 和 `token_status`
2. token 载荷改为 `accountId + email + version`
3. 新增 `更换令牌`
4. 新增 `禁用令牌`
5. `/code/latest` 与 `/mailboxToken/recent` 按版本和状态校验
6. `/admin-tool` 展示状态并支持操作

先不要做：

- token 历史列表
- 最近使用时间
- 单 token 级审计
- 多 token 并行

这样范围最稳，最符合你当前需求。

---

## 结论

你的需求本质上不是“再生成一个 token”，而是：

- **把 token 变成一个可控的账号级访问凭证**

因此最合理的改造是：

- 把 token 与 `account` 状态绑定
- 给账号增加“版本号 + 启用状态”
- 管理端提供“更换/禁用/启用”
- 公共查询端按账号当前状态校验

最终推荐：

- **采用方案 A：账号级版本号令牌**

它最贴合你现在的业务，也最容易在当前代码结构中落地。
