import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const NotFound: React.FC = () => {
    const { t } = useTranslation();

    return (
        <div className="not-found-container">
            <h1>{t('notFound.title')}</h1>
            <p>{t('notFound.message')}</p>
            <Link to="/" className="btn">{t('notFound.goBack')}</Link>
        </div>
    );
};

export default NotFound;
