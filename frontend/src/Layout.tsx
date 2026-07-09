import React from 'react';
import { LayoutDashboard, Timer, StickyNote, X, Minus, Maximize2 } from 'lucide-react';
import { Quit, WindowMinimise, WindowToggleMaximise } from "../wailsjs/runtime/runtime"; 

interface LayoutProps {
    children: React.ReactNode;
    activeTab: string;
    onTabChange: (tab: string) => void;
    isMini: boolean;
    isStickyNote?: boolean;
    theme: 'green' | 'gray';
    onThemeToggle: () => void;
}

export const Layout: React.FC<LayoutProps> = ({ children, activeTab, onTabChange, isMini, isStickyNote, theme, onThemeToggle }) => {
    const hideChrome = isMini || (isStickyNote && activeTab === 'note');
    const isGray = theme === 'gray';
    return (
        <div className={`flex flex-col h-screen w-screen app-background text-gray-700 overflow-hidden font-sans ${isMini ? 'rounded-none border-0' : 'rounded-xl border border-white/40'}`}>
            
            {/* 极简/悬浮模式下隐藏标题栏 */}
            {!hideChrome && (
                <div className="h-10 flex items-center justify-between px-4 draggable z-50">
                    <div className={`font-bold tracking-wider text-lg flex items-center gap-2 ${isGray ? 'text-gray-700' : 'text-tp-green'}`}>
                        <span>TimePulse</span>
                    </div>
                    <div className="flex gap-2 no-drag">
                        <button onClick={onThemeToggle} className="p-1 hover:bg-black/5 rounded-full transition" title="切换主题色">
                            <span className={`w-3 h-3 rounded-full block ${isGray ? 'bg-gray-600' : 'bg-tp-green'}`}></span>
                        </button>
                        <button onClick={WindowMinimise} className="p-1 hover:bg-black/5 rounded-full transition"><Minus size={16}/></button>
                        <button onClick={WindowToggleMaximise} className="p-1 hover:bg-black/5 rounded-full transition"><Maximize2 size={16}/></button>
                        <button onClick={Quit} className="p-1 hover:bg-red-500 hover:text-white rounded-full transition"><X size={16}/></button>
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
const NavBtn = ({ icon, active, onClick, theme }: any) => (
    <button 
        onClick={onClick}
        className={`p-3 rounded-2xl transition-all duration-300 shadow-sm ${
            active 
            ? (theme === 'gray'
                ? 'bg-gray-700 text-white shadow-lg shadow-gray-500/40 scale-110'
                : 'bg-tp-green text-white shadow-lg shadow-tp-green/40 scale-110')
            : 'bg-white/50 text-gray-400 hover:bg-white hover:scale-105'
        }`}
    >
        {React.cloneElement(icon, { size: 24 })}
    </button>
);