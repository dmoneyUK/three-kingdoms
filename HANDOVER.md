# HANDOVER — 当前唯一任务：§10.59 UNIVERSAL-H4-COMMITTED-FACT-COVERAGE-01

**整体状态：NOT CLOSED；Owner 尚未统一进行 iPhone 验收。** 最近复习设计：`docs/UX2-refine.md` revision `2026-11-16 09:42 UTC`。有界阶段属于同一个 §10.59；所有来源覆盖、单一 H4 展示及系统回归完成前，不交独立阶段验收。

## 已部署证据

- `4f3ddce6f9bfdc3877273435b08e99ab463f2edb`：恢复结果 H4；精确 SHA Actions [43866484287](https://github.com/dmoneyUK/three-kingdoms/actions/runs/43866484287) 全绿，Worker `8c452d7f-ade3-405c-8057-907b6a529c0d` 部署及 production smoke 成功。先前恢复断言读取了错误的字段；权威路径是 `recoveryFact.identity.interactionId`。
- `e96ad960e11fa437f4ad9908ede0c23e54c1c182`：普通抽牌和周瑜英姿实际摸牌数的共享 H4 断言；精确 SHA Actions [43868046409](https://github.com/dmoneyUK/three-kingdoms/actions/runs/43868046409) 全绿，Worker `15088362-95c1-4f5c-a0b4-062f9d7023d1` 部署及 smoke 成功。

## 当前阶段：Dying 击败 Rebel 后的奖励摸牌

`0aa83d1eeff431468c489270aeee4240d6f83206` 已推送；精确 SHA Actions [43872766294](https://github.com/dmoneyUK/three-kingdoms/actions/runs/43872766294) 的 lint/fast、build、browser startup/room smoke 通过，API 失败、部署未运行。API 结果确认原始公开奖励事实本身没有提交，不只是快照漏投影。

已定位原因：参与者给桃后若目标仍濒死，普通 Dying 续接会清除因果信封；最终奖励无法获得原交互身份，因此未被写为公开提交事实。当前未提交修复让 Dying 续接保留原 `rootEventId` 和因果信封，并让同一信封下的公开恢复事实复用已验证的服务端根引用。现有回归区分原始提交事件和最终共享快照，并验证奖励仍链接原 Attack 根；无本地测试、构建或设备测试。`git diff --check` 通过。

**续接点：** 核对并提交此同任务修复，推送后验证精确 SHA CI；全绿才进行部署和生产 smoke。继续补齐 §10.59 其余指定来源、通用事件保留/筛选、唯一 H4 消费及系统回归；完成前保持 NOT CLOSED。
