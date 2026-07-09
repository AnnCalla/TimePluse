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

function App() {
    const [activeTab, setActiveTab] = useState('timer');
    // 极简模式状态
    const [isMini, setIsMini] = useState(false);
    const [miniContrast, setMiniContrast] = useState<'light' | 'dark'>('dark');
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

    // 监听来自 Go 端的全局快捷键事件：shortcut:open-note
    useEffect(() => {
        const off = EventsOn('shortcut:open-note', () => {
            setIsMini(false);
            setActiveTab('note');
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
                    GetScreenContrast(position.x + 150, position.y - 2),
                    GetScreenContrast(position.x + 150, position.y + 202),
                    GetScreenContrast(position.x - 2, position.y + 100),
                    GetScreenContrast(position.x + 302, position.y + 100),
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
    }, [isMini]);

    const handleToggleMini = async () => {
        if (!isMini) {
            await SetMiniWindowMode(true);
            WindowSetSize(300, 200);
            WindowSetAlwaysOnTop(true);
            setIsMini(true);

            // 暂时隐藏窗口后读取其中心下方的真实屏幕像素，避免采到窗口自身。
            window.setTimeout(async () => {
                try {
                    const position = await WindowGetPosition();
                    WindowHide();
                    await new Promise(resolve => window.setTimeout(resolve, 80));
                    const contrast = await GetScreenContrast(position.x + 150, position.y + 100);
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
            {activeTab === 'timer' && (
                <TimerView
                    isMini={isMini}
                    toggleMini={handleToggleMini}
                    pendingConfig={pendingTimerConfig}
                    onConfigConsumed={() => setPendingTimerConfig(null)}
                    theme={theme}
                    miniContrast={miniContrast}
                />
            )}
            {activeTab === 'planner' && !isMini && (
                <PlannerView onStartTimerFromPlanner={handleStartTimerFromPlanner} theme={theme} />
            )}
            {activeTab === 'planner' && isMini && (
                <div className="p-4 text-xs text-gray-400">
                    计划视图在极简模式下暂不显示，请还原窗口。
                </div>
            )}
            {activeTab === 'note' && !isMini && <NoteView onStickyChange={setIsStickyNote} theme={theme} />}
            {activeTab === 'note' && isMini && (
                <div className="p-4 text-xs text-gray-400">
                    笔记视图在极简模式下暂不显示，请还原窗口。
                </div>
            )}
        </Layout>
    )
}

export default App;
