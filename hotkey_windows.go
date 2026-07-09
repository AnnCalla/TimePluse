//go:build windows

package main

import (
	"fmt"
	goruntime "runtime"
	"syscall"
	"time"
	"unsafe"

	wailsruntime "github.com/wailsapp/wails/v2/pkg/runtime"
)

var (
	user32               = syscall.NewLazyDLL("user32.dll")
	procRegisterHotKey   = user32.NewProc("RegisterHotKey")
	procUnregisterHotKey = user32.NewProc("UnregisterHotKey")
	procGetMessageW      = user32.NewProc("GetMessageW")
)

const (
	modAlt     = 0x0001
	modControl = 0x0002

	wmHotkey = 0x0312
)

type winMsg struct {
	hwnd    uintptr
	message uint32
	wParam  uintptr
	lParam  uintptr
	time    uint32
	pt      struct {
		x, y int32
	}
}

// initHotkeys 使用 Win32 RegisterHotKey 注册全局快捷键 Ctrl+Alt+P。
func (a *App) initHotkeys() {
	goruntime.LockOSThread()
	defer goruntime.UnlockOSThread()

	const hotkeyID = 1
	// 虚拟键码 'P' = 0x50
	r1, _, err := procRegisterHotKey.Call(
		0,
		uintptr(hotkeyID),
		uintptr(modControl|modAlt),
		uintptr(0x50),
	)
	if r1 == 0 {
		fmt.Println("RegisterHotKey Ctrl+Alt+P failed:", err)
		return
	}
	defer procUnregisterHotKey.Call(0, uintptr(hotkeyID), 0)

	var msg winMsg
	for {
		if a.ctx != nil {
			select {
			case <-a.ctx.Done():
				return
			default:
			}
		}

		r, _, err := procGetMessageW.Call(
			uintptr(unsafe.Pointer(&msg)),
			0,
			0,
			0,
		)
		if int32(r) == -1 {
			fmt.Println("GetMessageW failed:", err)
			return
		}
		if r == 0 {
			// WM_QUIT
			return
		}

		if msg.message == wmHotkey && msg.wParam == hotkeyID {
			if a.ctx == nil {
				continue
			}
			// 唤起窗口并切到笔记标签
			wailsruntime.WindowShow(a.ctx)
			wailsruntime.WindowUnminimise(a.ctx)
			wailsruntime.WindowCenter(a.ctx)
			wailsruntime.WindowSetAlwaysOnTop(a.ctx, true)
			time.AfterFunc(2*time.Second, func() {
				wailsruntime.WindowSetAlwaysOnTop(a.ctx, false)
			})
			wailsruntime.EventsEmit(a.ctx, "shortcut:open-note")
		}
	}
}
