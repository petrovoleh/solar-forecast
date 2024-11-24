import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { format, parseISO } from 'date-fns';
import './Forecast.css';
import { useTranslation } from 'react-i18next';
import { backend_url } from "../config";

interface DailyTotalData {
    date: string;
    totalEnergy_kwh: number;
}

const BarForecast: React.FC = () => {
    const { t } = useTranslation();
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const location = useLocation();

    const token = localStorage.getItem('token');
    const maxToDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const [dailyTotals, setDailyTotals] = useState<DailyTotalData[]>([]);
    const [totalEnergySum, setTotalEnergySum] = useState<number>(0);
    const [fromDate, setFromDate] = useState<string>(
        new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    );
    const [toDate, setToDate] = useState<string>(
        new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    );
    const [error, setError] = useState<string | null>(null);
    const params = new URLSearchParams(location.search);
    const type = params.get('type');

    const fetchDailyTotals = async () => {
        try {
            const response = await fetch(
                `${backend_url}/api/forecast/getTotal?panelId=${id}&from=${fromDate} 00:00:00&to=${toDate} 00:00:00&type=${type}`,
                {
                    method: 'GET',
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

            const sortedData = data.sort((a: DailyTotalData, b: DailyTotalData) =>
                new Date(a.date).getTime() - new Date(b.date).getTime()
            );

            const totalSum = sortedData.reduce((sum: number, item: DailyTotalData) => sum + item.totalEnergy_kwh, 0);

            setDailyTotals(sortedData);
            setTotalEnergySum(totalSum);
            setError(null);
        } catch (error) {
            navigate(`/error?error_text=Unknown%20error%20occurred&error_code=400`);

            // setError(t('barForecast.errorRetrievingData'));
            console.error(error);
        }
    };

    useEffect(() => {
        if (fromDate && toDate) {
            fetchDailyTotals();
        }
        if (!token) {
            setError(t('barForecast.tokenNotFound'));
            return;
        }
    }, [fromDate, toDate, token]);

    const handleFromDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFromDate(e.target.value);
    };

    const handleToDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setToDate(e.target.value);
    };

    return (
        <div className="panel-forecast">
            <main className="forecast-main">
                {error && <p style={{ color: 'red' }}>{error}</p>}
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
                        <label style={{ marginLeft: '1em' }}>
                            {t('barForecast.toDate')}:
                            <input
                                type="date"
                                value={toDate}
                                onChange={handleToDateChange}
                                max={maxToDate}
                                min={fromDate > "2020-01-01" ? fromDate : "2020-01-01"}
                            />
                        </label>
                        <button className="cta-button" onClick={fetchDailyTotals}>
                            {t('barForecast.okButton')}
                        </button>
                        <p className="total-energy-text">
                            {t('barForecast.totalEnergyGenerated', { total: totalEnergySum.toFixed(2) })}
                        </p>
                    </div>
                </div>

                <ResponsiveContainer width="100%" height={window.innerHeight * 0.8 - 100}>
                    <BarChart data={dailyTotals}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#ccc" />
                        <XAxis
                            dataKey="date"
                            tickFormatter={(tick) => format(parseISO(tick), 'MM-dd')}
                            stroke="#333"
                        />
                        <YAxis
                            label={{
                                value: t('barForecast.yAxisLabel'),
                                angle: -90,
                                position: 'insideLeft',
                                fill: '#333',
                            }}
                        />
                        <Tooltip
                            labelFormatter={(label) => format(parseISO(label), 'yyyy-MM-dd')}
                            contentStyle={{ backgroundColor: '#e0f7fa', borderColor: '#00796b' }}
                        />
                        <Bar dataKey="totalEnergy_kwh" fill="#004d40" />
                    </BarChart>
                </ResponsiveContainer>
            </main>
        </div>
    );
};

export default BarForecast;
