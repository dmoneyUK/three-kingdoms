# HANDOVER — 当前唯一任务：§10.59 UNIVERSAL-H4-COMMITTED-FACT-COVERAGE-01

**状态：NOT CLOSED。** 不把有界代码阶段拆成验收任务；继续完成全部服务器结果来源、公共事实投影/保留、单一 H4 所有权及系统级回归后，再交 Owner 做一次最终 iPhone 验收。最新设计：`docs/UX2-refine.md` §10.59，revision `2026-11-16 09:42 UTC`。

## 最近已验证并部署的同任务切片

- SHA `bd4459008bad62f720adb4226ebc1fd23a5cc4bc`：增加普通摸牌、华佗、孙尚香、黄盖及濒死桃救结果的共同 H4 文案/事件身份/唯一 surface API 断言。救援通过 timeline `event.id` 定位，再从 `fact.identity.interactionId` 读取因果身份。
- 精确 SHA GitHub Actions [43888535445](https://github.com/dmoneyUK/three-kingdoms/actions/runs/43888535445) 最终成功。首次 API shard 遇到 Worker harness `fetch failed`；同一 run 的失败作业重跑通过。API、Lint/fast、Build、Browser startup smoke、D1 migration、Worker deploy 和 production smoke 均为成功。
- Worker Version ID：`d73f7e71-7ce8-4481-aae7-b185a3e02d17`。本地未运行测试、build 或设备测试，遵循 Owner 指令。

## 当前已提交、等待远端验证的进展

- 修复 H4 队列在跨 resolution 合并时丢失已验证事实的问题；消息事实按 `publicSequence` 排队读取，展示游标不提前跳到未来事件。
- 活跃队列事实暂时优先于更新的 discard 公告，避免被抢占；有效 H4 阅读队列不禁用合法游戏操作。新增队列顺序、跨 resolution 保留、游标回退、单一 owner 与非阻塞纯逻辑断言。
- 队列切片 SHA `835a54f6558dfb0daa94b42f3d0f1b2598b3d38e` 的 Actions [43893415420](https://github.com/dmoneyUK/three-kingdoms/actions/runs/43893415420) 因一条匹配旧源码表达式的静态断言失败，部署被跳过；已在 `bccd8c27aa22dad3d6efceb29ba3e4c967965bc9` 修正断言，使它分别锁定共享 H4 非阻塞规则和装备到达豁免。精确 Actions [43894424785](https://github.com/dmoneyUK/three-kingdoms/actions/runs/43894424785) 的 lint/fast、API、browser smoke、D1 migration、Worker deploy、production smoke 全部成功。Worker Version ID：`dfe2462c-d8bc-4de8-b48f-2447108090f1`。按 Owner 指令没有运行本地测试/build/设备测试。

## 唯一续接点

共享事实与队列切片已完成远端部署。下一有界实现阶段是在现有 Diao Chan Duel API 回归中验证真实 HP 损失从服务端事实、公开投影到通用 H4 formatter/唯一 owner，并确认观察者看到相同结果；随后继续补齐剩余服务端来源与跨路径类别/唯一 owner 系统回归。整个过程仍是同一项未关闭任务，不请求阶段验收、不转做其他任务、不宣布 Owner 接受。
