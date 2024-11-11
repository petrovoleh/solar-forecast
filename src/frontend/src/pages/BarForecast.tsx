import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer } from 'recharts';
import { format, parseISO } from 'date-fns';
import './Forecast.css';

interface DailyTotalData {
    date: string;
    totalEnergy_kwh: number;
}

const BarForecast: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const token = localStorage.getItem('token');
    const maxToDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const [dailyTotals, setDailyTotals] = useState<DailyTotalData[]>([]);
    const [totalEnergySum, setTotalEnergySum] = useState<number>(0);
    const [fromDate, setFromDate] = useState<string>(new Date(Date.now() - 7*24 * 60 * 60 * 1000).toISOString().split('T')[0]);
    const [toDate, setToDate] = useState<string>(new Date(Date.now() + 7*24 * 60 * 60 * 1000).toISOString().split('T')[0]);
    const [error, setError] = useState<string | null>(null);

    const fetchDailyTotals = async () => {
        try {
            const response = await fetch(
                `http://backend:8080/api/forecast/getTotal?panelId=${id}&from=${fromDate} 00:00:00&to=${toDate} 00:00:00`,
                {
                    method: 'GET',
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

            // Sort data by date
            const sortedData = data.sort((a: DailyTotalData, b: DailyTotalData) =>
                new Date(a.date).getTime() - new Date(b.date).getTime()
            );

            // Calculate total energy sum
            const totalSum = sortedData.reduce((sum: number, item: DailyTotalData) => sum + item.totalEnergy_kwh, 0);

            setDailyTotals(sortedData);
            setTotalEnergySum(totalSum);
            setError(null);
        } catch (error) {
            setError('Failed to retrieve daily totals.');
            console.error(error);
        }
    };

    useEffect(() => {
        if (fromDate && toDate) {
            fetchDailyTotals();
        }
        if (!token) {
            setError('Token not found. Please log in.');
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
                            From Date:
                            <input type="date" value={fromDate} onChange={handleFromDateChange} max={maxToDate}
                                   min={"2020-01-01"}/>
                        </label>
                        <label style={{ marginLeft: '1em' }}>
                            To Date:
                            <input type="date" value={toDate} onChange={handleToDateChange} max={maxToDate}
                                   min={fromDate > "2020-01-01" ? fromDate : "2020-01-01"}/>
                        </label>
                        <button className="cta-button" onClick={fetchDailyTotals}>OK</button>
                    </div>
                    {/* Display total energy generated */}
                    <p className="total-energy-text">
                        Total energy generated over this period: {totalEnergySum.toFixed(2)} kWh
                    </p>
                </div>

                <ResponsiveContainer width="100%" height={800}>
                    <BarChart data={dailyTotals}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#ccc" />
                        <XAxis
                            dataKey="date"
                            tickFormatter={(tick) => format(parseISO(tick), 'MM-dd')}
                            stroke="#333"
                        />
                        <YAxis label={{ value: 'Total Energy (kWh)', angle: -90, position: 'insideLeft', fill: '#333' }} />
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
