import React, {useCallback, useEffect, useState} from 'react';
import {useLocation, useParams} from 'react-router-dom';
import {CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis} from 'recharts';
import {format, parseISO} from 'date-fns';
import { useTranslation } from 'react-i18next';
import {backend_url} from "../config";
import ForecastError from "../components/ForecastError";

interface ForecastData {
    time: string;
    pred_kW: number;
}

interface GroupPanel {
    id: string;
    name: string;
}

interface CombinedForecastPoint {
    time: string;
    [seriesKey: string]: string | number;
}

const GraphForecast: React.FC = () => {
    const { t } = useTranslation();
    const {id} = useParams<{ id: string }>();
    const token = localStorage.getItem('token');
    const location = useLocation(); // Access query parameters
    const [loading, setLoading] = useState(true);

    const [forecastData, setForecastData] = useState<CombinedForecastPoint[]>([]);
    const [seriesKeys, setSeriesKeys] = useState<string[]>([]);
    const [groupPanels, setGroupPanels] = useState<GroupPanel[]>([]);
    const [fromDate, setFromDate] = useState<string>(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
    const [toDate, setToDate] = useState<string>(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
    const [error, setError] = useState<string | null>(null);
    const params = new URLSearchParams(location.search);
    const type = params.get('type');
    console.log(type)
    const maxToDate = new Date(Date.now() + 13 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    useEffect(() => {
        if (type !== 'group') {
            setGroupPanels([]);
            setSeriesKeys(['pred_kW']);
        }
    }, [id, type]);

    const lineColors = ['#1f77b4', '#ff7f0e', '#2ca02c', '#d62728', '#9467bd', '#8c564b', '#e377c2', '#7f7f7f', '#bcbd22', '#17becf'];

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
                setGroupPanels((previous) => {
                    if (previous.length === 0) {
                        return previous;
                    }
                    return [];
                });
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

            setGroupPanels((previous) => {
                if (
                    previous.length === mappedPanels.length &&
                    previous.every((panel, index) =>
                        panel.id === mappedPanels[index]?.id && panel.name === mappedPanels[index]?.name,
                    )
                ) {
                    return previous;
                }
                return mappedPanels;
            });
            return mappedPanels;
        } catch (fetchError) {
            console.error('Failed to load group panels', fetchError);
            throw fetchError instanceof Error ? fetchError : new Error(t('barForecast.errorRetrievingData'));
        }
    }, [groupPanels, id, token, type, t]);

    const createSeriesLabels = useCallback((panels: GroupPanel[]): string[] => {
        const counts = new Map<string, number>();
        return panels.map((panel) => {
            const base = panel.name.trim() || t('barForecast.unnamedDevice');
            const current = counts.get(base) ?? 0;
            counts.set(base, current + 1);
            return current === 0 ? base : `${base} (${current + 1})`;
        });
    }, [t]);

    const fetchPanelForecast = useCallback(async (panelId: string, start: string, end: string) => {
        if (!token) {
            throw new Error(t('barForecast.tokenNotFound'));
        }

        const response = await fetch(
            `${backend_url}/api/forecast/getForecast?panelId=${panelId}&from=${start} 00:00:00&to=${end} 00:00:00&type=panel`,
            {
                method: 'POST',
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
                console.error('Failed to parse forecast error response', parseError);
            }
            throw new Error(message);
        }

        if (!responseText || responseText === 'null') {
            return [];
        }

        try {
            return JSON.parse(responseText) as ForecastData[];
        } catch (parseError) {
            console.error('Failed to parse forecast response', parseError);
            throw new Error(t('barForecast.errorRetrievingData'));
        }
    }, [token, t]);

    const fetchForecast = useCallback(async () => {
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
            if (type === 'group') {
                let panels: GroupPanel[] = [];
                try {
                    panels = await ensureGroupPanels();
                } catch (groupError) {
                    const message = groupError instanceof Error ? groupError.message : t('barForecast.errorRetrievingData');
                    setError(message);
                    setForecastData([]);
                    setSeriesKeys([]);
                    return;
                }

                if (panels.length === 0) {
                    setError(t('barForecast.noGroupPanels'));
                    setForecastData([]);
                    setSeriesKeys([]);
                    return;
                }

                const labels = createSeriesLabels(panels);
                const forecasts = await Promise.all(
                    panels.map((panel) => fetchPanelForecast(panel.id, fromDate, toDate)),
                );

                const combinedMap = new Map<string, CombinedForecastPoint>();

                forecasts.forEach((panelForecast, index) => {
                    const label = labels[index];
                    panelForecast.forEach((entry) => {
                        const existing = combinedMap.get(entry.time) || { time: entry.time };
                        existing[label] = entry.pred_kW;
                        combinedMap.set(entry.time, existing);
                    });
                });

                const combinedData = Array.from(combinedMap.values()).sort(
                    (a, b) => new Date(a.time).getTime() - new Date(b.time).getTime(),
                );

                setForecastData(combinedData);
                setSeriesKeys(labels);
                setError(null);
            } else {
                const response = await fetch(
                    `${backend_url}/api/forecast/getForecast?panelId=${id}&from=${fromDate} 00:00:00&to=${toDate} 00:00:00&type=${type}`,
                    {
                        method: 'POST',
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
                        console.error('Failed to parse error response', parseError);
                    }

                    setSeriesKeys(['pred_kW']);
                    setError(message);
                    setForecastData([]);
                    return;
                }

                try {
                    const data: ForecastData[] = JSON.parse(responseText);
                    const singleSeries: CombinedForecastPoint[] = data.map((entry) => ({
                        time: entry.time,
                        pred_kW: entry.pred_kW,
                    }));
                    setForecastData(singleSeries);
                    setSeriesKeys(['pred_kW']);
                    setError(null);
                } catch (parseError) {
                    console.error('Failed to parse forecast response', parseError);
                    setError(t('barForecast.errorRetrievingData'));
                    setForecastData([]);
                }
            }
        } catch (error) {
            console.error(error);
            setError(t('barForecast.errorRetrievingData'));
            setForecastData([]);
            if (type === 'group') {
                setSeriesKeys([]);
            } else {
                setSeriesKeys(['pred_kW']);
            }
        } finally {
            setLoading(false);
        }
    }, [token, id, type, ensureGroupPanels, createSeriesLabels, fetchPanelForecast, fromDate, toDate, t]);

    useEffect(() => {
        if (!token) {
            setError(t('barForecast.tokenNotFound'));
            setLoading(false);
            return;
        }

        if (fromDate && toDate) {
            fetchForecast();
        }
    }, [fetchForecast, fromDate, toDate, token, t]);

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
                {type === 'group' && seriesKeys.length > 0 && (
                    <div className="group-panels-section">
                        <h3>{t('barForecast.groupDevicesTitle', { count: seriesKeys.length })}</h3>
                        <ul>
                            {seriesKeys.map((label) => (
                                <li key={label}>{label}</li>
                            ))}
                        </ul>
                    </div>
                )}
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
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-muted)"/>
                            <XAxis
                                dataKey="time"
                                tickFormatter={(tick) => format(parseISO(tick), 'MM-dd HH:mm')}
                                stroke="var(--color-text)"
                                tick={{fill: 'var(--color-text)'}}
                            />
                            <YAxis
                                label={{value: t('barForecast.yAxisLabel'), angle: -90, position: 'insideLeft', fill: 'var(--color-text)'}}
                                tick={{fill: 'var(--color-text)'}}
                                stroke="var(--color-text)"
                            />
                            <Tooltip
                                labelFormatter={(label) => format(parseISO(label), 'yyyy-MM-dd HH:mm')}
                                contentStyle={{backgroundColor: 'var(--color-hero-background)', borderColor: 'var(--color-primary)', color: 'var(--color-text)'}}
                                labelStyle={{color: 'var(--color-text)'}}
                                itemStyle={{color: 'var(--color-text)'}}
                            />
                            {seriesKeys.length > 1 && <Legend />}
                            {seriesKeys.map((key, index) => (
                                <Line
                                    key={key}
                                    type="monotone"
                                    dataKey={key}
                                    stroke={lineColors[index % lineColors.length]}
                                    strokeWidth={2}
                                    dot={false}
                                />
                            ))}
                        </LineChart>
                    </ResponsiveContainer>
                )}
            </main>
        </div>
    );
};

export default GraphForecast;
