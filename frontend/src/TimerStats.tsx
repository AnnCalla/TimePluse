import { useEffect, useMemo, useState } from 'react';
import { CalendarDays, Clock3, Flame, RefreshCw } from 'lucide-react';
import { GetHistory } from '../wailsjs/go/main/App';
import { ThemeName } from './theme';

interface HistoryItem {
    id: string;
    taskName: string;
    duration: number;
    mode: string;
    completeAt: string;
    reflection?: string;
}

type Period = 'day' | 'week' | 'month';

interface TimerStatsProps {
    theme: ThemeName;
    onClose: () => void;
}

const toLocalDate = (value: string) => {
    const normalized = value.includes('T') ? value : value.replace(' ', 'T');
    const date = new Date(normalized);
    return Number.isNaN(date.getTime()) ? null : date;
};

const dateKey = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const startOfDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());

const startOfWeek = (date: Date) => {
    const start = startOfDay(date);
    const weekday = (start.getDay() + 6) % 7;
    start.setDate(start.getDate() - weekday);
    return start;
};

const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours === 0) return `${minutes} 分钟`;
    return `${hours} 小时 ${minutes} 分`;
};

export const TimerStats = ({ onClose }: TimerStatsProps) => {
    const [history, setHistory] = useState<HistoryItem[]>([]);
    const [period, setPeriod] = useState<Period>('week');
    const [loading, setLoading] = useState(true);

    const reload = () => {
        setLoading(true);
        GetHistory()
            .then(value => setHistory(Array.isArray(value) ? value : []))
            .catch(error => console.error('Failed to load timer history', error))
            .finally(() => setLoading(false));
    };

    useEffect(reload, []);

    const sessions = useMemo(() => history
        .map(item => ({ ...item, date: toLocalDate(item.completeAt) }))
        .filter((item): item is HistoryItem & { date: Date } => Boolean(item.date) && item.duration > 0), [history]);

    const now = new Date();
    const periodStart = period === 'day'
        ? startOfDay(now)
        : period === 'week'
            ? startOfWeek(now)
            : new Date(now.getFullYear(), now.getMonth(), 1);
    const periodEnd = period === 'day'
        ? new Date(periodStart.getFullYear(), periodStart.getMonth(), periodStart.getDate() + 1)
        : period === 'week'
            ? new Date(periodStart.getFullYear(), periodStart.getMonth(), periodStart.getDate() + 7)
            : new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const periodSessions = sessions.filter(item => item.date >= periodStart && item.date < periodEnd);
    const totalSeconds = periodSessions.reduce((sum, item) => sum + item.duration, 0);

    const dailyTotals = useMemo(() => {
        const totals = new Map<string, number>();
        sessions.forEach(item => totals.set(dateKey(item.date), (totals.get(dateKey(item.date)) || 0) + item.duration));
        return totals;
    }, [sessions]);

    const heatmapDays = useMemo(() => {
        const end = startOfDay(new Date());
        const start = new Date(end);
        start.setDate(start.getDate() - 83);
        return Array.from({ length: 84 }, (_, index) => {
            const date = new Date(start);
            date.setDate(start.getDate() + index);
            return { date, seconds: dailyTotals.get(dateKey(date)) || 0 };
        });
    }, [dailyTotals]);
    const maxDay = Math.max(1, ...heatmapDays.map(day => day.seconds));

    const streak = useMemo(() => {
        let count = 0;
        const cursor = startOfDay(new Date());
        while ((dailyTotals.get(dateKey(cursor)) || 0) > 0) {
            count += 1;
            cursor.setDate(cursor.getDate() - 1);
        }
        return count;
    }, [dailyTotals]);

    return (
        <div className="absolute inset-5 z-40 flex flex-col overflow-hidden rounded-[28px] liquid-panel p-6 text-left">
            <div className="mb-5 flex items-center justify-between">
                <div>
                    <div className="text-xs uppercase tracking-[0.24em] theme-muted">Focus analytics</div>
                    <h2 className="mt-1 text-2xl font-semibold theme-text">专注统计</h2>
                </div>
                <div className="flex gap-2">
                    <button onClick={reload} className="glass-icon-button" title="刷新"><RefreshCw size={17} /></button>
                    <button onClick={onClose} className="glass-icon-button px-4 text-xs">返回计时</button>
                </div>
            </div>

            <div className="mb-5 flex gap-2">
                {(['day', 'week', 'month'] as Period[]).map(value => (
                    <button
                        key={value}
                        onClick={() => setPeriod(value)}
                        className={`rounded-full px-4 py-1.5 text-xs transition ${period === value ? 'theme-button text-white' : 'glass-chip theme-muted'}`}
                    >
                        {value === 'day' ? '今天' : value === 'week' ? '本周' : '本月'}
                    </button>
                ))}
            </div>

            <div className="grid grid-cols-3 gap-3">
                <StatCard icon={<Clock3 size={18} />} label="工作时间" value={loading ? '读取中…' : formatDuration(totalSeconds)} />
                <StatCard icon={<CalendarDays size={18} />} label="完成会话" value={`${periodSessions.length} 次`} />
                <StatCard icon={<Flame size={18} />} label="连续专注" value={`${streak} 天`} />
            </div>

            <div className="mt-5 rounded-3xl glass-inset p-4">
                <div className="mb-3 flex items-center justify-between">
                    <span className="text-sm font-medium theme-text">近 12 周热力图</span>
                    <span className="text-[10px] theme-muted">颜色越深，专注越久</span>
                </div>
                <div className="grid grid-flow-col grid-rows-7 gap-1.5">
                    {heatmapDays.map(day => {
                        const level = day.seconds === 0 ? 0 : Math.max(1, Math.ceil(day.seconds / maxDay * 4));
                        return (
                            <div
                                key={dateKey(day.date)}
                                className={`aspect-square min-h-[13px] rounded-[4px] heat-level-${level}`}
                                title={`${dateKey(day.date)} · ${formatDuration(day.seconds)}`}
                            />
                        );
                    })}
                </div>
            </div>

            <div className="mt-5 min-h-0 flex-1 overflow-auto rounded-3xl glass-inset p-4">
                <div className="mb-2 text-sm font-medium theme-text">本周期记录</div>
                {periodSessions.length === 0 ? (
                    <div className="py-8 text-center text-xs theme-muted">还没有工作记录</div>
                ) : periodSessions.slice(0, 30).map(item => (
                    <div key={`${item.id}-${item.completeAt}`} className="flex items-center justify-between border-b border-white/10 py-2 text-xs">
                        <span className="max-w-[60%] truncate theme-text">{item.taskName}</span>
                        <span className="theme-muted">{formatDuration(item.duration)} · {item.completeAt.slice(5, 16)}</span>
                    </div>
                ))}
            </div>
        </div>
    );
};

const StatCard = ({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) => (
    <div className="rounded-3xl glass-inset p-4">
        <div className="mb-3 theme-accent">{icon}</div>
        <div className="text-[11px] theme-muted">{label}</div>
        <div className="mt-1 text-lg font-semibold theme-text">{value}</div>
    </div>
);
