export type ThemeName = 'lime' | 'graphite' | 'pearl' | 'sky' | 'wallpaper';

export interface ThemeOption {
    id: ThemeName;
    label: string;
    swatch: string;
    miniText: 'light' | 'dark';
}

export const THEME_OPTIONS: ThemeOption[] = [
    { id: 'lime', label: '青柠玻璃', swatch: '#8bd450', miniText: 'dark' },
    { id: 'graphite', label: '黑曜玻璃', swatch: '#20262f', miniText: 'light' },
    { id: 'pearl', label: '珍珠玻璃', swatch: '#f4f1e8', miniText: 'dark' },
    { id: 'sky', label: '晴空玻璃', swatch: '#69b9e5', miniText: 'dark' },
    { id: 'wallpaper', label: '壁纸取色', swatch: '#31557d', miniText: 'light' },
];

export const isThemeName = (value: string | null): value is ThemeName =>
    THEME_OPTIONS.some(option => option.id === value);

export const getThemeOption = (theme: ThemeName) =>
    THEME_OPTIONS.find(option => option.id === theme) || THEME_OPTIONS[0];
