//go:build windows

package main

import (
	_ "embed"

	"github.com/getlantern/systray"
	"github.com/wailsapp/wails/v2/pkg/runtime"
)

//go:embed build/windows/icon.ico
var trayIcon []byte

func (a *App) initTray() {
	systray.Run(func() {
		systray.SetIcon(trayIcon)
		systray.SetTooltip("TimePulse · 计划、计时与便签")

		show := systray.AddMenuItem("显示主窗口", "恢复 TimePulse 主窗口")
		miniTimer := systray.AddMenuItem("迷你番茄钟", "显示透明迷你番茄钟")
		systray.AddSeparator()
		quit := systray.AddMenuItem("彻底退出", "结束 TimePulse 和所有快捷键")

		go func() {
			for {
				select {
				case <-show.ClickedCh:
					if a.ctx != nil {
						runtime.WindowShow(a.ctx)
						runtime.WindowUnminimise(a.ctx)
						runtime.WindowCenter(a.ctx)
					}
				case <-miniTimer.ClickedCh:
					if a.ctx != nil {
						runtime.WindowShow(a.ctx)
						runtime.WindowUnminimise(a.ctx)
						runtime.WindowSetAlwaysOnTop(a.ctx, true)
						runtime.EventsEmit(a.ctx, "shortcut:open-feature", map[string]string{
							"feature": "timer",
							"mode":    "pomodoro",
						})
					}
				case <-quit.ClickedCh:
					a.allowQuit = true
					systray.Quit()
					if a.ctx != nil {
						runtime.Quit(a.ctx)
					}
					return
				}
			}
		}()
	}, func() {})
}

func (a *App) quitTray() {
	systray.Quit()
}
