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

interface GroupPanel {
    id: string;
    name: string;
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
    const [groupPanels, setGroupPanels] = useState<GroupPanel[]>([]);
    const [fromDate, setFromDate] = useState<string>(
        new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    );
    const [toDate, setToDate] = useState<string>(
        new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    );
    const [error, setError] = useState<string | null>(null);
    const params = new URLSearchParams(location.search);
    const type = params.get('type');

    const buildRangeParam = useCallback(
        (date: string, options?: { endOfDay?: boolean }) =>
            `${date} ${options?.endOfDay ? '23:59:59' : '00:00:00'}`,
        [],
    );

    useEffect(() => {
        if (type !== 'group') {
            setGroupPanels([]);
        }
    }, [id, type]);

    const ensureGroupPanels = useCallback(async (): Promise<GroupPanel[]> => {
        if (type !== 'group') {
            return [];
        }

        if (!token || !id) {
            return [];
        }

        if (groupPanels.length > 0) {
            return groupPanels;
        }

        try {
            const response = await fetch(`${backend_url}/api/panel/user`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            const responseText = await response.text();

            if (!response.ok) {
                let message = t('barForecast.errorRetrievingData');
                try {
                    const parsed = JSON.parse(responseText);
                    if (parsed?.statusText) {
                        message = parsed.statusText;
                    }
                } catch (parseError) {
                    console.error('Failed to parse group panels error response', parseError);
                }
                throw new Error(message);
            }

            if (!responseText || responseText === 'null') {
                setGroupPanels([]);
                return [];
            }

            let parsedPanels: Array<{ id: string; name?: string; cluster?: { id?: string } }> = [];
            try {
                parsedPanels = JSON.parse(responseText);
            } catch (parseError) {
                console.error('Failed to parse group panels response', parseError);
                throw new Error(t('barForecast.errorRetrievingData'));
            }

            const filteredPanels = parsedPanels.filter((panel) => panel.cluster?.id === id);
            const mappedPanels = filteredPanels.map((panel) => ({
                id: panel.id,
                name: panel.name || t('barForecast.unnamedDevice'),
            }));

            setGroupPanels(mappedPanels);
            return mappedPanels;
        } catch (fetchError) {
            console.error('Failed to load group panels', fetchError);
            throw fetchError instanceof Error ? fetchError : new Error(t('barForecast.errorRetrievingData'));
        }
    }, [groupPanels, id, token, type, t]);

    const fetchTotals = useCallback(
        async (targetId: string, targetType: 'panel' | 'cluster', from: string, to: string) => {
            if (!token) {
                throw new Error(t('barForecast.tokenNotFound'));
            }

            const response = await fetch(
                `${backend_url}/api/forecast/getTotal?panelId=${targetId}&from=${buildRangeParam(from)}&to=${buildRangeParam(to, { endOfDay: true })}&type=${targetType}`,
                {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json',
                    },
                },
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
                    console.error('Failed to parse totals error response', parseError);
                }
                throw new Error(message);
            }

            if (!responseText || responseText === 'null') {
                return [];
            }

            try {
                return JSON.parse(responseText) as DailyTotalData[];
            } catch (parseError) {
                console.error('Failed to parse totals response', parseError);
                throw new Error(t('barForecast.errorRetrievingData'));
            }
        },
        [buildRangeParam, t, token],
    );

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

        setLoading(true);

        try {
            if (type === 'group') {
                let panels: GroupPanel[] = [];
                try {
                    panels = await ensureGroupPanels();
                } catch (groupError) {
                    const message = groupError instanceof Error ? groupError.message : t('barForecast.errorRetrievingData');
                    setError(message);
                    setDailyTotals([]);
                    setTotalEnergySum(0);
                    return;
                }

                if (panels.length === 0) {
                    setError(t('barForecast.noGroupPanels'));
                    setDailyTotals([]);
                    setTotalEnergySum(0);
                    return;
                }

                const totalsPerPanel = await Promise.all(
                    panels.map(async (panel) => ({
                        panel,
                        totals: await fetchTotals(panel.id, 'panel', fromDate, toDate),
                    })),
                );

                const totalsMap = new Map<string, number>();
                totalsPerPanel.forEach(({ totals }) => {
                    totals.forEach((entry) => {
                        totalsMap.set(entry.date, (totalsMap.get(entry.date) || 0) + entry.totalEnergy_kwh);
                    });
                });

                const combinedTotals = Array.from(totalsMap.entries())
                    .map(([date, totalEnergy_kwh]) => ({ date, totalEnergy_kwh }))
                    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

                const totalSum = combinedTotals.reduce((sum, item) => sum + item.totalEnergy_kwh, 0);

                setDailyTotals(combinedTotals);
                setTotalEnergySum(totalSum);
                setError(null);
            } else {
                const totals = await fetchTotals(id, type as 'panel' | 'cluster', fromDate, toDate);
                const sortedData = [...totals].sort(
                    (a: DailyTotalData, b: DailyTotalData) => new Date(a.date).getTime() - new Date(b.date).getTime(),
                );

                const totalSum = sortedData.reduce((sum: number, item: DailyTotalData) => sum + item.totalEnergy_kwh, 0);

                setDailyTotals(sortedData);
                setTotalEnergySum(totalSum);
                setError(null);
            }
        } catch (error) {
            console.error('Failed to load daily totals', error);
            const message = error instanceof Error ? error.message : t('barForecast.errorRetrievingData');
            setError(message);
            setDailyTotals([]);
            setTotalEnergySum(0);
        } finally {
            setLoading(false);
        }
    }, [token, id, type, ensureGroupPanels, fetchTotals, fromDate, toDate, t]);

    const fetchTotalSumForRange = useCallback(async (from: string, to: string): Promise<number | null> => {
        if (!token || !id || !type) {
            return null;
        }

        try {
            if (type === 'group') {
                let panels: GroupPanel[] = [];
                try {
                    panels = await ensureGroupPanels();
                } catch (groupError) {
                    console.error('Failed to load group panels for summary', groupError);
                    return null;
                }

                if (panels.length === 0) {
                    return 0;
                }

                const totalsPerPanel = await Promise.all(
                    panels.map((panel) => fetchTotals(panel.id, 'panel', from, to)),
                );

                const sum = totalsPerPanel.reduce((acc, panelTotals) => (
                    acc + panelTotals.reduce((panelAcc, item) => panelAcc + item.totalEnergy_kwh, 0)
                ), 0);

                return sum;
            }

            const totals = await fetchTotals(id, type as 'panel' | 'cluster', from, to);
            return totals.reduce((acc, item) => acc + item.totalEnergy_kwh, 0);
        } catch (err) {
            console.error('Failed to load totals for range', err);
            return null;
        }
    }, [token, id, type, ensureGroupPanels, fetchTotals]);

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
                                <div className="summary-card">
                                    <span className="summary-label">{t('barForecast.selectedPeriodLabel')}</span>
                                    <span className="summary-value">
                                        {totalEnergySum.toFixed(2)}
                                    </span>
                                </div>
                            </div>
                        </div>
                        {type === 'group' && groupPanels.length > 0 && (
                            <div className="group-panels-section">
                                <h3>{t('barForecast.groupDevicesTitle', { count: groupPanels.length })}</h3>
                                <ul>
                                    {groupPanels.map((panel) => (
                                        <li key={panel.id}>{panel.name}</li>
                                    ))}
                                </ul>
                            </div>
                        )}
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
                    <div className="chart-responsive-container">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={dailyTotals}>
                                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-muted)" />
                                <XAxis
                                    dataKey="date"
                                    tickFormatter={(tick) => format(parseISO(tick), 'MM-dd')}
                                    stroke="var(--color-text)"
                                    tick={{ fill: 'var(--color-text)' }}
                                />
                                <YAxis
                                    label={{
                                        value: t('barForecast.yAxisLabel'),
                                        angle: -90,
                                        position: 'insideLeft',
                                        fill: 'var(--color-text)',
                                    }}
                                    tick={{ fill: 'var(--color-text)' }}
                                    stroke="var(--color-text)"
                                />
                                <Tooltip
                                    labelFormatter={(label) => format(parseISO(label), 'yyyy-MM-dd')}
                                    contentStyle={{ backgroundColor: 'var(--color-hero-background)', borderColor: 'var(--color-primary)', color: 'var(--color-text)' }}
                                    labelStyle={{ color: 'var(--color-text)' }}
                                    itemStyle={{ color: 'var(--color-text)' }}
                                />
                                <Bar dataKey="totalEnergy_kwh" fill="var(--color-primary-dark)" />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                )}
            </main>
        </div>
    );
};

export default BarForecast;
