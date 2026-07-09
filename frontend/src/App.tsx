import { useEffect, useState } from 'react';
import { Layout } from './Layout';
import { TimerView } from './TimerView';
import { PlannerView } from './PlannerView';
import { NoteView } from './NoteView';
import { WindowSetSize, WindowSetAlwaysOnTop, WindowCenter, EventsOn } from '../wailsjs/runtime/runtime';
import { isThemeName, ThemeName } from './theme';

function App() {
    const [activeTab, setActiveTab] = useState('timer');
    // 极简模式状态
    const [isMini, setIsMini] = useState(false);
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

    const handleToggleMini = () => {
        if (!isMini) {
            // -> 进入极简模式
            setIsMini(true);
            WindowSetSize(300, 200); // 变小
            WindowSetAlwaysOnTop(true); // 置顶
        } else {
            // -> 恢复正常模式
            setIsMini(false);
            WindowSetSize(1024, 650); // 恢复原大
            WindowSetAlwaysOnTop(false); // 取消置顶
            WindowCenter(); // 居中
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
