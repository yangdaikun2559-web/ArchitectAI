# ArchitectAI 架构方案探索与比较

## 1. 当前架构画像

当前项目是一个面向物联网教学课件/生成平台的 Vite + React + Express 应用：

- 前端：`src/App.tsx` 负责生成主流程、项目状态、历史、课堂、下载等顶层编排；`src/components/*` 承担 CAD 接线图、代码查看、课堂管理、下载中心、管理后台等 UI。
- 后端：`server.ts` 是单文件 Express 服务，包含数据读写、认证鉴权、课堂管理、AI 提示词优化、项目生成、RAG 检索、Keil/PlatformIO 模板处理、硬件校验和 Vite 开发服务。
- 数据：`data/*.json` 和 `parts/*.json` 作为本地文件数据库，`projects.json` 已经达到数十 MB 级别。
- AI/硬件域：`src/lib/ragEngine.ts`、`componentResolver.ts`、`pinAllocator.ts`、`hardwareLinter.ts` 已经形成初步的“硬件知识库 + 生成后校验”能力。

这套结构很适合快速演示和比赛交付，但主要压力点也很集中：

- `server.ts` 同时处理 API、领域逻辑、文件存储、AI 编排和模板处理，后续改动风险高。
- 前端顶层状态集中在 `App.tsx`，生成流程、课堂流程和项目预览耦合较紧。
- 本地 JSON 文件缺少并发保护、索引、迁移和权限边界，课堂长期使用时容易出现性能与一致性问题。
- 认证目前基于 `localStorage` 中的用户资料和 `x-user-id` 请求头，适合演示，不适合真实多用户环境。
- 大量中文内容存在编码异常，会影响 UI 文案、提示词质量、RAG 命中率和文档观感。

## 2. 目标拆分

建议先把项目目标分成三类，因为不同目标对应的最佳架构不一样：

- 参赛/演示目标：稳定跑通 10 分钟演示、减少现场失败、保证生成结果可解释。
- 教学落地目标：支持班级、学生作品、提交反馈、课堂活动数据沉淀。
- 产品化目标：支持多用户并发、权限隔离、异步生成、可观测性、部署和数据迁移。

## 3. 方案一：保留当前单体，做演示级加固

### 结构

继续使用 `React + Vite + Express + JSON 文件`，只做低风险整理：

- 把 `server.ts` 中的常量、prompt、文件模板、课堂路由拆到局部模块。
- 保留 JSON 文件数据库。
- 增加启动检查、错误兜底、生成结果缓存、关键接口日志。
- 修复中文编码和演示文案。

### 优点

- 改动小，最快能提升稳定性。
- 不影响现有演示流程。
- 适合比赛截止期临近时使用。

### 缺点

- 仍然是“胖 server + 胖 App”的结构。
- 真实多用户、并发写入和数据迁移问题没有根治。
- 后续功能越多，维护成本会快速上升。

### 适用场景

如果目标是近期参赛、录视频、线下展示，这是最稳的短期方案。

## 4. 方案二：模块化单体

### 结构

保留单个 Node 服务和 React 前端，但按业务域拆分：

```text
src/
  app/
    routes/
    pages/
    flows/
  features/
    generation/
    classroom/
    projects/
    hardware-catalog/
    admin/
  shared/
    api-client/
    schemas/
    ui/

server/
  routes/
    generation.routes.ts
    classroom.routes.ts
    projects.routes.ts
    admin.routes.ts
  services/
    generation.service.ts
    classroom.service.ts
    hardware.service.ts
    auth.service.ts
  repositories/
    project.repository.ts
    class.repository.ts
    component.repository.ts
  ai/
    modelClient.ts
    promptCompiler.ts
    resultNormalizer.ts
  hardware/
    pinAllocator.ts
    hardwareLinter.ts
    componentResolver.ts
```

数据层建议从 JSON 文件迁移到 SQLite：

- 本地/单机教学：SQLite + Prisma 或 Drizzle。
- 云端教学：PostgreSQL。
- 硬件元器件库仍可保留 JSON 种子文件，但运行时入库管理。

### 优点

- 复用现有代码最多，风险可控。
- 能明显降低 `server.ts` 和 `App.tsx` 的维护压力。
- 可以逐步替换存储层，不需要一次推翻。
- 非常适合“从课件项目走向学校内测”。

### 缺点

- 仍然是单进程架构，AI 生成耗时会阻塞体验，需要额外设计任务状态。
- 如果未来并发很高，还需要进一步拆 worker 或队列。

### 适用场景

这是当前仓库最推荐的主路径。它兼顾比赛交付、教学落地和后续产品化。

## 5. 方案三：事件驱动生成流水线

### 结构

把“项目生成”从普通 HTTP 请求改成任务流水线：

```text
用户提交需求
  -> 创建 generation_job
  -> Prompt 优化任务
  -> 硬件检索/器件解析任务
  -> 引脚分配任务
  -> AI 代码生成任务
  -> 静态校验/硬件校验任务
  -> 生成 ZIP/README/CAD 产物
  -> 前端轮询或 SSE/WebSocket 展示进度
```

