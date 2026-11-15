# HANDOVER — 当前唯一任务

## §10.50 CAO-CAO-ENTOURAGE-PUBLIC-LIFECYCLE-01

状态：A→B 实现已推送 740f2a6476612e22da7892711ab4e52fd7bc886f；CI 两项旧文案断言失败、部署跳过，正在修正回归期望。PENDING OWNER iPHONE REVIEW。
设计：2048cce1 的 §10.50。用户明确同意合并最终交付，取消 A 中间部署。

实现：原子提交一次护驾 SKILL_USED 证明；持久化已验证调用与当前魏势力 helper，投影独立 current-helper/实体 Dodge 证明，保留原 Attack/root/曹操 resolver；拒绝错误根、人物、阵营、物理牌与重复证明。按真实提交显示调用/拒绝/Dodge H4，PAC 指向当前 helper，私有提示受当前 viewer/CurrentAction 约束；实体 Dodge 只展示一次并停在付款 helper，parked 后同一 H4 显示真实 block；沿用既有转换证明和布局。

验证：
- 现有及新增聚焦 unit/model 55/55 通过；Worker/D1 judgement API 14/14 通过（最终源码，约 7.5s），含真实 Dodge、卡牌唯一消耗、helper 依次拒绝返回曹操、跨 viewer 同公共投影。
- 单一 440×766 四人真实 browser 场景：首次脚本点击目标与 SWITCH 区冲突，90s 超时；修正正常点击位置、补齐护驾 Confirm 后同一场景 11s 通过。两次总运行小于五分钟；无额外 UI 测试。覆盖实际 PAC/H4、私有提示、TEST SWITCH、真实 helper Dodge、停车作者及 block 结果。
- build、diff 检查通过。定向 ESLint（除 page）通过；本地 page rules-of-hooks 栈溢出，使用未改的 HEAD 源码 stdin 复核也同样溢出，属于本地基线工具限制，保留原规则交由正常 CI 验证；未关闭任何规则。全仓 tsc 存在既有类型错误，不作为通过声明。

恢复点：仅提交本任务源码、聚焦回归和本 HANDOVER，推送 ux-v2，等待精确 SHA 正常 Actions/部署/production smoke，记录实际结果。所有 UI 仍需 OWNER iPHONE REVIEW，不能标记 USER-ACCEPTED。

CI 检查点：run 43655785082 的 lint/fast 与 browser smoke 成功；API 仅 privacy-response 的两项旧 asks/decline 文案断言失败。按批准文案改为 exact asked/Skip，保留合法动作与隐私断言；无生产代码变化。
