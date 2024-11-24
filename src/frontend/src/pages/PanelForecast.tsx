import React, {useEffect, useState} from 'react';
import {useLocation, useNavigate, useParams} from 'react-router-dom';
import {CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis} from 'recharts';
import {format, parseISO} from 'date-fns';
import { useTranslation } from 'react-i18next';
import './Forecast.css';
import {backend_url} from "../config";

interface ForecastData {
    datetime: string;
    power_kw: number;
}

const PanelForecast: React.FC = () => {
    const { t } = useTranslation();
    const {id} = useParams<{ id: string }>();
    const navigate = useNavigate();
    const token = localStorage.getItem('token');
    const location = useLocation(); // Access query parameters

    const [forecastData, setForecastData] = useState<ForecastData[]>([]);
    const [fromDate, setFromDate] = useState<string>(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
    const [toDate, setToDate] = useState<string>(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
    const [error, setError] = useState<string | null>(null);
    const params = new URLSearchParams(location.search);
    const type = params.get('type');
    console.log(type)
    const maxToDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const fetchForecast = async () => {
        try {
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

            if (!response.ok) {
                const responseBody = await response.json(); // Wait for the JSON body
                // throw new Error(`Error: ${response.status} - ${responseBody.statusText}`);
                if(responseBody.statusText) {
                    navigate(`/error?error_text=${encodeURIComponent(responseBody.statusText)}&error_code=${response.status}`);
                    return;
                }else{
                    navigate(`/error?error_text=Unknown%20error%20occurred&error_code=${response.status}`);
                    return;
                }
            }

            const data = await response.json();
            setForecastData(data);
            setError(null);
        } catch (error) {
            navigate(`/error?error_text=Unknown%20error%20occurred&error_code=400`);
            console.error(error);
        }
    };

    useEffect(() => {
        if (fromDate && toDate) {
            fetchForecast();
        }
        if (!token) {
            setError(t('barForecast.tokenNotFound'));
            return;
        }
    }, [fromDate, toDate, token]);

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
                {error && <p style={{color: 'red'}}>{error}</p>}
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

                        <button className="cta-button" onClick={fetchForecast}>{t('barForecast.okButton')}
                        </button>
                    </div>
                </div>

                <ResponsiveContainer width="100%" height={window.innerHeight * 0.8 - 100}>
                    <LineChart data={forecastData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#ccc"/>
                        <XAxis
                            dataKey="datetime"
                            tickFormatter={(tick) => format(parseISO(tick), 'MM-dd HH:mm')}
                            stroke="#333"
                        />
                        <YAxis label={{value: t('barForecast.yAxisLabel'), angle: -90, position: 'insideLeft', fill: '#333'}}/>
                        <Tooltip
                            labelFormatter={(label) => format(parseISO(label), 'yyyy-MM-dd HH:mm')}
                            contentStyle={{backgroundColor: '#e0f7fa', borderColor: '#00796b'}}
                        />
                        <Line type="monotone" dataKey="power_kw" stroke="#004d40" strokeWidth={2} dot={false}/>
                    </LineChart>
                </ResponsiveContainer>
            </main>
        </div>
    );
};

export default PanelForecast;
