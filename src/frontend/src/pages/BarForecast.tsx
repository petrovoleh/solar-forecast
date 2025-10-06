import React, { useCallback, useEffect, useState } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { format, parseISO } from 'date-fns';
import { useTranslation } from 'react-i18next';
import { backend_url } from "../config";
import ForecastError from "../components/ForecastError";

interface DailyTotalData {
    date: string;
    totalEnergy_kwh: number;
}

interface SummaryTotals {
    lastDay: number | null;
    lastWeek: number | null;
    lastMonth: number | null;
    lastYear: number | null;
}

type SummaryLoadingState = Record<keyof SummaryTotals, boolean>;

const BarForecast: React.FC = () => {
    const { t } = useTranslation();
    const { id } = useParams<{ id: string }>();
    const location = useLocation();
    const [loading, setLoading] = useState(true);

    const token = localStorage.getItem('token');
    const maxToDate = new Date(Date.now() + 13 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const [dailyTotals, setDailyTotals] = useState<DailyTotalData[]>([]);
    const [totalEnergySum, setTotalEnergySum] = useState<number>(0);
    const [summaryTotals, setSummaryTotals] = useState<SummaryTotals>({
        lastDay: null,
        lastWeek: null,
        lastMonth: null,
        lastYear: null,
    });
    const [summaryLoading, setSummaryLoading] = useState<SummaryLoadingState>({
        lastDay: false,
        lastWeek: false,
        lastMonth: false,
        lastYear: false,
    });
    const [fromDate, setFromDate] = useState<string>(
        new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    );
    const [toDate, setToDate] = useState<string>(
        new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    );
    const [error, setError] = useState<string | null>(null);
    const params = new URLSearchParams(location.search);
    const type = params.get('type');

    const buildRangeParam = (date: string, options?: { endOfDay?: boolean }) =>
        `${date} ${options?.endOfDay ? '23:59:59' : '00:00:00'}`;

    const fetchDailyTotals = useCallback(async () => {
        if (!token) {
            setError(t('barForecast.tokenNotFound'));
            setDailyTotals([]);
            setTotalEnergySum(0);
            setLoading(false);
            return;
        }
        if (!id || !type) {
            setError(t('barForecast.errorRetrievingData'));
            setDailyTotals([]);
            setTotalEnergySum(0);
            setLoading(false);
            return;
        }
        try {
            setLoading(true);
            const response = await fetch(
                `${backend_url}/api/forecast/getTotal?panelId=${id}&from=${buildRangeParam(fromDate)}&to=${buildRangeParam(toDate, { endOfDay: true })}&type=${type}`,
                {
                    method: 'GET',
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
                setDailyTotals([]);
                setTotalEnergySum(0);
                return;
            }

            try {
                const data: DailyTotalData[] = JSON.parse(responseText);

                const sortedData = data.sort((a: DailyTotalData, b: DailyTotalData) =>
                    new Date(a.date).getTime() - new Date(b.date).getTime()
                );

                const totalSum = sortedData.reduce((sum: number, item: DailyTotalData) => sum + item.totalEnergy_kwh, 0);

                setDailyTotals(sortedData);
                setTotalEnergySum(totalSum);
                setError(null);
            } catch (parseError) {
                console.error('Failed to parse totals response', parseError);
                setError(t('barForecast.errorRetrievingData'));
                setDailyTotals([]);
                setTotalEnergySum(0);
            }
        } catch (error) {
            console.error(error);
            setError(t('barForecast.errorRetrievingData'));
            setDailyTotals([]);
            setTotalEnergySum(0);
        } finally {
            setLoading(false);
        }

    }, [fromDate, id, toDate, token, type, t]);

    const fetchTotalSumForRange = useCallback(async (from: string, to: string): Promise<number | null> => {
        if (!token || !id || !type) {
            return null;
        }

        try {
            const response = await fetch(
                `${backend_url}/api/forecast/getTotal?panelId=${id}&from=${buildRangeParam(from)}&to=${buildRangeParam(to, { endOfDay: true })}&type=${type}`,
                {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json',
                    },
                }
            );

            if (!response.ok) {
                return null;
            }

            const data: DailyTotalData[] = await response.json();
            return data.reduce((sum: number, item: DailyTotalData) => sum + item.totalEnergy_kwh, 0);
        } catch (err) {
            console.error(err);
            return null;
        }
    }, [id, token, type]);

    const fetchSummaryTotals = useCallback(async () => {
        if (!token || !id || !type) {
            return;
        }

        const formatDateOnly = (date: Date) => date.toISOString().split('T')[0];
        const clampToMinDate = (date: Date) => {
            const minDate = new Date('2020-01-01T00:00:00');
            return date < minDate ? formatDateOnly(minDate) : formatDateOnly(date);
        };

        const endDate = new Date();
        const ranges: { key: keyof SummaryTotals; length: number }[] = [
            { key: 'lastDay', length: 1 },
            { key: 'lastWeek', length: 7 },
            { key: 'lastMonth', length: 30 },
            { key: 'lastYear', length: 365 },
        ];

        setSummaryLoading({
            lastDay: true,
            lastWeek: true,
            lastMonth: true,
            lastYear: true,
        });

        for (const range of ranges) {
            const rangeEnd = new Date(endDate);
            const rangeStart = new Date(rangeEnd);
            rangeStart.setDate(rangeStart.getDate() - (range.length - 1));

            const from = clampToMinDate(rangeStart);
            const to = clampToMinDate(rangeEnd);

            if (new Date(from) > new Date(to)) {
                setSummaryTotals((prev) => ({
                    ...prev,
                    [range.key]: null,
                }));
                setSummaryLoading((prev) => ({
                    ...prev,
                    [range.key]: false,
                }));
                continue;
            }

            const sum = await fetchTotalSumForRange(from, to);
            setSummaryTotals((prev) => ({
                ...prev,
                [range.key]: sum !== null ? sum : null,
            }));
            setSummaryLoading((prev) => ({
                ...prev,
                [range.key]: false,
            }));
        }
    }, [fetchTotalSumForRange, id, token, type]);

    useEffect(() => {
        if (!token) {
            setError(t('barForecast.tokenNotFound'));
            setLoading(false);
            return;
        }
        if (!type || !id) {
            setError(t('barForecast.errorRetrievingData'));
            setLoading(false);
            return;
        }
        if (fromDate && toDate) {
            fetchDailyTotals();
        }
    }, [fetchDailyTotals, fromDate, toDate, token, type, id, t]);

    useEffect(() => {
        const loadSummary = async () => {
            await fetchSummaryTotals();
        };

        loadSummary();
    }, [fetchSummaryTotals]);

    const handleFromDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFromDate(e.target.value);
    };

    const handleToDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setToDate(e.target.value);
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
                        <button className="primary-button cta-button" onClick={fetchDailyTotals}>
                            {t('barForecast.okButton')}
                        </button>
                        <p className="total-energy-text">
                            {t('barForecast.totalEnergyGenerated', { total: totalEnergySum.toFixed(2) })}
                        </p>
                        <div className="summary-section">
                            <h2>{t('barForecast.summaryTitle')}</h2>
                            <div className="summary-totals">
                                <div className="summary-card">
                                    <span className="summary-label">{t('barForecast.lastDayLabel')}</span>
                                    <span className="summary-value">
                                        {summaryLoading.lastDay
                                            ? t('barForecast.summaryLoading')
                                            : summaryTotals.lastDay !== null
                                                ? summaryTotals.lastDay.toFixed(2)
                                                : t('barForecast.noSummaryData')}
                                    </span>
                                </div>
                                <div className="summary-card">
                                    <span className="summary-label">{t('barForecast.lastWeekLabel')}</span>
                                    <span className="summary-value">
                                        {summaryLoading.lastWeek
                                            ? t('barForecast.summaryLoading')
                                            : summaryTotals.lastWeek !== null
                                                ? summaryTotals.lastWeek.toFixed(2)
                                                : t('barForecast.noSummaryData')}
                                    </span>
                                </div>
                                <div className="summary-card">
                                    <span className="summary-label">{t('barForecast.lastMonthLabel')}</span>
                                    <span className="summary-value">
                                        {summaryLoading.lastMonth
                                            ? t('barForecast.summaryLoading')
                                            : summaryTotals.lastMonth !== null
                                                ? summaryTotals.lastMonth.toFixed(2)
                                                : t('barForecast.noSummaryData')}
                                    </span>
                                </div>
                                <div className="summary-card">
                                    <span className="summary-label">{t('barForecast.lastYearLabel')}</span>
                                    <span className="summary-value">
                                        {summaryLoading.lastYear
                                            ? t('barForecast.summaryLoading')
                                            : summaryTotals.lastYear !== null
                                                ? summaryTotals.lastYear.toFixed(2)
                                                : t('barForecast.noSummaryData')}
                                    </span>
                                </div>
                            </div>
                        </div>
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
                {!loading && !error && <ResponsiveContainer width="100%" height={window.innerHeight * 0.8 - 100}>
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
                </ResponsiveContainer>}
            </main>
        </div>
    );
};

export default BarForecast;
