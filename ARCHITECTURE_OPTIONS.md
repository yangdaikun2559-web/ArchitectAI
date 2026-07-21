# ArchitectAI 架构方案探索与比较

## 1. 当前系统画像

ArchitectAI 目前是一个面向物联网教学、课件演示和项目生成的 `React + Vite + Express` 应用。它已经具备比较完整的演示链路：需求输入、提示词优化、AI 生成固件工程、接线关系、BOM、代码预览、下载、课堂管理、学习提交和教师反馈。

当前主要结构如下：

```text
前端 React
  src/App.tsx
  src/components/*
  src/lib/api.ts
  src/lib/{ragEngine,pinAllocator,hardwareLinter,componentResolver,codeSync}.ts

后端 Express
  server.ts

本地数据
  data/*.json
  parts/*.json
  data/templates/stm32/*

构建与部署
  Vite + esbuild
  Dockerfile / render.yaml / 腾讯云部署说明
```

从代码看，当前后端接口已经覆盖：

- 公共硬件查询：`/api/components`、`/api/mcus`
- AI 生成：`/api/optimize-prompt`、`/api/generate-project`
- 课堂管理：教师班级、学生加入、成员、提交、反馈、学习画像
- 本地认证：注册、登录、基于 `x-user-id` 的用户识别
- 项目管理：项目列表、保存、删除
- 管理后台：MCU、元器件、用户管理

当前数据文件中，`data/projects.json` 已接近 40MB，说明项目结果和生成产物已经成为主要存储压力点。

## 2. 关键压力点

### 2.1 后端单文件过重

`server.ts` 同时承担了：

- Express 启动和中间件
- 本地 JSON 数据库读写
- 认证和权限判断
- 课堂业务
- 项目业务
- 硬件库业务
- AI 调用和提示词编排
- RAG 检索
- Keil / PlatformIO 工程后处理
- 学习提交 AI 评价和画像生成
- Vite 开发服务挂载

这对演示很高效，但后续维护风险会快速上升：任何小改动都容易影响不相关业务。

### 2.2 前端顶层编排集中

`src/App.tsx` 承担了主流程状态、生成流程、项目预览、历史、课堂、下载中心、管理员入口等顶层编排。随着课堂功能和生成流程继续增加，`App.tsx` 会变成前端的第二个“大中枢”。

### 2.3 JSON 文件数据层已经到边界

本地 JSON 数据适合早期开发和参赛演示，但它存在天然限制：

- 缺少并发写入保护
- 缺少索引
- 大文件读写性能差
- 不适合做权限隔离和历史迁移
- 生成产物长期堆积后容易拖慢项目列表、保存和部署

### 2.4 AI 生成是长耗时流程

`/api/generate-project` 是典型的长请求：组件解析、RAG、引脚分配、模型生成、结果修复、硬件校验、工程文件拼装。现在前端用模拟日志补足体验，但后端实际仍是“一次 HTTP 请求等到底”。

### 2.5 认证适合演示，不适合真实多用户

当前本地认证依赖 `localStorage` 中的用户信息和请求头 `x-user-id`。这对本机演示很方便，但真实课堂环境至少需要服务端会话、JWT、Cookie session 或接入成熟身份服务。

## 3. 架构目标拆分

不同目标对应不同的最优架构，建议先把目标分成三层：

| 目标 | 关注点 | 架构偏好 |
| --- | --- | --- |
| 参赛演示 | 稳定、可控、改动小、10 分钟流程不翻车 | 保守加固 |
| 校内试用 | 班级、学生提交、教师反馈、长期保存 | 模块化单体 + 正规数据层 |
| 产品化 | 多学校、多租户、异步生成、扩容、监控 | 任务流水线，后续再服务拆分 |

## 4. 方案一：保留当前单体，做演示级加固

### 结构

继续使用：

```text
React + Vite + Express + JSON files
```

只做低风险整理：

- 修复乱码文案、演示数据和默认项目内容
- 给生成接口增加更清晰的错误兜底
- 给 JSON 文件读写增加备份、写入临时文件和异常恢复
- 清理 `projects.json` 中过大的历史演示数据
- 增加启动健康检查和关键接口日志
- 把 prompt、模板常量和少量工具函数从 `server.ts` 中抽离

