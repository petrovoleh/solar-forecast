import React from 'react';
import {useTranslation} from 'react-i18next';

const LanguageSwitcher: React.FC = () => {
    const {i18n} = useTranslation();

    const changeLanguage = (language: string) => {
        i18n.changeLanguage(language);
    };

    const rawLanguage = i18n.language.split('-')[0];
    const currentLanguage = rawLanguage === 'uk' ? 'ua' : rawLanguage;

    return (
        <div className="language-switcher">
            <label className="language-label" htmlFor="language-select">Language</label>
            <select
                id="language-select"
                className="language-select"
                value={currentLanguage}
                onChange={(event) => changeLanguage(event.target.value)}
            >
                <option value="lt">LT</option>
                <option value="en">EN</option>
                <option value="ua">UA</option>
            </select>
        </div>
    );
};

export default LanguageSwitcher;
