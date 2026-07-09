import { useEffect, useState } from 'react';
import { Play, Pause, Check, Minimize2, RotateCcw, Settings2, SkipForward, BarChart3 } from 'lucide-react';
import { useTimer, TimerMode } from './useTimer';
import { WindowSetSize, WindowSetAlwaysOnTop, WindowCenter } from '../wailsjs/runtime/runtime';
import { getThemeOption, ThemeName } from './theme';
import { TimerStats } from './TimerStats';

interface TimerViewProps {
    isMini: boolean;
    toggleMini: () => void;
    pendingConfig?: {
        title: string;
        expectedSeconds?: number;
    } | null;
    onConfigConsumed?: () => void;
    theme: ThemeName;
}

export const TimerView = ({ isMini, toggleMini, pendingConfig, onConfigConsumed, theme }: TimerViewProps) => {
    const [showSettings, setShowSettings] = useState(false);
    const [showStats, setShowStats] = useState(false);
    const {
        mode,
        setMode,
        time,
        progress,
        isRunning,
        toggleTimer,
        resetTimer,
        skipRound,
        finishStopwatch,
        taskName,
        setTaskName,
        setTimeLeft,
        pomodoroInitial,
        customInitial,
        setPomodoroInitial,
        setCustomInitial,
        pomodoroPhase,
        shortBreakDuration,
        longBreakDuration,
        longBreakEvery,
        completedSessions,
        setShortBreakDuration,
        setLongBreakDuration,
        setLongBreakEvery,
        autoStartBreaks,
        setAutoStartBreaks,
        autoStartWork,
        setAutoStartWork,
        notificationsEnabled,
        setNotificationsEnabled,
        tickingEnabled,
        setTickingEnabled,
    } = useTimer();

    // 来自计划模块的一次性预配置：切换到合适模式并填充任务名/时长
    useEffect(() => {
        if (!pendingConfig || !pendingConfig.title) return;
        setTaskName(pendingConfig.title);
        if (pendingConfig.expectedSeconds && pendingConfig.expectedSeconds > 0) {
            // 使用自定义倒计时时长
            setMode('custom');
            setCustomInitial(pendingConfig.expectedSeconds);
            setTimeLeft(pendingConfig.expectedSeconds);
        } else {
            setMode('pomodoro');
        }
        if (onConfigConsumed) onConfigConsumed();
    }, [pendingConfig, onConfigConsumed, setTaskName, setMode, setCustomInitial, setTimeLeft]);

    const currentInitial = mode === 'pomodoro' ? pomodoroInitial : customInitial;
    const isGray = theme === 'graphite';
    const miniText = getThemeOption(theme).miniText;

    if (isMini) {
        const compactTime = time.h === '00' ? `${time.m}:${time.s}` : `${time.h}:${time.m}:${time.s}`;
        return (
            <div
                className={`draggable flex h-full w-full cursor-move flex-col items-center justify-center bg-transparent ${
                    miniText === 'light' ? 'text-white mini-text-light' : 'text-slate-950 mini-text-dark'
                }`}
                onDoubleClick={toggleMini}
                title="拖动窗口；双击恢复完整模式"
            >
                <div className="font-mono text-6xl font-semibold tracking-[-0.08em]">{compactTime}</div>
                <div className="mt-2 max-w-[260px] truncate text-sm font-medium tracking-wide opacity-80">
                    {taskName || (pomodoroPhase === 'work' ? '准备专注' : '休息时间')}
                </div>
            </div>
        );
    }

    // 模式切换 Tab 样式
    const ModeBtn = ({ m, label }: { m: TimerMode, label: string }) => (
        <button 
            onClick={() => setMode(m)}
            className={`px-4 py-1 rounded-full text-sm font-medium transition-all ${
                mode === m
                    ? 'theme-button text-white shadow-md'
                    : 'theme-muted hover:bg-white/20'
            }`}
        >
            {label}
        </button>
    );

    return (
        <div className="h-full w-full flex flex-col items-center justify-center relative transition-all p-0">
            {showStats && <TimerStats theme={theme} onClose={() => setShowStats(false)} />}
            
            {/* --- 顶部功能栏 (仅在正常模式显示) --- */}
            {!isMini && (
                <div className="absolute top-6 w-full px-10 flex justify-between items-center animate-in fade-in slide-in-from-top-4">
                    <div className="flex gap-2 bg-gray-100/50 p-1 rounded-full backdrop-blur-sm">
                        <ModeBtn m="pomodoro" label="番茄钟" />
                        <ModeBtn m="custom" label="倒计时" />
                        <ModeBtn m="stopwatch" label="正计时" />
                    </div>
                    
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => setShowStats(true)}
                            className="glass-icon-button"
                            title="专注统计"
                        >
                            <BarChart3 size={19} />
                        </button>
                        {/* 当前模式的时长设置（精确到秒） */}
                        {mode !== 'stopwatch' && (
                            <div className="hidden sm:flex items-center gap-2 text-xs text-gray-400 bg-white/60 px-3 py-1 rounded-full backdrop-blur-sm border border-white/70">
                                <span className="uppercase tracking-wide">
                                    {mode === 'pomodoro' ? '番茄时长' : '倒计时时长'}
                                </span>
                                <DurationInputs
                                    totalSeconds={currentInitial}
                                    disabled={isRunning}
                                    onChange={(sec) => {
                                        if (isRunning) return;
                                        if (mode === 'pomodoro') {
                                            setPomodoroInitial(sec);
                                        } else if (mode === 'custom') {
                                            setCustomInitial(sec);
                                        }
                                        setTimeLeft(sec);
                                    }}
                                />
                            </div>
                        )}

                        {mode === 'pomodoro' && (
                            <button
                                onClick={() => setShowSettings(value => !value)}
                                className={`p-2 rounded-full transition-all ${
                                    showSettings
                                        ? 'theme-button text-white'
                                        : 'theme-muted hover:bg-white/20'
                                }`}
                                title="番茄钟设置"
                            >
                                <Settings2 size={19} />
                            </button>
                        )}

                        {/* 极简模式按钮 */}
                        <button 
                            onClick={toggleMini}
                            className="glass-icon-button"
                            title="进入极简模式"
                        >
                            <Minimize2 size={20} />
                        </button>
                    </div>
                </div>
            )}

            {/* 番茄状态提示（仅番茄模式 & 正常模式） */}
            {!isMini && mode === 'pomodoro' && (
                <div className="absolute top-20 flex items-center gap-3 text-[11px] theme-muted">
                    <span className="glass-chip px-3 py-1 rounded-full">
                        {pomodoroPhase === 'work' ? '专注中' : pomodoroPhase === 'shortBreak' ? '短休息' : '长休息'}
                    </span>
                    <span className="glass-chip px-3 py-1 rounded-full">
                        第 {completedSessions % Math.max(1, longBreakEvery) + 1} / {Math.max(1, longBreakEvery)} 轮
                    </span>
                </div>
            )}

            {!isMini && mode === 'pomodoro' && showSettings && (
                <div className="absolute right-8 top-20 z-30 w-64 rounded-2xl liquid-panel p-4 text-left shadow-xl">
                    <div className="mb-3 text-sm font-semibold theme-text">行为设置</div>
                    <SettingToggle label="自动开始休息" checked={autoStartBreaks} onChange={setAutoStartBreaks} theme={theme} />
                    <SettingToggle label="自动开始下一轮" checked={autoStartWork} onChange={setAutoStartWork} theme={theme} />
                    <SettingToggle label="桌面通知" checked={notificationsEnabled} onChange={setNotificationsEnabled} theme={theme} />
                    <SettingToggle label="轻微滴答声" checked={tickingEnabled} onChange={setTickingEnabled} theme={theme} />
                    <p className="mt-3 text-[10px] leading-relaxed text-gray-400">
                        时长和这些选项会自动保存。通知权限会在首次开始计时时申请。
                    </p>
                </div>
            )}

            {mode !== 'stopwatch' && (
                <div className="overflow-hidden rounded-full bg-white/20 mb-5 h-1.5 w-72">
                    <div
                        className="h-full rounded-full transition-[width] duration-300 theme-accent-bg"
                        style={{ width: `${Math.round(progress * 100)}%` }}
                    />
                </div>
            )}

            {/* --- 核心时间显示 (根据模式调整大小) --- */}
            <div className="flex items-center gap-3 sm:gap-6 mb-14 scale-100 transition-all duration-500">
                <TimeCard val={time.h} label="时" isMini={isMini} isGray={isGray} />
                <Separator isMini={isMini} isGray={isGray} />
                <TimeCard val={time.m} label="分" isMini={isMini} isGray={isGray} />
                <Separator isMini={isMini} isGray={isGray} />
                <TimeCard val={time.s} label="秒" isMini={isMini} isGray={isGray} />
            </div>

            {/* --- 任务输入框 (极简模式下只读) --- */}
            <div className="w-full mb-10 max-w-md px-8">
                    <input 
                        type="text" 
                        value={taskName}
                        onChange={(e) => setTaskName(e.target.value)}
                        placeholder="在此输入当前专注的任务..." 
                        className="w-full text-center bg-transparent border-b border-white/30 text-xl py-3 focus:outline-none transition-colors theme-text placeholder:opacity-40 focus:border-current"
                    />
            </div>

            {/* 番茄休息设置（仅番茄模式 & 正常模式） */}
            {!isMini && mode === 'pomodoro' && (
                <div className="mb-6 -mt-4 flex flex-wrap justify-center gap-4 text-xs text-gray-500">
                    <div className="flex items-center gap-2">
                        <span className="text-[11px]">短休息</span>
                        <DurationInputs
                            totalSeconds={shortBreakDuration}
                            disabled={isRunning}
                            onChange={(sec) => {
                                if (isRunning) return;
                                setShortBreakDuration(sec);
                                if (pomodoroPhase === 'shortBreak') {
                                    setTimeLeft(sec);
                                }
                            }}
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-[11px]">长休息</span>
                        <DurationInputs
                            totalSeconds={longBreakDuration}
                            disabled={isRunning}
                            onChange={(sec) => {
                                if (isRunning) return;
                                setLongBreakDuration(sec);
                                if (pomodoroPhase === 'longBreak') {
                                    setTimeLeft(sec);
                                }
                            }}
                        />
                    </div>
                    <div className="flex items-center gap-1">
                        <span className="text-[11px]">每</span>
                        <input
                            type="number"
                            min={1}
                            value={longBreakEvery}
                            disabled={isRunning}
                            onChange={(e) => {
                                if (isRunning) return;
                                const v = parseInt(e.target.value || '1', 10);
                                const safe = Number.isNaN(v) ? 1 : Math.max(1, v);
                                setLongBreakEvery(safe);
                            }}
                            className="w-10 px-1 py-0.5 text-xs text-center bg-transparent border-b border-white/30 focus:outline-none disabled:opacity-40 theme-text"
                        />
                        <span className="text-[11px]">轮工作后长休息</span>
                    </div>
                </div>
            )}

            {/* --- 控制按钮组 --- */}
            <div className="flex gap-6 items-center">
                <button 
                    onClick={toggleTimer}
                    aria-label={isRunning ? '暂停' : '开始'}
                    className="w-20 h-20 rounded-full text-white flex items-center justify-center hover:scale-105 active:scale-95 transition-all theme-button"
                >
                    {isRunning ? <Pause fill="currentColor" size={isMini?20:32} /> : <Play fill="currentColor" className="ml-1" size={isMini?20:32}/>}
                </button>

                {mode === 'pomodoro' && (
                    <button
                        onClick={skipRound}
                        className="w-14 h-14 rounded-2xl glass-inset theme-muted flex items-center justify-center transition-all hover:theme-text"
                        title={pomodoroPhase === 'work' ? '跳过本轮专注（不计入完成）' : '结束休息'}
                    >
                        <SkipForward size={isMini ? 16 : 20} />
                    </button>
                )}

                {mode === 'stopwatch' && (
                    <button
                        onClick={finishStopwatch}
                        className="w-14 h-14 rounded-2xl glass-inset theme-muted flex items-center justify-center transition-all"
                        title="完成并保存正计时"
                    >
                        <Check size={isMini ? 16 : 20} />
                    </button>
                )}
                
                {/* 极简模式：提供重置 + 还原按钮 */}
                {/* 正常模式：只显示重置按钮 */}
                    <button
                        onClick={resetTimer}
                        className="w-14 h-14 rounded-2xl glass-inset theme-muted flex items-center justify-center transition-all"
                        title="重置计时"
                    >
                        <RotateCcw size={20} />
                    </button>
            </div>
        </div>
    );
};