### 优点

- 改动最小，最快提升演示稳定性
- 不改变当前部署方式
- 对比赛、录屏、线下展示最稳

### 缺点

- 没有根治 `server.ts` 和 `App.tsx` 过重
- JSON 数据层仍然不适合真实并发
- AI 长请求仍不可恢复、不可追踪

### 适合场景

适合近期要交材料、录制视频、现场演示、答辩前冲刺。

## 5. 方案二：模块化单体

### 结构

保留一个 Node 服务和一个 React 前端，但按业务域拆分。

建议后端结构：

```text
server/
  app.ts
  config/
  routes/
    auth.routes.ts
    generation.routes.ts
    classroom.routes.ts
    projects.routes.ts
    hardware.routes.ts
    admin.routes.ts
  middleware/
    auth.middleware.ts
    error.middleware.ts
  services/
    generation.service.ts
    classroom.service.ts
    project.service.ts
    hardware.service.ts
    learning-review.service.ts
  repositories/
    user.repository.ts
    project.repository.ts
    classroom.repository.ts
    hardware.repository.ts
  ai/
    modelClient.ts
    promptCompiler.ts
    resultParser.ts
  hardware/
    componentResolver.ts
    pinAllocator.ts
    hardwareLinter.ts
  templates/
    keilProject.ts
```

建议前端结构：

```text
src/
  app/
    Dashboard.tsx
    routes.ts
  features/
    generation/
    classroom/
    projects/
    hardware/
    admin/
  shared/
    api/
    ui/
    types/
```

数据层建议从 JSON 迁移到 SQLite：

```text
短期：SQLite + better-sqlite3 或 Drizzle
中期：PostgreSQL
静态种子：保留 components.json / mcus.json 作为导入源
大产物：生成 zip、代码包、日志转入 artifacts 目录或对象存储
```

### 优点

- 复用现有代码最多
- 能明显降低维护压力
- 对校内试用足够稳
- 可以逐步迁移，不需要一次推翻
- 为后续异步任务留下清晰边界

### 缺点

- 仍是单进程服务
- AI 长任务如果不额外改造，仍会阻塞请求体验
- 需要补充迁移脚本和基础测试

### 适合场景

这是当前仓库最推荐的主线。它兼顾参赛交付、课堂落地和后续产品化。

## 6. 方案三：事件驱动生成流水线

### 结构

把“项目生成”从一次长 HTTP 请求改为 job 流水线。

```text
用户提交需求
  -> 创建 generation_job
  -> Prompt 优化
  -> 元器件解析 / RAG 检索
  -> 引脚分配
  -> AI 代码生成
  -> 结果解析与修复
  -> 硬件校验
  -> 工程产物打包
  -> 前端通过轮询 / SSE / WebSocket 查看进度
```

轻量实现：

```text
SQLite jobs 表
Node 内置 worker 队列
前端轮询 /api/generation-jobs/:id
```

稳定实现：

```text
PostgreSQL
BullMQ + Redis
独立 worker 进程
SSE 推送进度
```

### 优点

- 生成过程可观察、可恢复、可重试
- 很适合当前 `TaskProgress` UI
- 教师可以看到学生生成过程日志
- 支持双模型比较、质量评分、失败重跑
- 大幅减少“页面等很久但不知道发生了什么”的体验问题

### 缺点

- 比模块化单体复杂
- 需要设计 job 状态、日志、重试和超时
- 部署需要多一个 worker 或队列组件

### 适合场景

适合平台从“演示型 AI 生成器”升级为“可解释的 AI 工程编译器”时采用。

## 7. 方案四：云原生多服务平台

### 结构

拆成多个服务：

```text
Web App
API Gateway / BFF
Auth Service
Generation Service
Hardware Knowledge Service
Classroom Service
Artifact Service
PostgreSQL / Firestore
Object Storage
Queue / Worker
Observability
```

### 优点

- 扩展性最好
- 权限边界最清晰
- 适合多学校、多租户、长期 SaaS
- 生成服务可以独立限流、扩容和容灾

### 缺点

- 当前阶段成本最高
- 会显著增加部署、监控、鉴权、数据一致性和运维复杂度
- 容易把精力从教学体验和生成质量转移到基础设施

