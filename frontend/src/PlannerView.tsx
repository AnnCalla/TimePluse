import { useEffect, useMemo, useState } from 'react';
import { EventsOn } from '../wailsjs/runtime/runtime';
import { ThemeName } from './theme';

export type UrgencyLevel = 1 | 2 | 3; // 1=不紧急,3=很紧急
export type ImportanceLevel = 1 | 2 | 3; // 1=不重要,3=很重要
export type Category = 'work' | 'life';

export interface TodoItem {
  id: string;
  title: string;
  urgency: UrgencyLevel;
  importance: ImportanceLevel;
  deadline?: string; // ISO 日期
  category: Category;
  done: boolean;
  reflection?: string;
  expectedMinutes?: number;
}

export interface TimerHistoryItem {
  taskName: string;
  mode: 'pomodoro' | 'custom' | 'stopwatch';
  duration: number; // 秒
  completedAt: string; // ISO
}

const nowISODate = () => new Date().toISOString().slice(0, 10);

interface PlannerViewProps {
  onStartTimerFromPlanner?: (payload: {
    title: string;
    expectedSeconds?: number;
  }) => void;
  theme: ThemeName;
}

export const PlannerView = ({ onStartTimerFromPlanner, theme }: PlannerViewProps) => {
  const [items, setItems] = useState<TodoItem[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const raw = window.localStorage.getItem('timepulse_planner_items');
      if (!raw) return [];
      const parsed = JSON.parse(raw) as TodoItem[];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });
  const [title, setTitle] = useState('');
  const [urgency, setUrgency] = useState<UrgencyLevel>(2);
  const [importance, setImportance] = useState<ImportanceLevel>(2);
  const [deadline, setDeadline] = useState<string>('');
  const [category, setCategory] = useState<Category>('work');
  const [expectedMinutesInput, setExpectedMinutesInput] = useState<string>('');

  const [editingReflectionFor, setEditingReflectionFor] = useState<TodoItem | null>(null);
  const [reflectionText, setReflectionText] = useState('');

  const [timerHistory, setTimerHistory] = useState<TimerHistoryItem[]>([]);
  const isGray = theme === 'graphite';

  // 持久化计划数据到 localStorage
  useEffect(() => {
    try {
      window.localStorage.setItem('timepulse_planner_items', JSON.stringify(items));
    } catch {
      // ignore
    }
  }, [items]);

  const addItem = () => {
    if (!title.trim()) return;
    const minutes = parseInt(expectedMinutesInput || '0', 10);
    const safeMinutes = Number.isNaN(minutes) || minutes <= 0 ? undefined : minutes;
    const id = `${Date.now()}`;
    const item: TodoItem = {
      id,
      title: title.trim(),
      urgency,
      importance,
      deadline: deadline || undefined,
      category,
      done: false,
      expectedMinutes: safeMinutes,
    };
    setItems(prev => [...prev, item]);
    setTitle('');
    setDeadline('');
    setUrgency(2);
    setImportance(2);
    setCategory('work');
    setExpectedMinutesInput('');
  };

  // 订阅计时完成事件，将其视作“已完成事项”记录
  useEffect(() => {
    const off = EventsOn('timer:completed', (data: TimerHistoryItem) => {
      setTimerHistory(prev => [data, ...prev].slice(0, 50));
    });
    return () => {
      if (off) {
        off();
      }
    };
  }, []);

  const handleDelete = (id: string) => {
    setItems(prev => prev.filter(it => it.id !== id));
  };

  const openReflection = (item: TodoItem) => {
    setEditingReflectionFor(item);
    setReflectionText(item.reflection || '');
  };

  const saveReflection = () => {
    if (!editingReflectionFor) return;
    setItems(prev =>
      prev.map(it =>
        it.id === editingReflectionFor.id ? { ...it, done: true, reflection: reflectionText.trim() } : it
      )
    );
    setEditingReflectionFor(null);
    setReflectionText('');
  };

  const quadrants = useMemo(() => {
    const q1: TodoItem[] = [];
    const q2: TodoItem[] = [];
    const q3: TodoItem[] = [];
    const q4: TodoItem[] = [];

    const weight = (it: TodoItem) => it.importance * 2 + it.urgency;

    for (const it of items) {
      const urgent = it.urgency >= 2;
      const important = it.importance >= 2;
      if (urgent && important) q1.push(it);
      else if (!urgent && important) q2.push(it);
      else if (urgent && !important) q3.push(it);
      else q4.push(it);
    }

    const sorter = (a: TodoItem, b: TodoItem) => weight(b) - weight(a);
    q1.sort(sorter);
    q2.sort(sorter);
    q3.sort(sorter);
    q4.sort(sorter);

    return { q1, q2, q3, q4 };
  }, [items]);

  const todaySummary = useMemo(() => {
    const today = nowISODate();
    const doneToday = items.filter(it => it.done && it.deadline === today);
    if (!doneToday.length) return '今天还没有完成的计划，可以先从最重要的一件小事开始。';
    return `今天你完成了 ${doneToday.length} 件计划，其中例如：${doneToday
      .slice(0, 3)
      .map(it => `「${it.title}」`)
      .join('、')}。试着回顾一下：哪些事情对长期目标最有价值？`;
  }, [items]);

  return (
    <div className="flex flex-col h-full w-full p-6 gap-4">
      {/* 顶部输入区域 */}
      <div className="glass-panel rounded-2xl p-4 flex flex-col gap-3">
        <div className="text-sm font-semibold text-gray-700">新建计划</div>
        <div className="flex flex-wrap gap-3 items-center">
          <input
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="要做什么？"
            className={`flex-1 min-w-[160px] px-3 py-2 rounded-xl border bg-white/60 text-sm focus:outline-none focus:ring-1 ${
              isGray ? 'border-gray-300 focus:ring-gray-600' : 'border-gray-200 focus:ring-tp-green'
            }`}
          />
          <select
            value={urgency}
            onChange={e => setUrgency(Number(e.target.value) as UrgencyLevel)}
            className="px-2 py-1 rounded-xl border border-gray-200 bg-white/70 text-xs"
          >
            <option value={1}>不紧急</option>
            <option value={2}>一般紧急</option>
            <option value={3}>非常紧急</option>
          </select>
          <select
            value={importance}
            onChange={e => setImportance(Number(e.target.value) as ImportanceLevel)}
            className="px-2 py-1 rounded-xl border border-gray-200 bg-white/70 text-xs"
          >
            <option value={1}>不重要</option>
            <option value={2}>比较重要</option>
            <option value={3}>非常重要</option>
          </select>
          <input
            type="date"
            value={deadline}
            onChange={e => setDeadline(e.target.value)}
            className="px-2 py-1 rounded-xl border border-gray-200 bg-white/70 text-xs"
          />
          <div className="flex items-center gap-1 text-xs text-gray-500">
            <span>预估</span>
            <input
              type="number"
              min={1}
              max={480}
              value={expectedMinutesInput}
              onChange={e => setExpectedMinutesInput(e.target.value)}
              placeholder="分钟"
              className="w-16 px-2 py-1 rounded-xl border border-gray-200 bg-white/70 text-xs text-right"
            />
            <span>分钟</span>
          </div>
          <select
            value={category}
            onChange={e => setCategory(e.target.value as Category)}
            className="px-2 py-1 rounded-xl border border-gray-200 bg-white/70 text-xs"
          >
            <option value="work">工作</option>
            <option value="life">生活</option>
          </select>
          <button
            onClick={addItem}
            className={`px-4 py-2 rounded-xl text-white text-sm font-medium shadow-sm hover:shadow-md transition ${
              isGray ? 'bg-gray-600 hover:bg-gray-700' : 'bg-tp-green hover:bg-lime-500'
            }`}
          >
            加入四象限
          </button>
        </div>
      </div>

      {/* 四象限区域 */}
      <div className="flex-1 grid grid-cols-2 grid-rows-2 gap-4">
        <Quadrant title="紧急 & 重要" color="border-red-400" items={quadrants.q1} onReflect={openReflection} onStartTimerFromPlanner={onStartTimerFromPlanner} onDelete={handleDelete} theme={theme} />
        <Quadrant title="不紧急 & 重要" color="border-orange-400" items={quadrants.q2} onReflect={openReflection} onStartTimerFromPlanner={onStartTimerFromPlanner} onDelete={handleDelete} theme={theme} />
        <Quadrant title="紧急 & 不重要" color="border-blue-400" items={quadrants.q3} onReflect={openReflection} onStartTimerFromPlanner={onStartTimerFromPlanner} onDelete={handleDelete} theme={theme} />
        <Quadrant title="不紧急 & 不重要" color="border-gray-400" items={quadrants.q4} onReflect={openReflection} onStartTimerFromPlanner={onStartTimerFromPlanner} onDelete={handleDelete} theme={theme} />
      </div>

      {/* 简易“今日总结”占位，后续可换成 AI */}
      <div className="glass-panel rounded-2xl p-4 text-xs text-gray-600">
        <div className="flex justify-between items-center mb-2">
          <span className="font-semibold text-gray-700">今日日报（占位版）</span>
          <button
            className={`px-3 py-1 rounded-full text-[11px] text-white ${
              isGray ? 'bg-gray-600 hover:bg-gray-700' : 'bg-tp-green hover:bg-lime-500'
            }`}
          >
            生成今日日报
          </button>
        </div>
        <p className="leading-relaxed whitespace-pre-line">{todaySummary}</p>
      </div>

      {/* 计时完成记录 */}
      {timerHistory.length > 0 && (
        <div className="glass-panel rounded-2xl p-4 text-xs text-gray-600">
          <div className="flex justify-between items-center mb-2">
            <span className="font-semibold text-gray-700">专注完成记录</span>
          </div>
          <div className="space-y-1 max-h-32 overflow-auto pr-1">
            {timerHistory.map((h, idx) => {
              const minutes = Math.floor(h.duration / 60);
              const seconds = h.duration % 60;
              return (
                <div key={idx} className="flex justify-between items-center text-[11px] text-gray-500">
                  <div className="truncate max-w-[55%]">{h.taskName}</div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-full bg-tp-green/10 text-[10px] text-tp-green">
                      {h.mode === 'pomodoro' ? '番茄钟' : h.mode === 'custom' ? '倒计时' : '正计时'}
                    </span>
                    <span>{minutes > 0 ? `${minutes}分${seconds.toString().padStart(2, '0')}秒` : `${seconds}秒`}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {editingReflectionFor && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-5 flex flex-col gap-3">
            <div className="font-semibold text-gray-800 text-sm mb-1">
              为「{editingReflectionFor.title}」写一句感想
            </div>
            <textarea
              value={reflectionText}
              onChange={e => setReflectionText(e.target.value)}
              rows={4}
              className={`w-full text-sm px-3 py-2 rounded-xl border bg-gray-50 focus:outline-none focus:ring-1 resize-none ${
                isGray ? 'border-gray-300 focus:ring-gray-600' : 'border-gray-200 focus:ring-tp-green'
              }`}
              placeholder="今天做得怎么样？有什么想记录的一句话？"
            />
            <div className="flex justify-end gap-2 mt-1">
              <button
                onClick={() => { setEditingReflectionFor(null); setReflectionText(''); }}
                className="px-3 py-1.5 rounded-xl text-xs text-gray-400 hover:bg-gray-100"
              >
                取消
              </button>
              <button
                onClick={saveReflection}
                className={`px-4 py-1.5 rounded-xl text-xs text-white font-medium ${
                  isGray ? 'bg-gray-700 hover:bg-gray-800' : 'bg-tp-green hover:bg-lime-500'
                }`}
              >
                保存并标记完成
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

interface QuadrantProps {
  title: string;
  color: string;
  items: TodoItem[];
  onReflect: (item: TodoItem) => void;
}

const Quadrant = ({ title, color, items, onReflect, onStartTimerFromPlanner, onDelete, theme }: QuadrantProps & {
  onStartTimerFromPlanner?: PlannerViewProps['onStartTimerFromPlanner'];
  onDelete: (id: string) => void;
  theme: ThemeName;
}) => {
  const isGray = theme === 'graphite';
  return (
    <div className={`glass-panel rounded-2xl p-3 border-l-4 ${color} flex flex-col gap-2 overflow-hidden`}>
      <div className="text-[11px] font-semibold text-gray-600 mb-1 flex justify-between items-center">
        <span>{title}</span>
        <span className="text-[10px] text-gray-400">{items.length} 项</span>
      </div>
      <div className="space-y-1 overflow-auto pr-1">
        {items.length === 0 && (
          <div className="text-[11px] text-gray-400 italic">暂时没有任务</div>
        )}
        {items.map(it => (
          <div
            key={it.id}
            className={`w-full px-3 py-2 rounded-xl bg-white/70 text-[11px] flex flex-col gap-1 border border-white/80 shadow-sm ${
              it.done ? 'opacity-60' : 'text-gray-700'
            }`}
          >
            <div className="flex justify-between items-center">
              <span className="flex items-center gap-2 max-w-[60%]">
                <button
                  onClick={() => onReflect(it)}
                  className={`w-3.5 h-3.5 rounded border flex items-center justify-center text-[9px] ${
                    it.done
                      ? (isGray ? 'border-gray-700 bg-gray-700 text-white' : 'border-tp-green bg-tp-green text-white')
                      : 'border-gray-300 bg-white'
                  }`}
                >
                  {it.done ? '✓' : ''}
                </button>
                <span className="font-medium truncate">{it.title}</span>
              </span>
              <span className="flex items-center gap-2 text-[10px] text-gray-400">
                <button
                  onClick={() => {
                    if (window.confirm('确定删除这条计划吗？')) {
                      onDelete(it.id);
                    }
                  }}
                  className="px-1.5 py-0.5 rounded-full bg-gray-100 hover:bg-gray-200 text-[10px] text-gray-500"
                >
                  删除
                </button>
                {onStartTimerFromPlanner && (
                  <button
                    onClick={() =>
                      onStartTimerFromPlanner({
                        title: it.title,
                        expectedSeconds: it.expectedMinutes ? it.expectedMinutes * 60 : undefined,
                      })
                    }
                    className={`px-2 py-0.5 rounded-full text-[10px] ${
                      isGray
                        ? 'bg-gray-700/10 text-gray-700 hover:bg-gray-700/20'
                        : 'bg-tp-green/10 text-tp-green hover:bg-tp-green/20'
                    }`}
                  >
                    开始计时
                  </button>
                )}
              </span>
            </div>
            <div className="flex justify-between items-center text-[10px] text-gray-400 mt-1">
              <span>
                紧急:{it.urgency} / 重要:{it.importance}
                {it.expectedMinutes && ` · 预估${it.expectedMinutes}分`}
              </span>
              <span className="flex items-center gap-2">
                {it.deadline && <span>截止 {it.deadline}</span>}
                <span>{it.category === 'work' ? '工作' : '生活'}</span>
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
