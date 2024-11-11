import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer } from 'recharts';
import { format, parseISO } from 'date-fns';
import './Forecast.css';

interface ForecastData {
    datetime: string;
    power_kw: number;
}

const PanelForecast: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const token = localStorage.getItem('token');

    const [forecastData, setForecastData] = useState<ForecastData[]>([]);
    const [fromDate, setFromDate] = useState<string>(new Date(Date.now() - 7*24 * 60 * 60 * 1000).toISOString().split('T')[0]);
    const [toDate, setToDate] = useState<string>(new Date(Date.now() + 7*24 * 60 * 60 * 1000).toISOString().split('T')[0]);
    const [error, setError] = useState<string | null>(null);

    const maxToDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const fetchForecast = async () => {
        try {
            const response = await fetch(
                `http://backend:8080/api/forecast/getForecast?panelId=${id}&from=${fromDate} 00:00:00&to=${toDate} 00:00:00`,
                {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json',
                    },
                }
            );

            if (!response.ok) {
                throw new Error(`Error: ${response.status} - ${response.statusText}`);
            }

            const data = await response.json();
            setForecastData(data);
            setError(null);
        } catch (error) {
            setError('Failed to retrieve forecast data.');
            console.error(error);
        }
    };

    useEffect(() => {
        if (fromDate && toDate) {
            fetchForecast();
        }
        if (!token) {
            setError('Token not found. Please log in.');
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
                {error && <p style={{ color: 'red' }}>{error}</p>}
                <div className="date-selection-wrapper">
                    <div className="date-selection">
                        <label>
                            From Date:
                            <input
                                type="date"
                                value={fromDate}
                                onChange={handleFromDateChange}
                                max={maxToDate}
                                min={"2020-01-01"}
                            />
                        </label>
                        <label style={{ marginLeft: '1em' }}>
                            To Date:
                            <input
                                type="date"
                                value={toDate}
                                onChange={handleToDateChange}
                                min={fromDate > "2020-01-01" ? fromDate : "2020-01-01"}
                                max={maxToDate}
                            />
                        </label>

                        <button className="cta-button" onClick={fetchForecast}>OK</button>
                    </div>
                </div>

                <ResponsiveContainer width="100%" height={800}>
                    <LineChart data={forecastData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#ccc" />
                        <XAxis
                            dataKey="datetime"
                            tickFormatter={(tick) => format(parseISO(tick), 'MM-dd HH:mm')}
                            stroke="#333"
                        />
                        <YAxis label={{ value: 'Power (kW)', angle: -90, position: 'insideLeft', fill: '#333' }} />
                        <Tooltip
                            labelFormatter={(label) => format(parseISO(label), 'yyyy-MM-dd HH:mm')}
                            contentStyle={{ backgroundColor: '#e0f7fa', borderColor: '#00796b' }}
                        />
                        <Line type="monotone" dataKey="power_kw" stroke="#004d40" strokeWidth={2} dot={false} />
                    </LineChart>
                </ResponsiveContainer>
            </main>
        </div>
    );
};

export default PanelForecast;
