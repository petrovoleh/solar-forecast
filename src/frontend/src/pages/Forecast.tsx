import React, { useEffect, useState } from 'react';
import './PanelList.css';
import { useNavigate } from "react-router-dom";
import { useTranslation } from 'react-i18next';
import { backend_url } from "../config";

interface Location {
    country: string;
    city: string;
    district: string;
    lat?: number;
    lon?: number;
}

interface SolarPanel {
    id: string;
    name: string;
    type: 'panel' | 'cluster';
    location: Location;
}

const Forecast: React.FC = () => {
    const { t } = useTranslation();
    const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
    const [panels, setPanels] = useState<SolarPanel[]>([]);
    const [clusters, setClusters] = useState<SolarPanel[]>([]);
    const [sortKey, setSortKey] = useState<keyof SolarPanel>('name');
    const [filter, setFilter] = useState<string>('');
    const navigate = useNavigate();

    useEffect(() => {
        const fetchPanels = async () => {
            try {
                const token = localStorage.getItem('token');
                const response = await fetch(`${backend_url}/api/panel/user`, {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                });

                if (response.ok) {
                    const text = await response.text();
                    setPanels(text ? JSON.parse(text) : []);
                } else {
                    console.error("Failed to fetch panels:", response.statusText);
                }
            } catch (error) {
                console.error("Error fetching panels:", error);
            }
        };
        fetchPanels();
    }, []);

    useEffect(() => {
        const fetchClusters = async () => {
            try {
                const token = localStorage.getItem('token');
                const response = await fetch(`${backend_url || 'http://localhost:8080'}/api/cluster/user`, {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                });

                if (response.ok) {
                    const text = await response.text();
                    setClusters(text ? JSON.parse(text) : []);
                } else {
                    console.error("Failed to fetch clusters:", response.statusText);
                }
            } catch (error) {
                console.error("Error fetching clusters:", error);
            }
        };
        fetchClusters();
    }, []);

    const handleSort = (key: keyof SolarPanel | 'type') => {
        const sortedPanels = [...combinedData].sort((a, b) => {
            if (key === 'location') {
                const aLocation = `${a.location.city || ''}, ${a.location.country || ''}, ${a.location.district || ''}`;
                const bLocation = `${b.location.city || ''}, ${b.location.country || ''}, ${b.location.district || ''}`;
                return aLocation.localeCompare(bLocation);
            } else if (key === 'type') {
                return a.type.localeCompare(b.type);
            } else if (typeof a[key] === 'string' && typeof b[key] === 'string') {
                return (a[key] as string).localeCompare(b[key] as string);
            }
            return 0;
        });

        setCombinedData(sortedPanels);
        setSortKey(key as keyof SolarPanel);
    };

    const handleFilter = (event: React.ChangeEvent<HTMLInputElement>) => {
        setFilter(event.target.value);
    };

    const [combinedData, setCombinedData] = useState<SolarPanel[]>([]);

    useEffect(() => {
        setCombinedData([
            ...panels.map(panel => ({ ...panel, type: 'panel' as 'panel' })),
            ...clusters.map(cluster => ({ ...cluster, type: 'cluster' as 'cluster' })),
        ]);
    }, [panels, clusters]);

    const filteredPanels = combinedData.filter((item) =>
        (item.name && item.name.toLowerCase().includes(filter.toLowerCase())) ||
        (item.location?.city && item.location.city.toLowerCase().includes(filter.toLowerCase())) ||
        (item.location?.country && item.location.country.toLowerCase().includes(filter.toLowerCase())) ||
        (item.location?.district && item.location.district.toLowerCase().includes(filter.toLowerCase()))
    );

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
                <div className="forecast-list-headers">
                    <div>{t('clusterList.name')}</div>
                    <div>{t('clusterList.location')}</div>
                    <div>{t('clusterList.type')}</div>
                    <div>{t('clusterList.actions')}</div>
                </div>
            )}

            {filteredPanels.length === 0 ? (
                <div className="no-panels-message">{t('clusterList.noPanelsMessage')}</div>
            ) : (
                <div className={`panel-list ${viewMode}`}>
                    {filteredPanels.map((panel) => (
                        <div key={panel.id} className="panel-cardd forecast-card">
                            <div>{viewMode === 'grid' && <strong>{t('clusterList.name')}: </strong>}{panel.name}</div>
                            <div>
                                {viewMode === 'grid' && <strong>{t('clusterList.location')}: </strong>}
                                {panel.location.city}, {panel.location.country}
                            </div>
                            <div>{viewMode === 'grid' && <strong>{t('clusterList.type')}: </strong>}{panel.type}</div>
                            <div className="panel-actions">
                                <button
                                    onClick={() => navigate(`/bar_forecast/${panel.id}?type=${panel.type}`)}
                                    className="view-button"
                                >
                                    {t('clusterList.barForecast')}
                                </button>
                                <button
                                    onClick={() => navigate(`/panel_forecast/${panel.id}?type=${panel.type}`)}
                                    className="view-button"
                                >
                                    {t('clusterList.graphForecast')}
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default Forecast;