### 适合场景

适合已经完成校内试用，有真实用户增长和商业化计划之后再做。

## 8. 横向比较

| 维度 | 方案一：演示级加固 | 方案二：模块化单体 | 方案三：生成流水线 | 方案四：多服务平台 |
| --- | --- | --- | --- | --- |
| 改造成本 | 低 | 中 | 中高 | 高 |
| 对现有代码复用 | 很高 | 高 | 中高 | 中 |
| 近期参赛稳定性 | 很高 | 高 | 中 | 低 |
| 校内长期使用 | 低 | 高 | 高 | 高 |
| AI 生成可观察性 | 低 | 中 | 高 | 高 |
| 并发能力 | 低 | 中 | 中高 | 高 |
| 数据可靠性 | 低 | 高 | 高 | 高 |
| 部署复杂度 | 低 | 中 | 中高 | 高 |
| 维护边界清晰度 | 低 | 高 | 高 | 很高 |
| 适合当前阶段 | 临时可选 | 最推荐 | 第二阶段引入 | 暂缓 |

## 9. 推荐路线

推荐采用：

```text
方案一的稳定化动作
  + 方案二的模块化单体作为主线
  + 为方案三预留 job 边界
  + 暂缓方案四
```

具体路线：

### 阶段 1：演示稳定化

- 修复乱码和演示项目文案
- 清理或归档过大的 `projects.json`
- 给 JSON 写入增加备份和原子写入
- 给 AI 接口增加统一错误返回
- 保证生成、预览、下载三条演示路径稳定

### 阶段 2：后端模块化

- 拆出 `server/app.ts`
- 拆出 `server/routes/*`
- 拆出 `server/services/*`
- 拆出 `server/repositories/*`
- 把 `readDbFile` / `writeDbFile` 封装成 repository 层
- 把 AI 调用、RAG、硬件校验、工程后处理收进 `generation.service.ts`

### 阶段 3：前端功能域整理

- 把生成链路放到 `src/features/generation`
- 把课堂功能放到 `src/features/classroom`
- 把管理员功能放到 `src/features/admin`
- 把硬件相关展示和编辑放到 `src/features/hardware`
- 把 API client、通用类型、基础 UI 放到 `src/shared`

### 阶段 4：数据层迁移

- 新增 SQLite 数据库
- 设计 users、projects、classes、members、submissions、components、mcus 表
- 编写 `data/*.json -> SQLite` 的一次性迁移脚本
- 生成产物从项目主表中拆出，避免项目列表读取大块代码内容
- 保留 JSON 文件作为导入导出和种子数据

### 阶段 5：生成任务流水线

- 新增 `generation_jobs` 表
- `/api/generate-project` 改为创建 job
- 新增 `/api/generation-jobs/:jobId`
- 前端 `TaskProgress` 从模拟日志改为读取真实日志
- 后端 worker 分步写入状态和中间结果

## 10. 建议的第一批落地任务

优先级从高到低：

1. 修复可见中文乱码和演示文案。
2. 给本地 JSON 数据库增加安全写入：临时文件、备份文件、异常恢复。
3. 清理 `projects.json`，把大字段和历史演示数据归档。
4. 从 `server.ts` 拆出 `server/db/fileDb.ts`、`server/middleware/auth.ts`、`server/routes/projects.routes.ts`。
5. 从 `server.ts` 拆出 `server/routes/classroom.routes.ts` 和 `server/services/classroom.service.ts`。
6. 把 AI 生成相关逻辑集中到 `server/services/generation.service.ts`。
7. 前端先拆 `src/features/generation`，减少 `App.tsx` 的生成流程状态。
8. 设计 SQLite schema，但先不强制迁移所有功能。

## 11. 结论

当前最不建议“一步到位微服务化”。项目真正的瓶颈不是服务数量，而是边界混在一起、数据层脆弱、生成流程不可恢复，以及前后端中枢文件过重。

最优路线是先做模块化单体：保持当前演示和部署方式基本不变，同时建立清晰的业务边界。等课堂试用稳定后，再把 AI 生成独立成任务流水线。多服务和云原生平台应作为产品化之后的第三阶段，而不是当前第一步。
