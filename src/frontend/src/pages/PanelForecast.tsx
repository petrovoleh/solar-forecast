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
    const [fromDate, setFromDate] = useState<string>(new Date().toISOString().split('T')[0]);
    const [toDate, setToDate] = useState<string>(new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!token) {
            setError('Token not found. Please log in.');
            return;
        }
    }, []);

    const fetchForecast = async () => {
        try {
            const response = await fetch(
                `http://localhost:8080/api/forecast/getForecast?panelId=${id}&from=${fromDate} 00:00:00&to=${toDate} 00:00:00`,
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

    const handleFromDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFromDate(e.target.value);
    };

    const handleToDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setToDate(e.target.value);
    };

    return (
        <div className="panel-forecast">
            <header className="header">
                <h1>Panel Forecast for Panel ID: {id}</h1>
            </header>

            <main className="forecast-main">
                {error && <p style={{ color: 'red' }}>{error}</p>}

                <div className="date-selection">
                    <label>
                        From Date:
                        <input type="date" value={fromDate} onChange={handleFromDateChange} />
                    </label>
                    <label style={{ marginLeft: '1em' }}>
                        To Date:
                        <input type="date" value={toDate} onChange={handleToDateChange} />
                    </label>
                    <button className="cta-button" onClick={fetchForecast}>OK</button>
                </div>

                <ResponsiveContainer width="100%" height={400}>
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
                        <Line type="monotone" dataKey="power_kw" stroke="#004d40" strokeWidth={2} />
                    </LineChart>
                </ResponsiveContainer>
            </main>
        </div>
    );
};

export default PanelForecast;
