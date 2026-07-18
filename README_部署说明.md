# ArchitectAI 参赛演示版部署说明

本项目建议部署为 Node.js Web Service，不建议只上传为静态网页。项目包含 React 前端和 Express 后端，后端负责 AI 方案生成、项目数据、学习任务和下载接口。

## 一、推荐部署方式

推荐使用 Render 或 Railway 部署。对第一次部署而言，Render 的配置较直观，本仓库已提供 `render.yaml`。

参赛建议采用“双保险”：

1. 在线演示地址：方便评委直接打开查看。
2. 本地运行 ZIP：作为正式作品本体和网络异常时的备用方案。

## 二、部署前检查

在本地先确认以下命令可以运行：

```bash
npm install
npm run build
npm start
```

启动后访问：

```text
http://localhost:3000
```

并重点检查：

- 首页可以打开。
- 可以加载 STM32 智能温室参赛课例。
- CAD 接线图可以显示。
- 代码页可以查看 STM32 Demo。
- 工程 ZIP 下载功能可以使用。
- 学习任务和教师评价页面可以展示。

## 三、Render 部署步骤

1. 将项目上传到 GitHub 私有仓库或公开仓库。
2. 登录 Render，选择 New Web Service。
3. 选择该 GitHub 仓库。
4. 如果 Render 识别到 `render.yaml`，可按提示创建服务。
5. 如果需要手动填写，使用以下配置：

```text
Environment: Node
Build Command: npm ci && npm run build
Start Command: npm start
Health Check Path: /api/health
```

6. 在 Environment Variables 中添加密钥。

必须或可选变量：

```text
NODE_ENV=production
GEMINI_API_KEY=你的 Gemini API Key，可不填但 AI 相关能力会受限
DEEPSEEK_API_KEY=你的 DeepSeek API Key，可不填但 DeepSeek 生成能力不可用
DEEPSEEK_API_BASE=https://api.deepseek.com
DEEPSEEK_MODEL=deepseek-chat
```

注意：不要把真实 API Key 写入代码或提交到仓库。

## 四、参赛演示建议

部署成功后，在参赛运行说明中写明：

> 本作品为网页应用型仿真实验课件，支持在线演示与本地运行两种方式。评审可优先访问在线演示地址；如网络受限，可解压作品包后按 README 说明在本地运行。系统内置“STM32 智能温室环境监测与报警系统”参赛演示课例，无需联网 AI 服务也可完成完整课件演示。

建议视频录制时使用在线部署版，正式提交时同时提交本地 ZIP 包。

## 五、注意事项

- 免费云服务可能存在冷启动，首次打开可能需要等待几十秒。
- 当前项目使用本地 JSON 文件保存部分数据。免费云服务重启后数据可能不会长期保留，因此参赛演示应以内置 STM32 Demo 和固定演示流程为主。
- 如果正式评审需要稳定账号、班级数据和学生提交记录，建议后续改为持久化数据库或使用平台提供的持久磁盘。
