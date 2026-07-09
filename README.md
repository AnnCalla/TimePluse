# TimePulse

TimePulse 是一个基于 Wails、Go、React 和 TypeScript 的桌面应用，集成计时、四象限计划和 Markdown 便签。

计时器提供青柠、黑曜、珍珠、晴空和壁纸取色五套液态玻璃主题；极简模式可作为透明桌面悬浮计时器使用，并包含日/周/月工作统计与近 12 周热力图。

## 全局快捷键

| 快捷键 | 功能 |
| --- | --- |
| `Ctrl+Alt+1` | 唤起迷你番茄钟 |
| `Ctrl+Alt+2` | 唤起迷你倒计时 |
| `Ctrl+Alt+3` | 唤起迷你正计时 |
| `Ctrl+Alt+4` | 唤起迷你计划 |
| `Ctrl+Alt+5` | 唤起迷你便签 |
| `Ctrl+Alt+P` | 兼容快捷键，唤起迷你便签 |

迷你计时器只显示时间和当前任务；迷你计划显示优先级最高的四项并支持快速添加；迷你便签可直接编辑当前便签。迷你窗口均可拖动，双击空白处恢复完整窗口。

除全局快捷键外，完整计划页和便签页顶部也提供缩小按钮。悬浮便签支持青柠、黑曜、珍珠、晴空和壁纸取色五套主题及透明度调整。

标题栏中的眼睛关闭图标用于“隐藏到后台”，程序、计时和全局快捷键会继续运行；`X` 用于彻底退出程序。隐藏后可使用任一全局快捷键重新唤起。

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
