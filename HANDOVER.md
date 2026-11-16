# HANDOVER — 当前唯一任务：§10.59 UNIVERSAL-H4-COMMITTED-FACT-COVERAGE-01

**状态：NOT CLOSED。** 不把有界代码阶段拆成验收任务；继续完成全部服务器结果来源、公共事实投影/保留、单一 H4 所有权及系统级回归后，再交 Owner 做一次最终 iPhone 验收。最新设计：`docs/UX2-refine.md` §10.59，revision `2026-11-16 09:42 UTC`。

## 最近已验证并部署的同任务切片

- SHA `bd4459008bad62f720adb4226ebc1fd23a5cc4bc`：增加普通摸牌、华佗、孙尚香、黄盖及濒死桃救结果的共同 H4 文案/事件身份/唯一 surface API 断言。救援通过 timeline `event.id` 定位，再从 `fact.identity.interactionId` 读取因果身份。
- 精确 SHA GitHub Actions [43888535445](https://github.com/dmoneyUK/three-kingdoms/actions/runs/43888535445) 最终成功。首次 API shard 遇到 Worker harness `fetch failed`；同一 run 的失败作业重跑通过。API、Lint/fast、Build、Browser startup smoke、D1 migration、Worker deploy 和 production smoke 均为成功。
- Worker Version ID：`d73f7e71-7ce8-4481-aae7-b185a3e02d17`。本地未运行测试、build 或设备测试，遵循 Owner 指令。

## 当前已提交、等待远端验证的进展

- 修复 H4 队列在跨 resolution 合并时丢失已验证事实的问题；消息事实按 `publicSequence` 排队读取，展示游标不提前跳到未来事件。
- 活跃队列事实暂时优先于更新的 discard 公告，避免被抢占；有效 H4 阅读队列不禁用合法游戏操作。新增队列顺序、跨 resolution 保留、游标回退、单一 owner 与非阻塞纯逻辑断言。
- 以上修改已形成当前本地提交，准备推送至 `ux-v2`。`git diff --check` 通过；按要求没有运行本地测试或构建。该切片尚无精确 SHA 的远端 CI、部署或生产 smoke 结果。

## 唯一续接点

推送当前 H4 队列切片并等待精确 SHA CI、D1/Worker 部署和生产 smoke；随后继续 §10.59 中尚未覆盖的服务器结算来源和系统级回归，不请求阶段验收、不转做其他任务、不宣布 Owner 接受。
