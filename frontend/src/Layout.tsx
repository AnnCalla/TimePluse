import React, { useState } from 'react';
import { LayoutDashboard, Timer, StickyNote, X, Minus, Maximize2, EyeOff } from 'lucide-react';
import { Quit, WindowHide, WindowMinimise, WindowToggleMaximise } from "../wailsjs/runtime/runtime"; 
import { THEME_OPTIONS, ThemeName } from './theme';

interface LayoutProps {
    children: React.ReactNode;
    activeTab: string;
    onTabChange: (tab: string) => void;
    isMini: boolean;
    isStickyNote?: boolean;
    theme: ThemeName;
    onThemeChange: (theme: ThemeName) => void;
}

export const Layout: React.FC<LayoutProps> = ({ children, activeTab, onTabChange, isMini, isStickyNote, theme, onThemeChange }) => {
    const [showThemes, setShowThemes] = useState(false);
    const hideChrome = isMini || (isStickyNote && activeTab === 'note');
    return (
        <div
            data-theme={theme}
            className={`flex flex-col h-screen w-screen app-background theme-text overflow-hidden font-sans ${isMini ? 'mini-shell rounded-none border-0' : 'rounded-xl border border-white/30'}`}
        >
            
            {/* 极简/悬浮模式下隐藏标题栏 */}
            {!hideChrome && (
                <div className="h-10 flex items-center justify-between px-4 draggable z-50">
                    <div className="font-bold tracking-wider text-lg flex items-center gap-2 theme-accent">
                        <span>TimePulse</span>
                    </div>
                    <div className="flex gap-2 no-drag">
                        <div className="relative">
                            <button onClick={() => setShowThemes(value => !value)} className="p-1 hover:bg-white/20 rounded-full transition" title="切换液态玻璃主题">
                                <span className="w-3 h-3 rounded-full block theme-accent-bg"></span>
                            </button>
                            {showThemes && (
                                <div className="absolute right-0 top-8 z-[80] w-40 rounded-2xl liquid-panel p-2 shadow-2xl">
                                    {THEME_OPTIONS.map(option => (
                                        <button
                                            key={option.id}
                                            onClick={() => { onThemeChange(option.id); setShowThemes(false); }}
                                            className="flex w-full items-center gap-2 rounded-xl px-2 py-2 text-left text-xs hover:bg-white/20"
                                        >
                                            <span className="h-4 w-4 rounded-full border border-white/50" style={{ background: option.swatch }} />
                                            <span>{option.label}</span>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                        <button onClick={WindowMinimise} className="p-1 hover:bg-black/5 rounded-full transition"><Minus size={16}/></button>
                        <button onClick={WindowToggleMaximise} className="p-1 hover:bg-black/5 rounded-full transition"><Maximize2 size={16}/></button>
                        <button
                            onClick={WindowHide}
                            className="p-1 hover:bg-white/25 rounded-full transition"
                            title="隐藏到后台（快捷键可再次唤起）"
                        >
                            <EyeOff size={16}/>
                        </button>
                        <button
                            onClick={Quit}
                            className="p-1 hover:bg-red-500 hover:text-white rounded-full transition"
                            title="彻底退出 TimePulse"
                        >
                            <X size={16}/>
                        </button>
                    </div>
                </div>
            )}

            <div className="flex flex-1 overflow-hidden">
                {/* 极简/悬浮模式下隐藏侧边栏 */}
                {!hideChrome && (
                    <div className="w-20 flex flex-col items-center justify-center gap-6 z-40">
                        <NavBtn
                            icon={<Timer />}
                            active={activeTab === 'timer'}
                            onClick={() => onTabChange('timer')}
                            theme={theme}
                            label="计时"
                        />
                        <NavBtn
                            icon={<LayoutDashboard />}
                            active={activeTab === 'planner'}
                            onClick={() => onTabChange('planner')}
                            theme={theme}
                            label="计划"
                        />
                        <NavBtn
                            icon={<StickyNote />}
                            active={activeTab === 'note'}
                            onClick={() => onTabChange('note')}
                            theme={theme}
                            label="笔记"
                        />
                    </div>
                )}

                {/* 内容容器 */}
                <main className="flex-1 h-full w-full flex items-center justify-center">
                    {children}
                </main>
            </div>
        </div>
    );
};

// 导航按钮样式微调
const NavBtn = ({ icon, active, onClick }: any) => (
    <button 
        onClick={onClick}
        className={`p-3 rounded-2xl transition-all duration-300 shadow-sm ${
            active 
            ? 'theme-button text-white shadow-lg scale-110'
            : 'bg-white/20 theme-muted hover:bg-white/35 hover:scale-105'
        }`}
    >
        {React.cloneElement(icon, { size: 24 })}
    </button>
);
