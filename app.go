package main

import (
	"context"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"time"

	"github.com/wailsapp/wails/v2/pkg/runtime"
)

// App struct
type App struct {
	ctx       context.Context
	allowQuit bool
}

// HistoryItem 历史记录结构
type HistoryItem struct {
	ID         string `json:"id"`
	TaskName   string `json:"taskName"`
	Duration   int    `json:"duration"` // 秒
	Mode       string `json:"mode"`     // pomodoro, custom, stopwatch
	CompleteAt string `json:"completeAt"`
	Reflection string `json:"reflection"` // 感想 (初始为空)
}

// AppData 总数据
type AppData struct {
	History []HistoryItem `json:"history"`
}

func NewApp() *App {
	return &App{}
}

func (a *App) startup(ctx context.Context) {
	a.ctx = ctx

	// 启动全局快捷键监听（例如 Ctrl+Alt+P 唤起笔记）
	go a.initHotkeys()
}

// HandleBeforeClose 在点击窗口关闭按钮时触发：默认隐藏到托盘而不是退出
func (a *App) HandleBeforeClose(ctx context.Context) bool {
	if a.allowQuit {
		// 正常退出
		return false
	}
	// 隐藏窗口到托盘，保持后台运行
	runtime.WindowHide(ctx)
	return true
}

// GetStoragePath 获取存储路径
func (a *App) GetStoragePath() string {
	home, _ := os.UserHomeDir()
	path := filepath.Join(home, "Documents", "TimePulse")
	os.MkdirAll(path, os.ModePerm)
	return filepath.Join(path, "data.json")
}

// SaveHistory 核心方法：供前端调用保存记录
func (a *App) SaveHistory(taskName string, duration int, mode string) string {
	filePath := a.GetStoragePath()

	// 1. 读取旧数据
	var data AppData
	content, err := os.ReadFile(filePath)
	if err == nil {
		json.Unmarshal(content, &data)
	}

	// 2. 追加新记录
	newItem := HistoryItem{
		ID:         fmt.Sprintf("%d", time.Now().Unix()),
		TaskName:   taskName,
		Duration:   duration,
		Mode:       mode,
		CompleteAt: time.Now().Format("2006-01-02 15:04:05"),
	}
	// 将新记录插到最前面
	data.History = append([]HistoryItem{newItem}, data.History...)

	// 3. 写回文件
	newData, _ := json.MarshalIndent(data, "", "  ")
	os.WriteFile(filePath, newData, 0644)

	return "Saved"
}

// GetHistory 返回已经持久化的工作会话，供统计视图按日、周、月聚合。
func (a *App) GetHistory() []HistoryItem {
	var data AppData
	content, err := os.ReadFile(a.GetStoragePath())
	if err != nil {
		return []HistoryItem{}
	}
	if err := json.Unmarshal(content, &data); err != nil {
		return []HistoryItem{}
	}
	if data.History == nil {
		return []HistoryItem{}
	}
	return data.History
}

// SetMiniWindowMode 切换 Windows 系统背板，确保迷你窗口是真透明而非浅色 Mica。
func (a *App) SetMiniWindowMode(enabled bool) {
	a.setMiniWindowMode(enabled)
}

// GetScreenContrast 根据指定屏幕像素的真实亮度返回适合的前景色。
func (a *App) GetScreenContrast(x int, y int) string {
	return a.screenContrastAt(x, y)
}
