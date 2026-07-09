# Go 开发环境

## 已安装组件

| 组件 | 版本 | 位置 |
| --- | --- | --- |
| Go | 1.26.5 windows/amd64 | `D:\Environment\Go\1.26.5` |
| Wails CLI | 2.11.0 | `D:\Environment\Go\gopath\bin\wails.exe` |
| Node.js | 24.17.0 LTS | `D:\Environment\Node\24.17.0` |
| npm | 11.13.0 | 随 Node.js 安装 |
| Eclipse Temurin JDK | 25.0.3+9 LTS | `D:\Environment\Java\temurin-25.0.3+9` |
| Apache Maven | 3.9.15 | `D:\Environment\Maven\3.9.15` |
| GOPATH | - | `D:\Environment\Go\gopath` |
| Go 构建缓存 | - | `D:\Environment\Go\cache` |

Go 1.26.5 是安装时（2026-07-09）的最新稳定版。项目的 `go.mod` 声明最低工具链版本为 Go 1.22.4。

已写入当前用户环境变量：

```text
PATH    = D:\Environment\Go\1.26.5\bin;D:\Environment\Go\gopath\bin;...
GOPATH  = D:\Environment\Go\gopath
GOCACHE = D:\Environment\Go\cache
NODE_HOME  = D:\Environment\Node\24.17.0
JAVA_HOME  = D:\Environment\Java\temurin-25.0.3+9
MAVEN_HOME = D:\Environment\Maven\3.9.15
```

环境变量对新启动的终端生效。当前已打开的终端或 VS Code 需要关闭后重新打开。

## 验证安装

在新的 PowerShell 中执行：

```powershell
go version
go env GOROOT GOPATH GOCACHE
wails version
node --version
npm.cmd --version
java -version
mvn --version
```

预期 `go version` 输出 `go1.26.5 windows/amd64`，`GOROOT` 为 `D:\Environment\Go\1.26.5`。

## 在其他项目中使用

用户级 PATH 已配置，因此其他目录无需复制 Go，也不应为每个项目重复设置 `GOROOT`。直接进入项目目录使用即可：

```powershell
cd D:\Code-Play\another-go-project
go mod download
go test ./...
go run .
```

创建新项目：

```powershell
mkdir my-go-app
cd my-go-app
go mod init example.com/my-go-app
```

Go Modules 会按各项目的 `go.mod` 隔离依赖版本；下载的模块共用 `D:\Environment\Go\gopath\pkg\mod` 缓存。

当前网络无法稳定访问 `proxy.golang.org`。需要下载依赖时，可仅对当前 PowerShell 临时使用国内代理：

```powershell
$env:GOPROXY = "https://goproxy.cn,direct"
go mod download
```

这不会修改项目文件。依赖内容仍由 `go.sum` 校验。

## PowerShell 中使用 npm

当前 PowerShell 执行策略会阻止 Node 自带的 `npm.ps1`。这不影响 npm 本身，也不建议为此放宽全局脚本策略。请使用：

```powershell
npm.cmd --version
npm.cmd ci
npm.cmd run build
```

CMD、Git Bash或其他程序调用 npm 时通常不受这个 PowerShell 限制。

## TimePulse 开发

```powershell
cd D:\Code-Play\clock_1\timepulse\frontend
npm.cmd ci
npm.cmd run build
cd ..
wails doctor
```

Microsoft WebView2 Runtime 已安装，Wails Doctor 检测版本为 150.0.4078.48，并确认系统具备 Wails 开发所需依赖。

当前 Wails 2.11.0 的绑定生成器与 Go 1.26.5 存在兼容问题：安装 `node_modules` 后执行完整 `wails build`，生成器会扫描其中的 `@scope` 目录并报非法 Go 导入路径。前端独立构建已经通过；完整 Wails 构建需要后续升级 Wails 或调整绑定生成步骤。
