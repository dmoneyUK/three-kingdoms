# HANDOVER — 当前唯一任务

## RETALIATION-SHARED-TARGET-CARD-POOL-01 / §10.46

状态：进行中，NOT ACCEPTED；复习设计 2026-11-13 12:29 UTC，基于 `262294a52b0e60b468737cc917fd8116f396a919`。按用户既有“需要决策时标注并跳过”的指示，§10.45 的尺寸冲突已记入设计文档，暂跳过；不改动已验收的 §10.42。

目标：用已有 `BattlefieldChoiceStage` 和 `CardPoolPanel` 展示司马懿反馈的服务端授权目标牌，保留现有触发、获得牌和 Skip 权限；禁止公开隐藏手牌。尚未修改实现或执行本任务测试。

实现进展：已将授权的 `sima_yi_fankui` 选牌切换到共享 `BattlefieldChoiceStage` / `CardPoolPanel`，使用服务端 eligibleKeys、隐藏手牌占位、公开装备/判定牌和原 trigger/decline 接口；新增通用可选次要操作按钮。原目标不匹配时保留原安全路径。构建通过；目标 lint 0 errors / 2 warnings，12 项相关 Worker/D1 API 测试通过。440×844 真实伤害→反馈→选择武器→服务器取得同一武器的手机浏览器场景通过（5.5 秒），可见 Skip、隐藏手牌 ID 不出现。首次尝试复用既有跨技能测试，在进入牌池前因旧 effect-notice 不可见失败；单独聚焦场景第一次因内外 region 同名导致定位歧义失败，限定外层后通过；未更改旧测试对公告的断言。尚未验证 Skip 实际点击或跨玩家手机切换，待用户手机复核。