// 辅助：秒数转时分秒
const secondsToHMS = (total: number) => {
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = total % 60;
    return { h, m, s };
};

// 子组件：自适应大小
const TimeCard = ({ val, label, isMini, isGray }: { val: string; label: string; isMini: boolean; isGray: boolean }) => (
    <div className="flex flex-col items-center gap-1">
        <div
            className={`${
                isMini ? 'w-16 h-20 rounded-xl text-4xl' : 'w-28 h-36 sm:w-36 sm:h-44 rounded-3xl text-7xl sm:text-8xl'
            } liquid-panel theme-accent flex items-center justify-center relative font-bold font-mono transition-all duration-500`}
        >
            {val}
        </div>
        {!isMini && <span className="text-gray-400 text-xs font-medium">{label}</span>}
    </div>
);

const Separator = ({ isMini, isGray }: { isMini: boolean; isGray: boolean }) => (
    <div className={`flex flex-col gap-2 ${isMini ? 'pb-0' : 'pb-8'}`}>
        <div className="w-1.5 h-1.5 rounded-full theme-accent-bg opacity-40"></div>
        <div className="w-1.5 h-1.5 rounded-full theme-accent-bg opacity-40"></div>
    </div>
);

// 顶部用的时长输入（精确到秒）
interface DurationInputsProps {
    totalSeconds: number;
    disabled?: boolean;
    onChange: (seconds: number) => void;
}

