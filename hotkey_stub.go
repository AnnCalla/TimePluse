//go:build !windows

package main

// 非 Windows 平台不注册全局快捷键，保持空实现即可。
func (a *App) initHotkeys() {}

func (a *App) setMiniWindowMode(enabled bool) {}

func (a *App) screenContrastAt(x int, y int) string {
	return "dark"
}
