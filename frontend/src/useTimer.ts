import { useCallback, useEffect, useRef, useState } from 'react';
import { SaveHistory } from '../wailsjs/go/main/App';
import { EventsEmit } from '../wailsjs/runtime/runtime';

export type TimerMode = 'pomodoro' | 'custom' | 'stopwatch';
export type PomodoroPhase = 'work' | 'shortBreak' | 'longBreak';

interface TimerSettings {
    pomodoroInitial: number;
    customInitial: number;
    shortBreakDuration: number;
    longBreakDuration: number;
    longBreakEvery: number;
    autoStartBreaks: boolean;
    autoStartWork: boolean;
    notificationsEnabled: boolean;
    tickingEnabled: boolean;
}

const DEFAULT_SETTINGS: TimerSettings = {
    pomodoroInitial: 25 * 60,
    customInitial: 10 * 60,
    shortBreakDuration: 5 * 60,
    longBreakDuration: 15 * 60,
    longBreakEvery: 4,
    autoStartBreaks: true,
    autoStartWork: false,
    notificationsEnabled: true,
    tickingEnabled: false,
};

const loadSettings = (): TimerSettings => {
    try {
        const value = JSON.parse(window.localStorage.getItem('timepulse_timer_settings') || '{}');
        return { ...DEFAULT_SETTINGS, ...value };
    } catch {
        return DEFAULT_SETTINGS;
    }
};

const playTone = (frequency: number, duration: number, volume = 0.08) => {
    try {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        const context = new AudioContextClass();
        const oscillator = context.createOscillator();
        const gain = context.createGain();
        oscillator.frequency.value = frequency;
        gain.gain.value = volume;
        oscillator.connect(gain);
        gain.connect(context.destination);
        oscillator.start();
        gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + duration);
        oscillator.stop(context.currentTime + duration);
        oscillator.onended = () => context.close();
    } catch {
        // Audio is an enhancement; timer transitions must still complete.
    }
};

