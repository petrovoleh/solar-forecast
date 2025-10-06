import React from 'react';
import {useTheme} from '../context/ThemeContext';
import {useTranslation} from 'react-i18next';

const ThemeToggle: React.FC = () => {
    const {theme, resolvedTheme, toggleTheme} = useTheme();
    const {t} = useTranslation();

    const labelMap = {
        system: t('themeToggle.system'),
        light: t('themeToggle.light'),
        dark: t('themeToggle.dark')
    } as const;

    const nextTheme = theme === 'system' ? 'dark' : theme === 'dark' ? 'light' : 'system';
    const icon = resolvedTheme === 'dark' ? '🌙' : '☀️';

    return (
        <div className="theme-switcher">
            <button
                type="button"
                className="theme-toggle-button"
                onClick={toggleTheme}
                aria-label={t('themeToggle.ariaLabel', {theme: labelMap[theme]})}
                title={t('themeToggle.nextLabel', {theme: labelMap[nextTheme]})}
            >
                <span className="theme-toggle-icon" aria-hidden="true">{icon}</span>
                <span className="theme-toggle-text">{labelMap[theme]}</span>
            </button>
        </div>
    );
};

export default ThemeToggle;
