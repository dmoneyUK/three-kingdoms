# HANDOVER — 当前唯一任务

## 五谷丰登 H4 / PAC 文案核对

状态：已完成诊断，发现不符合设计；未修改游戏代码，未声称验收。依据远端设计 `5c00b58814639eef9ef77cb6c5e1482b8bff982b` §10.25.2，应用代码与已部署 `2612e9308fd6bf2f308861a9490916b791be3f4e` 一致（其后远端仅文档提交）。使用本地真实 Worker/D1、440×766、四人服务端身份、一个浏览器视角；测试能力仅用于保持/提交真实无懈响应，未操作线上游戏。

根牌阶段 47 次约 100ms 采样：H4 可见 0 次；前 20 次 PAC 显示玩家回合，此后 PAC 和 H4 均 hidden，布局状态分别 `pending-shared-stage-layout`、`awaiting-current-shared-stage-layout`。首次无懈提交后，H4 显示 `PLAYER 2 played Negation to counter Bumper Harvest's effect on PLAYER 1`，未明确已阻止该玩家选牌；PAC 仍 hidden，其 DOM 文案为 `Waiting for counter responses / Another Negation can restore the Bumper Harvest effect on PLAYER 1.`。真实反制后 H4 显示 `PLAYER 3 played Negation to counter Negation 1`，缺少前一个玩家和选牌已恢复；PAC 仍 hidden，其 DOM 文案泛指 `Negation can cancel the Bumper Harvest effect on PLAYER 1.`。各结果与 §10.25.2 的 H4 已提交事实/PAC 当前单人选牌可能性模板不一致；布局状态是可观察证据，具体根因尚未完成诊断。

首次可见性断言失败；后续诊断采样正常结束，仅记录事实，不等于设计断言通过。共约 45 秒手机浏览器时间，未超五分钟；日志 `/tmp/wtk-harvest-copy-diag4.log`。删除本次临时测试文件，未改动产品实现。继续之前应根据用户指示处理发现的问题。

## 根因分析（2026-11-13）

代码确认：H4 与 PAC 均在匹配到当前公共卡牌的共享布局候选、但尚无可用已提交布局时被显式隐藏；H4 已经可见时只有通过上方重新测量和碰撞检查才可暂时保留。布局提供者同时要求匹配的实体卡、唯一 H4、PAC 和可测操作区，再计算包含座位、选牌池等障碍的联合布局。现有采样未记录布局提供者的 failure 数据，不能断言具体是哪个障碍碰撞、缺失测量还是布局代际不匹配；需有对应实时数据才能确定。

文案确认：PAC 的公共无懈分支调用通用 `publicNegationEffectCopy`，模板描述对卡牌 effect 的 cancel/restore，而非 §10.25.2 规定的当前玩家 pick；已证实的五谷进度另在页面中经过验证，但该模板不使用它。H4 路径会优先尝试基于公开事实的通用 narration；当 narration 不能取得或不接管时，当前卡牌 `ariaLabel` 回退为 `counter ... effect` 或 `counter Negation N`，与本次观察一致。现有采样不足以确认该次 narration 哪项证明或所有权条件未满足，不得猜测。未增加浏览器测试，未修改产品代码；要修复须分别处理共享布局可用性和经证明的五谷选牌语义，保持服务端权威与隐私。
