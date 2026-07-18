# ArchitectAI 腾讯云 CloudBase Run 部署说明

本项目是 React 前端 + Express 后端的一体化 Node.js 应用，推荐部署到腾讯云 CloudBase Run 云托管。项目根目录已提供 `Dockerfile` 和 `.dockerignore`，腾讯云可按容器方式构建运行。

## 一、部署前准备

需要准备：

1. 腾讯云账号，并完成实名认证。
2. 开通云开发 CloudBase。
3. 一个代码来源：可使用本地代码上传，也可使用私有 Git 仓库。

本项目不建议只部署为静态网站，因为后端接口负责 AI 生成、项目数据、学习任务、工程包下载等功能。

## 二、本地验证

在项目根目录运行：

```bash
npm install
npm run build
npm start
```

浏览器访问：

```text
http://localhost:3000
```

重点检查：

- 首页可以打开。
- 可以加载 STM32 智能温室参赛课例。
- CAD 接线图可以显示。
- 代码页可以查看 STM32 Demo。
- 工程 ZIP 下载功能可以使用。
- 学习任务和教师评价页面可以展示。

## 三、腾讯云 CloudBase Run 配置

进入腾讯云控制台：

```text
云开发 CloudBase -> 云托管 CloudBase Run -> 新建服务
```

推荐配置：

```text
服务名称：architectai-stm32-courseware
部署方式：代码部署 / Dockerfile 构建
运行环境：容器
监听端口：3000
启动命令：不用单独填写，Dockerfile 已配置 CMD ["npm", "start"]
```

如果页面要求填写构建或启动命令，可使用：

```text
构建命令：docker build -t architectai-stm32-courseware .
启动命令：npm start
端口：3000
```

## 四、环境变量

基础环境变量：

```text
NODE_ENV=production
PORT=3000
DEEPSEEK_API_BASE=https://api.deepseek.com
DEEPSEEK_MODEL=deepseek-chat
```

可选 AI 密钥：

```text
GEMINI_API_KEY=你的 Gemini API Key
DEEPSEEK_API_KEY=你的 DeepSeek API Key
```

如果暂时不配置 AI Key，系统仍可通过内置 STM32 Demo 完成参赛演示，但在线 AI 生成能力会受限。

## 五、演示账号

部署版内置参赛演示账号：

```text
教师账号：teacher_demo
教师密码：teacher123456

学生账号：student_demo
学生密码：student123456
```

## 六、参赛说明建议写法

可在参赛运行说明中写：

> 本作品为网页应用型仿真实验课件，支持在线演示与本地运行。评审可优先访问在线演示地址；如网络受限，可解压作品包按说明本地运行。系统内置“STM32 智能温室环境监测与报警系统”参赛演示课例，无需联网 AI 服务也可完成需求分析、虚拟接线、安全检测、代码理解和学习评价等完整流程。

## 七、注意事项

- CloudBase Run 使用容器部署，修改代码后需要重新构建并发布新版本。
- 当前项目使用 JSON 文件保存演示数据，容器重启后不建议依赖其长期保存真实学生数据。
- 正式参赛演示建议以内置 STM32 Demo 和固定演示账号为主。
- 如果需要长期保存班级、学生提交和教师评价数据，后续建议接入云数据库。
