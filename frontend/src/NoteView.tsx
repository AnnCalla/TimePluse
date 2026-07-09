import { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { WindowSetSize, WindowSetAlwaysOnTop, WindowCenter } from '../wailsjs/runtime/runtime';
import { ThemeName } from './theme';

interface Note {
  id: string;
  title: string;
  content: string;
  createdAt: string;
}
interface NoteViewProps {
  onStickyChange?: (sticky: boolean) => void;
  theme: ThemeName;
}

export const NoteView = ({ onStickyChange, theme }: NoteViewProps) => {
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
  const [stickyTheme, setStickyTheme] = useState<'paper' | 'white' | 'dark'>('paper');
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

  // Sticky 模式：主窗口变成一张悬浮便签
  if (isStickyMode && activeNote) {
    const themeClass =
      stickyTheme === 'paper'
        ? 'bg-[#f4e1c1] text-stone-800'
        : stickyTheme === 'dark'
        ? 'bg-zinc-900 text-zinc-100'
        : 'bg-white text-gray-800';

    return (
      <div className="h-full w-full flex items-stretch justify-stretch p-2">
        <div
          className={`flex flex-col w-full h-full rounded-2xl shadow-2xl border border-black/10 overflow-hidden ${themeClass}`}
          style={{ opacity: stickyOpacity }}
        >
          <div className="flex items-center justify-between px-3 py-1.5 text-[11px] draggable select-none">
            <input
              className="flex-1 mr-2 bg-transparent border-b border-dashed border-black/20 focus:outline-none focus:border-tp-green text-xs no-drag"
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
          <div className="px-3 py-1.5 text-[10px] flex items-center justify-between gap-2 bg-black/5 no-drag">
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
              <span className="text-[10px] text-gray-500">背景</span>
              <button
                onClick={() => setStickyTheme('paper')}
                className={`px-2 py-0.5 rounded-full text-[10px] ${
                  stickyTheme === 'paper' ? 'bg-amber-700 text-white' : 'bg-amber-100 text-amber-800'
                }`}
              >
                牛皮纸
              </button>
              <button
                onClick={() => setStickyTheme('white')}
                className={`px-2 py-0.5 rounded-full text-[10px] ${
                  stickyTheme === 'white' ? 'bg-gray-700 text-white' : 'bg-gray-200 text-gray-700'
                }`}
              >
                浅色
              </button>
              <button
                onClick={() => setStickyTheme('dark')}
                className={`px-2 py-0.5 rounded-full text-[10px] ${
                  stickyTheme === 'dark' ? 'bg-black text-white' : 'bg-black/60 text-white'
                }`}
              >
                深色
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full w-full gap-4 p-4">
      {/* 左侧笔记列表 */}
      <div className="w-56 glass-panel rounded-2xl p-3 flex flex-col gap-2">
        <div className="flex justify-between items-center mb-1 text-xs text-gray-600">
          <span className="font-semibold">笔记</span>
          <button
            onClick={createNote}
            className={`px-2 py-1 rounded-full text-[11px] text-white ${
              isGray ? 'bg-gray-600 hover:bg-gray-700' : 'bg-tp-green hover:bg-lime-500'
            }`}
          >
            新建
          </button>
        </div>
        <div className="flex-1 overflow-auto space-y-1 pr-1">
          {notes.length === 0 && (
            <div className="text-[11px] text-gray-400 italic">还没有笔记，点右上角“新建”试试</div>
          )}
          {notes.map(note => (
            <button
              key={note.id}
              onClick={() => setActiveId(note.id)}
              className={`w-full text-left px-3 py-2 rounded-xl text-[11px] border bg-white/70 hover:bg-white flex flex-col gap-0.5 ${
                note.id === activeId
                  ? (isGray ? 'border-gray-700 text-gray-800' : 'border-tp-green text-gray-800')
                  : 'border-white/80 text-gray-600'
              }`}
            >
              <span className="font-medium truncate">{note.title}</span>
              <span className="text-[10px] text-gray-400 truncate">{note.createdAt}</span>
            </button>
          ))}
        </div>
      </div>

      {/* 右侧编辑 + 预览 */}
      <div className="flex-1 glass-panel rounded-2xl flex flex-col overflow-hidden">
        {!activeNote ? (
          <div className="flex-1 flex items-center justify-center text-sm text-gray-400">
            请选择或新建一条笔记
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between px-4 py-2 border-b border-white/60 bg-white/50 text-xs text-gray-600">
              <input
                className={`flex-1 mr-3 bg-transparent border-b border-dashed text-sm text-gray-800 focus:outline-none ${
                  isGray ? 'border-gray-300 focus:border-gray-700' : 'border-gray-300 focus:border-tp-green'
                }`}
                value={activeNote.title}
                onChange={e => updateActive({ title: e.target.value })}
              />
              <div className="flex gap-2">
                <button
                  className={`px-2 py-1 rounded-full text-[11px] ${
                    isGray
                      ? 'bg-gray-700/10 text-gray-700 hover:bg-gray-700/20'
                      : 'bg-tp-green/10 text-tp-green hover:bg-tp-green/20'
                  }`}
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
                className="w-1/2 h-full resize-none p-3 text-sm font-mono bg-white/60 border-r border-white/70 focus:outline-none"
                value={activeNote.content}
                onChange={e => updateActive({ content: e.target.value })}
                onPaste={handlePaste}
                placeholder="在这里用 Markdown 书写，支持粘贴图片（会以内联方式插入）。"
              />
              <div className="w-1/2 h-full p-3 overflow-auto text-sm prose prose-sm max-w-none bg-white/40">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{activeNote.content}</ReactMarkdown>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