const DurationInputs = ({ totalSeconds, disabled, onChange }: DurationInputsProps) => {
    const { h, m, s } = secondsToHMS(totalSeconds);

    const handlePartChange = (part: 'h' | 'm' | 's') => (e: React.ChangeEvent<HTMLInputElement>) => {
        if (disabled) return;
        const raw = e.target.value;
        const num = Number.isNaN(Number(raw)) ? 0 : Math.max(0, parseInt(raw || '0', 10));
        const next = { h, m, s, [part]: num } as { h: number; m: number; s: number };
        const seconds = next.h * 3600 + next.m * 60 + next.s;
        onChange(seconds);
    };

    return (
        <div className="flex items-center gap-1">
            <DurationInputPart value={h} label="时" onChange={handlePartChange('h')} disabled={disabled} />
            <span className="text-gray-300">:</span>
            <DurationInputPart value={m} label="分" onChange={handlePartChange('m')} disabled={disabled} />
            <span className="text-gray-300">:</span>
            <DurationInputPart value={s} label="秒" onChange={handlePartChange('s')} disabled={disabled} />
        </div>
    );
};

interface DurationInputPartProps {
    value: number;
    label: string;
    disabled?: boolean;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

const DurationInputPart = ({ value, label, disabled, onChange }: DurationInputPartProps) => (
    <div className="flex items-center gap-0.5">
        <input
            type="number"
            min={0}
            value={value}
            onChange={onChange}
            disabled={disabled}
            className="w-10 px-1 py-0.5 text-xs text-right bg-transparent border-b border-gray-200 focus:outline-none focus:border-tp-green disabled:text-gray-300"
        />
        <span className="text-[10px] text-gray-400">{label}</span>
    </div>
);

const SettingToggle = ({
    label,
    checked,
    onChange,
    theme,
}: {
    label: string;
    checked: boolean;
    onChange: (checked: boolean) => void;
    theme: ThemeName;
}) => (
    <label className="mb-2 flex cursor-pointer items-center justify-between gap-3 text-xs text-gray-600">
        <span>{label}</span>
        <input
            type="checkbox"
            checked={checked}
            onChange={event => onChange(event.target.checked)}
            className="sr-only"
        />
        <span className={`relative h-5 w-9 rounded-full transition-colors ${
            checked ? 'theme-accent-bg' : 'bg-gray-400/30'
        }`}>
            <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${
                checked ? 'translate-x-[18px]' : 'translate-x-0.5'
            }`} />
        </span>
    </label>
);
