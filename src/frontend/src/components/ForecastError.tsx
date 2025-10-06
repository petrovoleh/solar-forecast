import React from 'react';

interface ForecastErrorProps {
    message: string;
    title?: string;
}

const ForecastError: React.FC<ForecastErrorProps> = ({ title, message }) => (
    <div className="forecast-error" role="alert">
        {title && <h2 className="forecast-error__title">{title}</h2>}
        <p className="forecast-error__message">{message}</p>
    </div>
);

export default ForecastError;
