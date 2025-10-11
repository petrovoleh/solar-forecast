import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from "react-router-dom";
import { useTranslation } from 'react-i18next';
import { backend_url } from "../config";

interface Location {
    country?: string;
    city?: string;
    district?: string;
    lat?: number;
    lon?: number;
}

interface PanelResponse {
    id: string;
    name?: string;
    location?: Location | null;
    cluster?: {
        id?: string | null;
    } | null;
}

interface ClusterResponse {
    id: string;
    name?: string;
    location?: Location | null;
}

interface ForecastItem {
    id: string;
    name?: string;
    type: 'panel' | 'cluster' | 'group';
    location?: Location | null;
    panelCount?: number;
}

const Forecast: React.FC = () => {
    const { t } = useTranslation();
    const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
    const [panels, setPanels] = useState<PanelResponse[]>([]);
    const [clusters, setClusters] = useState<ClusterResponse[]>([]);
    const [sortKey, setSortKey] = useState<'name' | 'location' | 'type'>('name');
    const [filter, setFilter] = useState<string>('');
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchPanels = async () => {
            setLoading(true); // Show loader
            try {
                const token = localStorage.getItem('token');
                const response = await fetch(`${backend_url}/api/panel/user`, {
                    headers: { Authorization: `Bearer ${token}` },
                });

                if (response.ok) {
                    const text = await response.text();
                    const parsed: PanelResponse[] = text ? JSON.parse(text) : [];
                    setPanels(Array.isArray(parsed) ? parsed : []);
                } else {
                    console.error("Failed to fetch panels:", response.statusText);
                }
            } catch (error) {
                console.error("Error fetching panels:", error);
            } finally {
                setLoading(false); // Hide loader
            }
        };
        fetchPanels();
    }, []);

    useEffect(() => {
        const fetchClusters = async () => {
            setLoading(true); // Show loader
            try {
                const token = localStorage.getItem('token');
                const response = await fetch(`${backend_url}/api/cluster/user`, {
                    headers: { Authorization: `Bearer ${token}` },
                });

                if (response.ok) {
                    const text = await response.text();
                    const parsed: ClusterResponse[] = text ? JSON.parse(text) : [];
                    setClusters(Array.isArray(parsed) ? parsed : []);
                } else {
                    console.error("Failed to fetch clusters:", response.statusText);
                }
            } catch (error) {
                console.error("Error fetching clusters:", error);
            } finally {
                setLoading(false); // Hide loader
            }
        };
        fetchClusters();
    }, []);

    const getLocationLabel = (location?: Location | null) => {
        const city = location?.city?.trim();
        const country = location?.country?.trim();
        const district = location?.district?.trim();

        if (!city && !country && !district) {
            return t('clusterList.groupLabel');
        }

        return [city, country, district].filter(Boolean).join(', ');
    };

    const handleSort = (key: 'name' | 'location' | 'type') => {
        setSortKey(key);
    };

    const handleFilter = (event: React.ChangeEvent<HTMLInputElement>) => {
        setFilter(event.target.value);
    };

    const baseItems = useMemo<ForecastItem[]>(() => {
        const clusterPanelCounts = panels.reduce<Record<string, number>>((acc, panel) => {
            const clusterId = panel.cluster?.id ?? undefined;
            if (clusterId) {
                acc[clusterId] = (acc[clusterId] ?? 0) + 1;
            }
            return acc;
        }, {});

        const panelItems = panels.map<ForecastItem>((panel) => ({
            id: panel.id,
            name: panel.name,
            type: 'panel',
            location: panel.location ?? null,
        }));

        const clusterItems = clusters.map<ForecastItem>((cluster) => ({
            id: cluster.id,
            name: cluster.name,
            type: (cluster.location ? 'cluster' : 'group'),
            location: cluster.location ?? null,
            panelCount: clusterPanelCounts[cluster.id] ?? 0,
        }));

        return [...panelItems, ...clusterItems];
    }, [panels, clusters]);

    const sortedPanels = useMemo(() => {
        const items = [...baseItems];
        items.sort((a, b) => {
            if (sortKey === 'location') {
                return getLocationLabel(a.location).localeCompare(getLocationLabel(b.location));
            }

            if (sortKey === 'type') {
                return a.type.localeCompare(b.type);
            }

            return (a.name ?? '').localeCompare(b.name ?? '');
        });

        return items;
    }, [baseItems, sortKey, t]);

    const filteredPanels = sortedPanels.filter((item) => {
        const search = filter.toLowerCase();
        const locationLabel = getLocationLabel(item.location).toLowerCase();

        return (
            ((item.name ?? '').toLowerCase().includes(search)) ||
            locationLabel.includes(search)
        );
    });

    return (
        <div className="list-container">
            <div className="list-header">
                <div className="list-controls">
                    <input
                        type="text"
                        placeholder={t('clusterList.filterPlaceholder')}
                        value={filter}
                        onChange={handleFilter}
                        className="filter-input"
                    />

                    <div className="view-toggle-buttons">
                        <button
                            onClick={() => setViewMode('list')}
                            className={viewMode === 'list' ? 'active' : ''}
                        >
                            {t('clusterList.listView')}
                        </button>
                        <button
                            onClick={() => setViewMode('grid')}
                            className={viewMode === 'grid' ? 'active' : ''}
                        >
                            {t('clusterList.gridView')}
                        </button>
                    </div>
                </div>
                <div className="panel-sort-options">
                    <span className="sortby">{t('clusterList.sortBy')}</span>
                    <button onClick={() => handleSort('name')} className={sortKey === 'name' ? 'active' : ''}>
                        {t('clusterList.name')}
                    </button>
                    <button onClick={() => handleSort('location')} className={sortKey === 'location' ? 'active' : ''}>
                        {t('clusterList.location')}
                    </button>
                    <button onClick={() => handleSort('type')} className={sortKey === 'type' ? 'active' : ''}>
                        {t('clusterList.type')}
                    </button>
                </div>
            </div>

            {viewMode === 'list' && (
                <div className="grid-headers forecast-list-headers">
                    <div>{t('clusterList.name')}</div>
                    <div>{t('clusterList.location')}</div>
                    <div>{t('clusterList.type')}</div>
                    <div>{t('clusterList.actions')}</div>
                </div>
            )}
            {loading &&
                <div className="mini-loader-container">
                    <div className="loader"></div>
                </div>
            }
            {!loading && filteredPanels.length === 0 ? (
                <div className="no-panels-message">{t('clusterList.noPanelsMessage')}</div>
            ) : (
                <div className={`panel-list ${viewMode}`}>
                    {filteredPanels.map((panel) => {
                        const isAggregate = panel.type !== 'panel';
                        const assignedCount = panel.panelCount ?? 0;
                        const disableForecast = isAggregate && assignedCount === 0;

                        return (
                            <div
                                key={panel.id}
                                className={`panel-cardd forecast-card ${viewMode === 'list' ? 'list-layout-card' : ''}`}
                            >
                                <div>{viewMode === 'grid' && <strong>{t('clusterList.name')}: </strong>}{panel.name}</div>
                                <div>
                                    {viewMode === 'grid' && <strong>{t('clusterList.location')}: </strong>}
                                    {panel.location ? getLocationLabel(panel.location) : t('clusterList.groupLabel')}
                                </div>
                                <div>{viewMode === 'grid' && <strong>{t('clusterList.type')}: </strong>}{panel.type}</div>
                                <div className="panel-actions">
                                    {isAggregate && disableForecast && (
                                        <div className="forecast-disabled-hint">
                                            {t('clusterList.noForecastWithoutPanels')}
                                        </div>
                                    )}
                                    <button
                                        onClick={() => navigate(`/bar_forecast/${panel.id}?type=${panel.type}`)}
                                        className="primary-button view-button"
                                        disabled={disableForecast}
                                        title={disableForecast ? t('clusterList.noForecastWithoutPanels') : undefined}
                                    >
                                        {t('clusterList.barForecast')}
                                    </button>
                                    <button
                                        onClick={() => navigate(`/panel_forecast/${panel.id}?type=${panel.type}`)}
                                        className="primary-button view-button"
                                        disabled={disableForecast}
                                        title={disableForecast ? t('clusterList.noForecastWithoutPanels') : undefined}
                                    >
                                        {t('clusterList.graphForecast')}
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default Forecast;
