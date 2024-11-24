import React from 'react';
import {Link, useLocation} from 'react-router-dom';
import {useTranslation} from "react-i18next";

const ErrorPage: React.FC = () => {
    const location = useLocation();
    const { t } = useTranslation();

    // Extract query parameters from the location object
    const params = new URLSearchParams(location.search);
    const errorText = params.get('error_text');
    const errorCode = params.get('error_code');

    return (
        <div className="not-found-container">
            <h1>{t('notFound.errorTitle')} {errorCode}</h1>
            <p> {errorText}</p>
            <Link to="/" className="btn">{t('notFound.goBack')}</Link>

        </div>
    );
};

export default ErrorPage;
