import React, {useEffect, useState} from 'react';
import {useLocation, useParams} from 'react-router-dom';
import {CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis} from 'recharts';
import {format, parseISO} from 'date-fns';
import { useTranslation } from 'react-i18next';
import {backend_url} from "../config";
import ForecastError from "../components/ForecastError";

interface ForecastData {
    timr: string;
    pred_kW: number;
}

const GraphForecast: React.FC = () => {
    const { t } = useTranslation();
    const {id} = useParams<{ id: string }>();
    const token = localStorage.getItem('token');
    const location = useLocation(); // Access query parameters
    const [loading, setLoading] = useState(true);

    const [forecastData, setForecastData] = useState<ForecastData[]>([]);
    const [fromDate, setFromDate] = useState<string>(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
    const [toDate, setToDate] = useState<string>(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
    const [error, setError] = useState<string | null>(null);
    const params = new URLSearchParams(location.search);
    const type = params.get('type');
    console.log(type)
    const maxToDate = new Date(Date.now() + 13 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const fetchForecast = async () => {
        if (!token) {
            setError(t('barForecast.tokenNotFound'));
            setForecastData([]);
            setLoading(false);
            return;
        }

        if (!id || !type) {
            setError(t('barForecast.errorRetrievingData'));
            setForecastData([]);
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            const response = await fetch(
                `${backend_url}/api/forecast/getForecast?panelId=${id}&from=${fromDate} 00:00:00&to=${toDate} 00:00:00&type=${type}`,
                {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json',
                    },
                }
            );

            const responseText = await response.text();

            if (!response.ok) {
                let message = t('barForecast.errorRetrievingData');
                try {
                    const parsed = JSON.parse(responseText);
                    if (parsed?.statusText) {
                        message = parsed.statusText;
                    }
                } catch (parseError) {
                    console.error('Failed to parse error response', parseError);
                }

                setError(message);
                setForecastData([]);
                return;
            }

            try {
                const data: ForecastData[] = JSON.parse(responseText);
                setForecastData(data);
                setError(null);
            } catch (parseError) {
                console.error('Failed to parse forecast response', parseError);
                setError(t('barForecast.errorRetrievingData'));
                setForecastData([]);
            }
        } catch (error) {
            console.error(error);
            setError(t('barForecast.errorRetrievingData'));
            setForecastData([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (fromDate && toDate) {
            fetchForecast();
        }
        if (!token) {
            setError(t('barForecast.tokenNotFound'));
            setLoading(false);
            return;
        }
    }, [fromDate, toDate, token, type]);

    const handleFromDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFromDate = e.target.value;
        const newToDate = new Date(selectedFromDate);
        newToDate.setDate(newToDate.getDate() + 30);

        setFromDate(selectedFromDate);
        if (newToDate.toISOString().split('T')[0] < maxToDate) {
            setToDate(newToDate.toISOString().split('T')[0]);
        } else {
            setToDate(maxToDate);
        }
    };

    const handleToDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedToDate = e.target.value;
        const start = new Date(fromDate);
        const end = new Date(selectedToDate);
        const diffDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 3600 * 24));

        if (diffDays <= 30) {
            setToDate(selectedToDate);
        } else {
            setError('The date range should not exceed 30 days.');
        }
    };

    return (
        <div className="panel-forecast">
            <main className="forecast-main">
                <div className="date-selection-wrapper">
                    <div className="date-selection">
                        <label>
                            {t('barForecast.fromDate')}:
                            <input
                                type="date"
                                value={fromDate}
                                onChange={handleFromDateChange}
                                max={maxToDate}
                                min={"2020-01-01"}
                            />
                        </label>
                        <label style={{marginLeft: '1em'}}>
                            {t('barForecast.toDate')}:
                            <input
                                type="date"
                                value={toDate}
                                onChange={handleToDateChange}
                                min={fromDate > "2020-01-01" ? fromDate : "2020-01-01"}
                                max={maxToDate}
                            />
                        </label>

                        <button className="primary-button cta-button" onClick={fetchForecast}>{t('barForecast.okButton')}
                        </button>
                    </div>
                </div>
                {loading &&
                    <div className="loader-container">
                        <div className="loader"></div>
                        <p>{t('clusterList.loadingMessage')}</p>
                    </div>
                }
                {!loading && error && (
                    <ForecastError message={error} />
                )}
                {!loading && !error && (
                    <ResponsiveContainer width="100%" height={window.innerHeight * 0.8 - 100}>
                        <LineChart data={forecastData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#ccc"/>
                            <XAxis
                                dataKey="time"
                                tickFormatter={(tick) => format(parseISO(tick), 'MM-dd HH:mm')}
                                stroke="#333"
                            />
                            <YAxis label={{value: t('barForecast.yAxisLabel'), angle: -90, position: 'insideLeft', fill: '#333'}}/>
                            <Tooltip
                                labelFormatter={(label) => format(parseISO(label), 'yyyy-MM-dd HH:mm')}
                                contentStyle={{backgroundColor: '#e0f7fa', borderColor: '#00796b'}}
                            />
                            <Line type="monotone" dataKey="pred_kW" stroke="#004d40" strokeWidth={2} dot={false}/>
                        </LineChart>
                    </ResponsiveContainer>
                )}
            </main>
        </div>
    );
};

export default GraphForecast;
