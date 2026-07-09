import { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { WindowSetSize, WindowSetAlwaysOnTop, WindowCenter } from '../wailsjs/runtime/runtime';
import { ThemeName } from './theme';
import { THEME_OPTIONS } from './theme';
import { Minimize2 } from 'lucide-react';

interface Note {
  id: string;
  title: string;
  content: string;
  createdAt: string;
}
interface NoteViewProps {
  onStickyChange?: (sticky: boolean) => void;
  theme: ThemeName;
  compact?: boolean;
  onRestore?: () => void;
}

export const NoteView = ({ onStickyChange, theme, compact, onRestore }: NoteViewProps) => {
  const [notes, setNotes] = useState<Note[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const raw = window.localStorage.getItem('timepulse_notes');
      if (!raw) return [];
      const parsed = JSON.parse(raw) as Note[];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });
  const [activeId, setActiveId] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    try {
      const saved = window.localStorage.getItem('timepulse_notes_activeId');
      return saved || null;
    } catch {
      return null;
    }
  });
  const [isStickyMode, setIsStickyMode] = useState(false);
  const [stickyOpacity, setStickyOpacity] = useState(0.9);
  const [stickyTheme, setStickyTheme] = useState<ThemeName>(theme);
  const isGray = theme === 'graphite';

  const activeNote = notes.find(n => n.id === activeId) || null;

  useEffect(() => {
    if (!activeId && notes.length > 0) {
      setActiveId(notes[0].id);
    }
  }, [notes, activeId]);

  // 持久化笔记与当前激活 ID
  useEffect(() => {
    try {
      window.localStorage.setItem('timepulse_notes', JSON.stringify(notes));
      window.localStorage.setItem('timepulse_notes_activeId', activeId || '');
    } catch {
      // ignore
    }
  }, [notes, activeId]);

  const createNote = () => {
    const id = `${Date.now()}`;
    const note: Note = {
      id,
      title: '未命名笔记',
      content: '',
      createdAt: new Date().toISOString().slice(0, 16).replace('T', ' '),
    };
    setNotes(prev => [note, ...prev]);
    setActiveId(id);
  };

  const updateActive = (patch: Partial<Note>) => {
    if (!activeNote) return;
    setNotes(prev => prev.map(n => (n.id === activeNote.id ? { ...n, ...patch } : n)));
  };

  const deleteActive = () => {
    if (!activeNote) return;
    setNotes(prev => prev.filter(n => n.id !== activeNote.id));
    setActiveId(null);
  };

  const enterSticky = () => {
    if (!activeNote) return;
    setIsStickyMode(true);
    WindowSetSize(320, 260);
    WindowSetAlwaysOnTop(true);
    if (onStickyChange) onStickyChange(true);
  };

  const exitSticky = () => {
    setIsStickyMode(false);
    WindowSetAlwaysOnTop(false);
    WindowSetSize(1024, 650);
    WindowCenter();
    if (onStickyChange) onStickyChange(false);
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    if (!activeNote) return;
    const items = e.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.type.startsWith('image/')) {
        const file = item.getAsFile();
        if (!file) continue;
        e.preventDefault();
        const reader = new FileReader();
        reader.onload = () => {
          const dataUrl = reader.result as string;
          // 先用 data URL 方案，后续可改为调用 Go 端保存为本地文件
          const snippet = `\n![](${dataUrl})\n`;
          updateActive({ content: (activeNote.content || '') + snippet });
        };
        reader.readAsDataURL(file);
        break;
      }
    }
  };

  if (compact) {
    return (
      <div className="draggable h-full w-full p-2" onDoubleClick={onRestore} title="拖动窗口；双击空白处恢复">
        <div className="liquid-panel flex h-full w-full flex-col overflow-hidden rounded-3xl p-3">
          <div className="mb-2 flex items-center justify-between">
            {activeNote ? (
              <input
                value={activeNote.title}
                onChange={event => updateActive({ title: event.target.value })}
                onDoubleClick={event => event.stopPropagation()}
                className="no-drag min-w-0 flex-1 bg-transparent text-sm font-semibold theme-text outline-none"
              />
            ) : <span className="text-sm font-semibold theme-text">快速便签</span>}
            <div className="no-drag flex gap-1">
              <button onClick={createNote} className="glass-icon-button px-3 text-[10px]">新建</button>
              <button onClick={onRestore} className="glass-icon-button px-3 text-[10px]">还原</button>
            </div>
          </div>
          {activeNote ? (
            <textarea
              value={activeNote.content}
              onChange={event => updateActive({ content: event.target.value })}
              onPaste={handlePaste}
              onDoubleClick={event => event.stopPropagation()}
              placeholder="随手记下此刻的想法…"
              className="no-drag min-h-0 flex-1 resize-none rounded-2xl glass-inset p-3 text-xs leading-relaxed theme-text outline-none placeholder:opacity-50"
            />
          ) : (
            <button onClick={createNote} className="no-drag m-auto theme-button rounded-2xl px-4 py-2 text-xs text-white">
              创建第一条便签
            </button>
          )}
        </div>
      </div>
    );
  }

  // Sticky 模式：主窗口变成一张悬浮便签
  if (isStickyMode && activeNote) {
    return (
      <div className="h-full w-full flex items-stretch justify-stretch p-2">
        <div
          data-theme={stickyTheme}
          className="liquid-panel flex flex-col w-full h-full rounded-2xl overflow-hidden"
          style={{ opacity: stickyOpacity }}
        >
          <div className="flex items-center justify-between px-3 py-1.5 text-[11px] draggable select-none">
            <input
              className="flex-1 mr-2 bg-transparent border-b border-dashed border-white/30 focus:outline-none text-xs no-drag theme-text"
              value={activeNote.title}
              onChange={e => updateActive({ title: e.target.value })}
            />
            <div className="flex items-center gap-1 no-drag">
              <button
                onClick={exitSticky}
                className="px-2 py-0.5 rounded-full text-[10px] bg-black/5 hover:bg-black/10"
              >
                还原
              </button>
              <button
                onClick={deleteActive}
                className="px-2 py-0.5 rounded-full text-[10px] bg-red-500/80 text-white hover:bg-red-500"
              >
                删除
              </button>
            </div>
          </div>
          <textarea
            className="flex-1 w-full resize-none px-3 py-2 text-xs leading-relaxed bg-transparent focus:outline-none"
            value={activeNote.content}
            onChange={e => updateActive({ content: e.target.value })}
            onPaste={handlePaste}
            placeholder="这是一个悬浮便签，可拖动到屏幕任意位置。"
          />
          <div className="px-3 py-1.5 text-[10px] flex items-center justify-between gap-2 bg-white/5 no-drag">
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-gray-500">透明度</span>
              <input
                type="range"
                min={0.4}
                max={1}
                step={0.05}
                value={stickyOpacity}
                onChange={e => setStickyOpacity(parseFloat(e.target.value))}
                className={`w-24 ${isGray ? 'accent-gray-700' : 'accent-tp-green'}`}
              />
            </div>
            <div className="flex items-center gap-1">
              <span className="mr-1 text-[10px] theme-muted">主题</span>
              {THEME_OPTIONS.map(option => (
                <button
                  key={option.id}
                  onClick={() => setStickyTheme(option.id)}
                  className={`h-4 w-4 rounded-full border transition-transform ${
                    stickyTheme === option.id ? 'scale-125 border-current' : 'border-white/50'
                  }`}
                  style={{ backgroundColor: option.swatch }}
                  title={option.label}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full w-full gap-4 p-4">
      {/* 左侧笔记列表 */}
      <div className="w-56 liquid-panel rounded-2xl p-3 flex flex-col gap-2">
        <div className="flex justify-between items-center mb-1 text-xs theme-muted">
          <span className="font-semibold">笔记</span>
          <div className="flex items-center gap-1">
            <button onClick={onRestore} className="glass-icon-button theme-control" title="缩小便签">
              <Minimize2 size={15} />
            </button>
            <button
              onClick={createNote}
              className="px-2 py-1 rounded-full text-[11px] text-white theme-button"
            >
              新建
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-auto space-y-1 pr-1">
          {notes.length === 0 && (
            <div className="text-[11px] text-gray-400 italic">还没有笔记，点右上角“新建”试试</div>
          )}
          {notes.map(note => (
            <button
              key={note.id}
              onClick={() => setActiveId(note.id)}
              className={`w-full text-left px-3 py-2 rounded-xl text-[11px] glass-inset flex flex-col gap-0.5 ${
                note.id === activeId
                  ? 'border-current theme-text'
                  : 'theme-muted'
              }`}
            >
              <span className="font-medium truncate">{note.title}</span>
              <span className="text-[10px] text-gray-400 truncate">{note.createdAt}</span>
            </button>
          ))}
        </div>
      </div>

      {/* 右侧编辑 + 预览 */}
      <div className="flex-1 liquid-panel rounded-2xl flex flex-col overflow-hidden">
        {!activeNote ? (
          <div className="flex-1 flex items-center justify-center text-sm text-gray-400">
            请选择或新建一条笔记
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between px-4 py-2 border-b border-white/20 bg-white/5 text-xs theme-muted">
              <input
                className="flex-1 mr-3 bg-transparent border-b border-dashed border-white/30 text-sm theme-text focus:outline-none"
                value={activeNote.title}
                onChange={e => updateActive({ title: e.target.value })}
              />
              <div className="flex gap-2">
                <button
                  className="px-2 py-1 rounded-full text-[11px] theme-control"
                  title="以悬浮便签形式显示当前笔记"
                  onClick={enterSticky}
                  disabled={!activeNote}
                >
                  悬浮
                </button>
                <button
                  className="px-2 py-1 rounded-full text-[11px] bg-gray-100 text-gray-500 hover:bg-gray-200"
                  title="删除笔记"
                  onClick={deleteActive}
                >
                  删除
                </button>
              </div>
            </div>
            <div className="flex flex-1 overflow-hidden">
              <textarea
                className="w-1/2 h-full resize-none p-3 text-sm font-mono bg-white/10 theme-text border-r border-white/20 focus:outline-none"
                value={activeNote.content}
                onChange={e => updateActive({ content: e.target.value })}
                onPaste={handlePaste}
                placeholder="在这里用 Markdown 书写，支持粘贴图片（会以内联方式插入）。"
              />
              <div className="w-1/2 h-full p-3 overflow-auto text-sm prose prose-sm max-w-none bg-white/5 theme-text">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{activeNote.content}</ReactMarkdown>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
