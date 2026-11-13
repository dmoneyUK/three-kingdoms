# HANDOVER — 当前唯一任务

## PUBLIC-CARDFACE-STABLE-CENTRE-01 / §10.45

状态：IMPLEMENTED / DEPLOYED — PENDING OWNER iPHONE REVIEW；不得标记用户接受。已复习最新设计 `2ca7c5db`；代码 `2612e9308fd6bf2f308861a9490916b791be3f4e` 已推送，精确 SHA 的 Actions `43490834638` 全部通过并成功部署。Worker `ddf4c342-8594-444b-96e9-fb38443d75e0`，生产 `/api/health` 返回 ok。

同一真实上排缩略牌锚点供通用 H4 和共享展示使用；按真实字体测量最长 H4 所需高度，为公共牌锁定稳定中央位置。反间保留原直线动画，装备使用相同 90×135 移动端比例并到达真实槽，反馈共享牌池位于 H4 下方。

验证：46 项相关单元测试、构建、目标 lint 和最终 Attack/Dodge 手机回归通过；真实 440×766 反间→反馈面板、装备原牌到槽通过。实测 H4 顶约 150.16px，反间牌 top≈224.59px、装备牌 top=224.75px；Attack 440 手机牌 top=224.75px。早期连续切换 viewport 时两次出现定位状态竞争，安全重排后最终回归通过；浏览器测试累计低于 5 分钟。用户需在真实 iPhone 检查 H4、牌面、反馈面板及切换视角；未声称用户通过。
