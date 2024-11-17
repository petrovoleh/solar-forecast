// LanguageSwitcher.tsx
import React from 'react';
import { useTranslation } from 'react-i18next';

const LanguageSwitcher: React.FC = () => {
    const { i18n } = useTranslation();

    const changeLanguage = (language: string) => {
        i18n.changeLanguage(language);
    };

    return (
        <div className="language-switcher">
            <button onClick={() => changeLanguage('en')} className="language-button">English</button>
            <button onClick={() => changeLanguage('lt')} className="language-button">Lietuvių</button>
            <button onClick={() => changeLanguage('uk')} className="language-button">Українська</button>
        </div>
    );
};

export default LanguageSwitcher;
