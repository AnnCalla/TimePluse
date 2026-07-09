//go:build windows

package main

import (
	"fmt"
	goruntime "runtime"
	"syscall"
	"unsafe"

	wailsruntime "github.com/wailsapp/wails/v2/pkg/runtime"
)

var (
	user32                            = syscall.NewLazyDLL("user32.dll")
	procRegisterHotKey                = user32.NewProc("RegisterHotKey")
	procUnregisterHotKey              = user32.NewProc("UnregisterHotKey")
	procGetMessageW                   = user32.NewProc("GetMessageW")
	procGetForegroundWindow           = user32.NewProc("GetForegroundWindow")
	procFindWindowW                   = user32.NewProc("FindWindowW")
	procGetDC                         = user32.NewProc("GetDC")
	procReleaseDC                     = user32.NewProc("ReleaseDC")
	procGetPixel                      = syscall.NewLazyDLL("gdi32.dll").NewProc("GetPixel")
	procSetWindowCompositionAttribute = user32.NewProc("SetWindowCompositionAttribute")
	procDwmSetWindowAttribute         = syscall.NewLazyDLL("dwmapi.dll").NewProc("DwmSetWindowAttribute")
)

type accentPolicy struct {
	accentState   int32
	accentFlags   int32
	gradientColor uint32
	animationID   int32
}

type windowCompositionAttribData struct {
	attrib uintptr
	data   unsafe.Pointer
	size   uintptr
}

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

	hotkeys := []struct {
		id      uintptr
		key     uintptr
		feature string
		mode    string
	}{
		{1, 0x31, "timer", "pomodoro"},  // Ctrl+Alt+1
		{2, 0x32, "timer", "custom"},    // Ctrl+Alt+2
		{3, 0x33, "timer", "stopwatch"}, // Ctrl+Alt+3
		{4, 0x34, "planner", ""},        // Ctrl+Alt+4
		{5, 0x35, "note", ""},           // Ctrl+Alt+5
		{6, 0x50, "note", ""},           // 保留 Ctrl+Alt+P
	}
	registered := make(map[uintptr]struct {
		feature string
		mode    string
	})
	for _, hotkey := range hotkeys {
		ok, _, err := procRegisterHotKey.Call(0, hotkey.id, uintptr(modControl|modAlt), hotkey.key)
		if ok == 0 {
			fmt.Printf("RegisterHotKey id=%d failed: %v\n", hotkey.id, err)
			continue
		}
		registered[hotkey.id] = struct {
			feature string
			mode    string
		}{hotkey.feature, hotkey.mode}
		defer procUnregisterHotKey.Call(0, hotkey.id, 0)
	}
	if len(registered) == 0 {
		return
	}

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

		if msg.message == wmHotkey {
			shortcut, exists := registered[msg.wParam]
			if !exists {
				continue
			}
			if a.ctx == nil {
				continue
			}
			wailsruntime.WindowShow(a.ctx)
			wailsruntime.WindowUnminimise(a.ctx)
			wailsruntime.WindowSetAlwaysOnTop(a.ctx, true)
			wailsruntime.EventsEmit(a.ctx, "shortcut:open-feature", map[string]string{
				"feature": shortcut.feature,
				"mode":    shortcut.mode,
			})
		}
	}
}

func (a *App) setMiniWindowMode(enabled bool) {
	title, _ := syscall.UTF16PtrFromString("TimePulse")
	hwnd, _, _ := procFindWindowW.Call(0, uintptr(unsafe.Pointer(title)))
	if hwnd == 0 {
		hwnd, _, _ = procGetForegroundWindow.Call()
	}
	if hwnd == 0 {
		return
	}

	// Windows 11 的 Mica 会在 CSS 透明时留下浅色背板。迷你模式关闭
	// 系统背板并启用完全透明的 composition accent，恢复时再启用 Mica。
	backdrop := int32(2) // DWMSBT_MAINWINDOW / Mica
	accentState := int32(0)
	if enabled {
		backdrop = 1    // DWMSBT_NONE
		accentState = 2 // ACCENT_ENABLE_TRANSPARENTGRADIENT
	}
	const dwmwaSystemBackdropType = 38
	procDwmSetWindowAttribute.Call(
		hwnd,
		uintptr(dwmwaSystemBackdropType),
		uintptr(unsafe.Pointer(&backdrop)),
		unsafe.Sizeof(backdrop),
	)

	accent := accentPolicy{accentState: accentState}
	data := windowCompositionAttribData{
		attrib: 19, // WCA_ACCENT_POLICY
		data:   unsafe.Pointer(&accent),
		size:   unsafe.Sizeof(accent),
	}
	procSetWindowCompositionAttribute.Call(hwnd, uintptr(unsafe.Pointer(&data)))
}

func (a *App) screenContrastAt(x int, y int) string {
	dc, _, _ := procGetDC.Call(0)
	if dc == 0 {
		return "dark"
	}
	defer procReleaseDC.Call(0, dc)

	color, _, _ := procGetPixel.Call(dc, uintptr(x), uintptr(y))
	if color == 0xFFFFFFFF {
		return "dark"
	}
	r := float64(color & 0xFF)
	g := float64((color >> 8) & 0xFF)
	b := float64((color >> 16) & 0xFF)
	luminance := 0.2126*r + 0.7152*g + 0.0722*b
	if luminance < 145 {
		return "light"
	}
	return "dark"
}