export const useTimer = () => {
    const initialSettings = useRef(loadSettings()).current;
    const [mode, setMode] = useState<TimerMode>('pomodoro');
    const [pomodoroInitial, setPomodoroInitial] = useState(initialSettings.pomodoroInitial);
    const [customInitial, setCustomInitial] = useState(initialSettings.customInitial);
    const [shortBreakDuration, setShortBreakDuration] = useState(initialSettings.shortBreakDuration);
    const [longBreakDuration, setLongBreakDuration] = useState(initialSettings.longBreakDuration);
    const [longBreakEvery, setLongBreakEvery] = useState(initialSettings.longBreakEvery);
    const [autoStartBreaks, setAutoStartBreaks] = useState(initialSettings.autoStartBreaks);
    const [autoStartWork, setAutoStartWork] = useState(initialSettings.autoStartWork);
    const [notificationsEnabled, setNotificationsEnabled] = useState(initialSettings.notificationsEnabled);
    const [tickingEnabled, setTickingEnabled] = useState(initialSettings.tickingEnabled);

    const [timeLeft, setTimeLeft] = useState(pomodoroInitial);
    const [elapsed, setElapsed] = useState(0);
    const [isRunning, setIsRunning] = useState(false);
    const [taskName, setTaskName] = useState('');
    const [pomodoroPhase, setPomodoroPhase] = useState<PomodoroPhase>('work');
    const [completedSessions, setCompletedSessions] = useState(0);

    const deadlineRef = useRef<number | null>(null);
    const stopwatchStartedAtRef = useRef<number | null>(null);
    const stopwatchBaseRef = useRef(0);

    const phaseDuration =
        mode === 'custom'
            ? customInitial
            : pomodoroPhase === 'work'
                ? pomodoroInitial
                : pomodoroPhase === 'shortBreak'
                    ? shortBreakDuration
                    : longBreakDuration;

    useEffect(() => {
        const settings: TimerSettings = {
            pomodoroInitial,
            customInitial,
            shortBreakDuration,
            longBreakDuration,
            longBreakEvery,
            autoStartBreaks,
            autoStartWork,
            notificationsEnabled,
            tickingEnabled,
        };
        window.localStorage.setItem('timepulse_timer_settings', JSON.stringify(settings));
    }, [
        pomodoroInitial, customInitial, shortBreakDuration, longBreakDuration, longBreakEvery,
        autoStartBreaks, autoStartWork, notificationsEnabled, tickingEnabled,
    ]);

    const notify = useCallback((title: string, body: string) => {
        if (!notificationsEnabled || !('Notification' in window)) return;
        if (Notification.permission === 'granted') {
            new Notification(title, { body });
        }
    }, [notificationsEnabled]);

    const requestNotificationPermission = useCallback(async () => {
        if (!('Notification' in window) || Notification.permission !== 'default') return;
        await Notification.requestPermission();
    }, []);

    const saveCompletedSession = useCallback((duration: number, sessionMode: TimerMode) => {
        const cleanTaskName = taskName.trim();
        if (!cleanTaskName) return;
        SaveHistory(cleanTaskName, duration, sessionMode).catch(error => {
            console.error('Failed to save timer history', error);
        });
        EventsEmit('timer:completed', {
            taskName: cleanTaskName,
            mode: sessionMode,
            duration,
            completedAt: new Date().toISOString(),
        });
    }, [taskName]);

    const startCountdown = useCallback((seconds: number) => {
        const safeSeconds = Math.max(0, seconds);
        setTimeLeft(safeSeconds);
        deadlineRef.current = Date.now() + safeSeconds * 1000;
        setIsRunning(safeSeconds > 0);
    }, []);

    const transitionPomodoro = useCallback((completedNaturally = true) => {
        playTone(740, 0.18, 0.12);
        window.setTimeout(() => playTone(920, 0.2, 0.1), 180);

        if (pomodoroPhase === 'work') {
            if (completedNaturally) {
                saveCompletedSession(pomodoroInitial, 'pomodoro');
            }
            const nextCompleted = completedNaturally ? completedSessions + 1 : completedSessions;
            setCompletedSessions(nextCompleted);
            const longBreak = longBreakEvery > 0 && nextCompleted > 0 && nextCompleted % longBreakEvery === 0;
            const nextPhase: PomodoroPhase = longBreak ? 'longBreak' : 'shortBreak';
            const nextDuration = longBreak ? longBreakDuration : shortBreakDuration;
            setPomodoroPhase(nextPhase);
            notify(
                longBreak ? '该长休息了' : '该休息了',
                longBreak ? '完成一组专注，离开屏幕放松一下。' : '完成一轮专注，进行短暂休息。',
            );
            if (autoStartBreaks && nextDuration > 0) {
                startCountdown(nextDuration);
            } else {
                deadlineRef.current = null;
                setTimeLeft(nextDuration);
                setIsRunning(false);
            }
            return;
        }

        setPomodoroPhase('work');
        notify('准备下一轮专注', taskName.trim() || '休息结束，可以继续专注了。');
        if (autoStartWork && pomodoroInitial > 0) {
            startCountdown(pomodoroInitial);
        } else {
            deadlineRef.current = null;
            setTimeLeft(pomodoroInitial);
            setIsRunning(false);
        }
    }, [
        autoStartBreaks, autoStartWork, completedSessions, longBreakDuration, longBreakEvery,
        notify, pomodoroInitial, pomodoroPhase, saveCompletedSession, shortBreakDuration,
        startCountdown, taskName,
    ]);

    const completeCountdown = useCallback(() => {
        deadlineRef.current = null;
        if (mode === 'pomodoro') {
            transitionPomodoro(true);
            return;
        }
        setIsRunning(false);
        setTimeLeft(0);
        playTone(880, 0.3, 0.12);
        saveCompletedSession(customInitial, 'custom');
        notify('倒计时完成', taskName.trim() || '设定的倒计时已经结束。');
    }, [customInitial, mode, notify, saveCompletedSession, taskName, transitionPomodoro]);

    useEffect(() => {
        if (!isRunning) return;
        const update = () => {
            if (mode === 'stopwatch') {
                if (stopwatchStartedAtRef.current !== null) {
                    setElapsed(stopwatchBaseRef.current + Math.floor((Date.now() - stopwatchStartedAtRef.current) / 1000));
                }
                return;
            }
            if (deadlineRef.current === null) return;
            const remaining = Math.max(0, Math.ceil((deadlineRef.current - Date.now()) / 1000));
            setTimeLeft(remaining);
            if (remaining === 0) completeCountdown();
            else if (tickingEnabled) playTone(520, 0.025, 0.018);
        };
        update();
        const timer = window.setInterval(update, 250);
        return () => window.clearInterval(timer);
    }, [completeCountdown, isRunning, mode, tickingEnabled]);

    useEffect(() => {
        setIsRunning(false);
        deadlineRef.current = null;
        stopwatchStartedAtRef.current = null;
        stopwatchBaseRef.current = 0;
        if (mode === 'pomodoro') {
            setPomodoroPhase('work');
            setTimeLeft(pomodoroInitial);
        } else if (mode === 'custom') {
            setTimeLeft(customInitial);
        } else {
            setElapsed(0);
        }
    }, [mode]);

    const toggleTimer = useCallback(() => {
        if (mode !== 'pomodoro' || pomodoroPhase === 'work') {
            if (!taskName.trim()) {
                alert('请先输入当前专注的任务名称！');
                return;
            }
        }
        if (!isRunning) {
            requestNotificationPermission();
            if (mode === 'stopwatch') {
                stopwatchBaseRef.current = elapsed;
                stopwatchStartedAtRef.current = Date.now();
                setIsRunning(true);
                return;
            }
            const seconds = timeLeft > 0 ? timeLeft : phaseDuration;
            startCountdown(seconds);
            return;
        }
        if (mode === 'stopwatch' && stopwatchStartedAtRef.current !== null) {
            stopwatchBaseRef.current = elapsed;
            stopwatchStartedAtRef.current = null;
        } else if (deadlineRef.current !== null) {
            setTimeLeft(Math.max(0, Math.ceil((deadlineRef.current - Date.now()) / 1000)));
            deadlineRef.current = null;
        }
        setIsRunning(false);
    }, [
        elapsed, isRunning, mode, phaseDuration, pomodoroPhase, requestNotificationPermission,
        startCountdown, taskName, timeLeft,
    ]);

    const resetTimer = useCallback(() => {
        setIsRunning(false);
        deadlineRef.current = null;
        stopwatchStartedAtRef.current = null;
        stopwatchBaseRef.current = 0;
        if (mode === 'pomodoro') {
            setPomodoroPhase('work');
            setCompletedSessions(0);
            setTimeLeft(pomodoroInitial);
        } else if (mode === 'custom') {
            setTimeLeft(customInitial);
        } else {
            setElapsed(0);
        }
    }, [customInitial, mode, pomodoroInitial]);

    const skipRound = useCallback(() => {
        if (mode !== 'pomodoro') return;
        deadlineRef.current = null;
        setIsRunning(false);
        transitionPomodoro(false);
    }, [mode, transitionPomodoro]);

    const finishStopwatch = useCallback(() => {
        if (mode !== 'stopwatch' || elapsed <= 0) return;
        saveCompletedSession(elapsed, 'stopwatch');
        playTone(880, 0.25, 0.1);
        setIsRunning(false);
        stopwatchStartedAtRef.current = null;
        stopwatchBaseRef.current = 0;
        setElapsed(0);
    }, [elapsed, mode, saveCompletedSession]);

    const displaySeconds = mode === 'stopwatch' ? elapsed : timeLeft;
    const progress = mode === 'stopwatch' || phaseDuration <= 0
        ? 0
        : Math.min(1, Math.max(0, 1 - timeLeft / phaseDuration));

    const formatTime = (seconds: number) => ({
        h: Math.floor(seconds / 3600).toString().padStart(2, '0'),
        m: Math.floor((seconds % 3600) / 60).toString().padStart(2, '0'),
        s: Math.floor(seconds % 60).toString().padStart(2, '0'),
    });

    return {
        mode, setMode,
        time: formatTime(displaySeconds),
        timeLeft,
        progress,
        isRunning, toggleTimer, resetTimer, skipRound, finishStopwatch,
        taskName, setTaskName,
        setTimeLeft,
        pomodoroInitial, customInitial,
        setPomodoroInitial, setCustomInitial,
        pomodoroPhase,
        shortBreakDuration, longBreakDuration, longBreakEvery, completedSessions,
        setShortBreakDuration, setLongBreakDuration, setLongBreakEvery,
        autoStartBreaks, setAutoStartBreaks,
        autoStartWork, setAutoStartWork,
        notificationsEnabled, setNotificationsEnabled,
        tickingEnabled, setTickingEnabled,
    };
};