实现可以从轻到重：

- 轻量版：SQLite job 表 + Node 内存 worker。
- 稳定版：BullMQ + Redis。
- 云端版：Cloud Tasks / PubSub / serverless worker。

### 优点

- 生成过程更可观察，天然适合当前的 `TaskProgress` UI。
- 失败可重试，能保存每一步中间产物。
- 方便做“双模型比较”“生成质量评分”“教师查看学生过程日志”。

### 缺点

- 比方案二复杂，需要引入任务状态模型。
- 本地开发、部署和错误处理都要更严谨。

### 适用场景

当你希望平台从“点击后等待结果”升级为“可解释的 AI 工程编译器”时，这个方案价值最大。

## 6. 方案四：云原生多服务平台

### 结构

将系统拆成多个服务：

- Web App：React/Next.js。
- API Gateway/BFF：认证、权限、聚合接口。
- Generation Service：AI 生成、模型选择、prompt 编排。
- Hardware Knowledge Service：元器件库、RAG、版本化规则。
- Classroom Service：班级、成员、作业、反馈。
- Artifact Service：ZIP、代码包、CAD 图、编译日志存储。
- Database：PostgreSQL / Firestore。
- Object Storage：生成产物与模板。

### 优点

- 扩展性、权限边界和服务独立演进最好。
- 适合多学校、多租户、长期 SaaS。
- 生成服务可以独立扩容和限流。

### 缺点

- 当前阶段成本最高。
- 会显著增加部署、监控、权限、数据一致性和运维复杂度。
- 对参赛/课件交付而言投入偏重。

### 适用场景

适合已经完成教学验证、准备产品化或商业化推广之后再做。

## 7. 横向比较

| 维度 | 方案一：演示级加固 | 方案二：模块化单体 | 方案三：事件驱动流水线 | 方案四：云原生多服务 |
| --- | --- | --- | --- | --- |
| 改造成本 | 低 | 中 | 中高 | 高 |
| 对现有代码复用 | 很高 | 高 | 中高 | 中 |
| 近期参赛稳定性 | 高 | 中高 | 中 | 低 |
| 教学长期使用 | 低 | 高 | 高 | 高 |
| AI 生成可观察性 | 中 | 中 | 高 | 高 |
| 多用户并发 | 低 | 中 | 中高 | 高 |
| 部署复杂度 | 低 | 中 | 中高 | 高 |
| 后续可维护性 | 中低 | 高 | 高 | 高 |

## 8. 推荐路线

推荐采用“方案一 + 方案二为主，预留方案三接口”的渐进式路线：

1. 先做演示稳定化：修复中文编码、清理 demo 数据、补齐错误提示、保证生成和下载路径稳定。
2. 再做模块化单体：拆 `server.ts`，拆 `App.tsx`，建立 `generation/classroom/hardware/projects` 四个业务域。
3. 数据层迁移：从 JSON 文件迁移到 SQLite，保留 JSON 作为种子数据和导入导出格式。
4. 生成流水线化：把 `/api/generate-project` 从一次性长请求改成 job，前端通过 job 状态显示步骤。
5. 最后再考虑云服务拆分：只有当学校试用、多班级并发和长期数据沉淀成为真实需求时，再进入方案四。

## 9. 第一阶段建议拆分清单

### 后端

- `server/db/fileDb.ts`：封装当前 `readDbFile` / `writeDbFile`。
- `server/auth/auth.middleware.ts`：封装 `getRequestUser`、`checkTeacher`、`checkAdmin`。
- `server/routes/classroom.routes.ts`：迁移课堂相关路由。
- `server/routes/projects.routes.ts`：迁移项目 CRUD。
- `server/routes/hardware.routes.ts`：迁移元器件和 MCU 查询/管理。
- `server/routes/generation.routes.ts`：保留提示词优化和项目生成入口。
- `server/services/generation.service.ts`：集中 AI 调用、RAG、解析、引脚分配、校验、后处理。

### 前端

- `src/features/generation/`：需求输入、提示词优化、任务进度、项目预览、代码下载。
- `src/features/classroom/`：班级、加入申请、作业提交、教师反馈。
- `src/features/hardware/`：元器件管理、BOM、接线图、引脚表。
- `src/features/admin/`：管理后台。
- `src/shared/api/`：统一 API client 和错误处理。

## 10. 结论

当前项目最值得避免的是“一步到位微服务化”。它会把主要精力消耗在部署和服务治理上，而当前真正的瓶颈是边界混杂、数据层脆弱、生成流程不可恢复、中文内容资产受损。

最优解是先做模块化单体：让参赛演示继续稳定，同时为课堂真实使用准备清晰的业务边界。等生成任务、课堂作业和硬件知识库都沉淀出稳定模型后，再把生成流水线独立出来。
