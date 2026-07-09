# TimePulse

TimePulse 是一个基于 Wails、Go、React 和 TypeScript 的桌面应用，集成计时、四象限计划和 Markdown 便签。

## 项目状态

- Go 后端、Wails 窗口和三个主要前端视图已经成型。
- 当前仓库含一个历史 Windows 构建产物：`build/bin/timepulse.exe`。
- Go 代码已通过 `go test ./...` 和 `go vet ./...`，但目前没有自动化测试用例。
- Node.js/npm 已安装，前端 TypeScript/Vite 生产构建已验证通过。
- 完整 `wails build` 当前会在 Wails 2.11 绑定生成阶段与 Go 1.26 发生兼容问题，详见开发进度文档。

详细进度和已知缺口见 [DEVELOPMENT_STATUS.md](./DEVELOPMENT_STATUS.md)。

## 开发环境

本机 Go/Wails 的安装位置、环境变量和跨项目复用方法见 [GO_ENVIRONMENT.md](./GO_ENVIRONMENT.md)。

在本目录执行：

```powershell
cd frontend
npm.cmd ci
cd ..
wails dev
```

生产构建：

```powershell
wails build
```
