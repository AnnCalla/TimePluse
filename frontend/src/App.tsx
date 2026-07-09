import { useEffect, useState } from 'react';
import { Layout } from './Layout';
import { TimerView } from './TimerView';
import { PlannerView } from './PlannerView';
import { NoteView } from './NoteView';
import {
    WindowSetSize, WindowSetAlwaysOnTop, WindowCenter, EventsOn,
    WindowGetPosition, WindowHide, WindowShow,
} from '../wailsjs/runtime/runtime';
import { isThemeName, ThemeName } from './theme';
import { GetScreenContrast, SetMiniWindowMode } from '../wailsjs/go/main/App';
import { TimerMode } from './useTimer';

function App() {
    const [activeTab, setActiveTab] = useState('timer');
    // 极简模式状态
    const [isMini, setIsMini] = useState(false);
    const [miniContrast, setMiniContrast] = useState<'light' | 'dark'>('dark');
    const [miniSize, setMiniSize] = useState({ width: 300, height: 200 });
    const [requestedTimerMode, setRequestedTimerMode] = useState<TimerMode | null>(null);
    const [isStickyNote, setIsStickyNote] = useState(false);
    const [theme, setTheme] = useState<ThemeName>(() => {
        if (typeof window === 'undefined') return 'wallpaper';
        try {
            const saved = window.localStorage.getItem('timepulse_theme');
            if (saved === 'green') return 'lime';
            if (saved === 'gray') return 'graphite';
            return isThemeName(saved) ? saved : 'wallpaper';
        } catch {
            return 'wallpaper';
        }
    });

    // 从计划模块发起的“预设计时配置”
    const [pendingTimerConfig, setPendingTimerConfig] = useState<{
        title: string;
        expectedSeconds?: number;
    } | null>(null);

    const enterMini = async (feature: 'timer' | 'planner' | 'note', mode?: TimerMode) => {
        const size = feature === 'timer'
            ? { width: 300, height: 200 }
            : feature === 'planner'
                ? { width: 380, height: 330 }
                : { width: 340, height: 280 };
        if (mode) setRequestedTimerMode(mode);
        setActiveTab(feature);
        setMiniSize(size);
        await SetMiniWindowMode(true);
        WindowSetSize(size.width, size.height);
        WindowSetAlwaysOnTop(true);
        setIsMini(true);
    };

    // 监听 Go 端全局快捷键，直接唤起对应功能的迷你版本。
    useEffect(() => {
        const off = EventsOn('shortcut:open-feature', (payload: { feature?: string; mode?: string }) => {
            const feature = payload?.feature;
            if (feature !== 'timer' && feature !== 'planner' && feature !== 'note') return;
            const mode = payload?.mode;
            const timerMode = mode === 'custom' || mode === 'stopwatch' || mode === 'pomodoro' ? mode : undefined;
            enterMini(feature, timerMode);
        });
        return () => {
            if (off) off();
        };
    }, []);

    // 持久化主题
    useEffect(() => {
        try {
            window.localStorage.setItem('timepulse_theme', theme);
        } catch {
            // ignore
        }
    }, [theme]);

    useEffect(() => {
        if (!isMini) return;
        let cancelled = false;
        const refreshContrast = async () => {
            try {
                const position = await WindowGetPosition();
                const samples = await Promise.all([
                    GetScreenContrast(position.x + Math.floor(miniSize.width / 2), position.y - 2),
                    GetScreenContrast(position.x + Math.floor(miniSize.width / 2), position.y + miniSize.height + 2),
                    GetScreenContrast(position.x - 2, position.y + Math.floor(miniSize.height / 2)),
                    GetScreenContrast(position.x + miniSize.width + 2, position.y + Math.floor(miniSize.height / 2)),
                ]);
                if (!cancelled) {
                    const lightVotes = samples.filter(sample => sample === 'light').length;
                    setMiniContrast(lightVotes >= 2 ? 'light' : 'dark');
                }
            } catch {
                // Keep the last known contrast if screen sampling is temporarily unavailable.
            }
        };
        const timer = window.setInterval(refreshContrast, 1200);
        return () => {
            cancelled = true;
            window.clearInterval(timer);
        };
    }, [isMini, miniSize]);

    const handleToggleMini = async () => {
        if (!isMini) {
            const feature = activeTab === 'planner' || activeTab === 'note' ? activeTab : 'timer';
            await enterMini(feature);

            // 暂时隐藏窗口后读取其中心下方的真实屏幕像素，避免采到窗口自身。
            window.setTimeout(async () => {
                try {
                    const position = await WindowGetPosition();
                    WindowHide();
                    await new Promise(resolve => window.setTimeout(resolve, 80));
                    const contrast = await GetScreenContrast(
                        position.x + Math.floor(miniSize.width / 2),
                        position.y + Math.floor(miniSize.height / 2),
                    );
                    setMiniContrast(contrast === 'light' ? 'light' : 'dark');
                } finally {
                    WindowShow();
                }
            }, 120);
        } else {
            await SetMiniWindowMode(false);
            setIsMini(false);
            WindowSetSize(1024, 650);
            WindowSetAlwaysOnTop(false);
            WindowCenter();
        }
    };

    const handleStartTimerFromPlanner = (payload: { title: string; expectedSeconds?: number }) => {
        setPendingTimerConfig(payload);
        setActiveTab('timer');
    };

    const handleTabChange = (tab: string) => {
        setActiveTab(tab);
        if (tab !== 'note') {
            setIsStickyNote(false);
        }
    };

    return (
        <Layout
            activeTab={activeTab}
            onTabChange={handleTabChange}
            isMini={isMini}
            isStickyNote={isStickyNote}
            theme={theme}
            onThemeChange={setTheme}
        >
            <div className={`h-full w-full ${activeTab === 'timer' ? 'block' : 'hidden'}`}>
              <TimerView
                  isMini={isMini && activeTab === 'timer'}
                  toggleMini={handleToggleMini}
                  pendingConfig={pendingTimerConfig}
                  onConfigConsumed={() => setPendingTimerConfig(null)}
                  theme={theme}
                  miniContrast={miniContrast}
                  requestedMode={requestedTimerMode}
                  onRequestedModeConsumed={() => setRequestedTimerMode(null)}
              />
            </div>
            <div className={`h-full w-full ${activeTab === 'planner' ? 'block' : 'hidden'}`}>
              <PlannerView
                  onStartTimerFromPlanner={handleStartTimerFromPlanner}
                  theme={theme}
                  compact={isMini && activeTab === 'planner'}
                  onRestore={handleToggleMini}
              />
            </div>
            <div className={`h-full w-full ${activeTab === 'note' ? 'block' : 'hidden'}`}>
              <NoteView
                  onStickyChange={setIsStickyNote}
                  theme={theme}
                  compact={isMini && activeTab === 'note'}
                  onRestore={handleToggleMini}
              />
            </div>
        </Layout>
    )
}

export default App;
