import React, { useEffect, useState } from 'react';
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
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
    powerRating: number;
    temperatureCoefficient: number;
    efficiency: number;
    quantity: number;
    location: Location;
    cluster?: {
        id: string;
        name: string;
    };
}

const PanelList: React.FC = () => {
    const { t } = useTranslation();
    const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
    const [panels, setPanels] = useState<SolarPanel[]>([]);
    const [sortKey, setSortKey] = useState<keyof SolarPanel>('name');
    const [filter, setFilter] = useState<string>('');
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchPanels = async () => {
            try {
                setLoading(true)
                const token = localStorage.getItem('token');
                const response = await fetch(`${backend_url}/api/panel/user`, {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                });

                if (response.ok) {
                    const text = await response.text();
                    if (text) {
                        const data = JSON.parse(text);
                        setPanels(data);
                    } else {
                        setPanels([]);
                    }

                } else {
                    console.error(t("clusterList.errorFetch"), response.statusText);
                }
            } catch (error) {
                console.error(t("clusterList.errorFetch"), error);
            }
            setLoading(false)

        };
        fetchPanels();
    }, [t]);

    const handleSort = (key: keyof SolarPanel) => {
        const sortedPanels = [...panels].sort((a, b) => {
            if (typeof a[key] === 'string' && typeof b[key] === 'string') {
                return (a[key] as string).localeCompare(b[key] as string);
            } else if (typeof a[key] === 'number' && typeof b[key] === 'number') {
                return (a[key] as number) - (b[key] as number);
            }
            return 0;
        });
        setPanels(sortedPanels);
        setSortKey(key);
    };

    const handleDelete = async (id: string) => {
        const token = localStorage.getItem('token');
        if (!token) return;

        try {
            const response = await fetch(`${backend_url || 'http://localhost:8080'}/api/panel/${id}`, {
                method: 'DELETE',
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });
            if (response.ok) {
                setPanels(panels.filter(panel => panel.id !== id));
            } else {
                console.error(t("clusterList.errorDelete"), response.statusText);
            }
        } catch (error) {
            console.error(t("clusterList.errorDelete"), error);
        }
    };

    const handleFilter = (event: React.ChangeEvent<HTMLInputElement>) => {
        setFilter(event.target.value);
    };

    const filteredPanels = panels.filter((panel) =>
        panel.name.toLowerCase().includes(filter.toLowerCase()) ||
        panel.location.city.toLowerCase().includes(filter.toLowerCase()) ||
        panel.location.country.toLowerCase().includes(filter.toLowerCase()) ||
        panel.location.district.toLowerCase().includes(filter.toLowerCase())
    );

    return (
        <div className="panel-list-container">
            <div className="list-header">
                <div className="panel-list-controls">
                    <input
                        type="text"
                        placeholder={t("clusterList.filterPlaceholder")}
                        value={filter}
                        onChange={handleFilter}
                        className="filter-input"
                    />
                    <button onClick={() => navigate('/add')} className="add-panel-button">
                        {t("clusterList.addButton")}
                    </button>
                    <div className="view-toggle-buttons">
                        <button
                            onClick={() => setViewMode('list')}
                            className={viewMode === 'list' ? 'active' : ''}
                        >
                            {t("clusterList.listView")}
                        </button>
                        <button
                            onClick={() => setViewMode('grid')}
                            className={viewMode === 'grid' ? 'active' : ''}
                        >
                            {t("clusterList.gridView")}
                        </button>
                    </div>
                </div>
                <div className="panel-sort-options">
                    <span className="sortby">{t("clusterList.sortBy")}</span>
                    <button onClick={() => handleSort('name')} className={sortKey === 'name' ? 'active' : ''}>
                        {t("clusterList.name")}
                    </button>
                    <button
                        onClick={() => handleSort('powerRating')}
                        className={sortKey === 'powerRating' ? 'active' : ''}
                    >
                        {t("clusterList.powerRating")}
                    </button>
                    <button
                        onClick={() => handleSort('efficiency')}
                        className={sortKey === 'efficiency' ? 'active' : ''}
                    >
                        {t("clusterList.efficiency")}
                    </button>
                    <button
                        onClick={() => handleSort('quantity')}
                        className={sortKey === 'quantity' ? 'active' : ''}
                    >
                        {t("clusterList.quantity")}
                    </button>
                </div>
            </div>

            {viewMode === 'list' && (
                <div className="panel-list-headers">
                    <div>{t("clusterList.name")}</div>
                    <div>{t("clusterList.powerRating")}</div>
                    <div>{t("clusterList.efficiency")}</div>
                    <div>{t("clusterList.quantity")}</div>
                    <div>{t("clusterList.cluster")}</div>
                    <div>{t("clusterList.location")}</div>
                    <div>{t("clusterList.actions")}</div>
                </div>
            )}
            {loading &&
                <div className="mini-loader-container">
                    <div className="loader"></div>
                </div>
            }
            {!loading && panels.length === 0 ? (
                <div className="no-panels-message">{t("clusterList.noPanelsMessage")}</div>
            ) : (
                <div className={`panel-list ${viewMode}`}>
                    {filteredPanels.map((panel) => (
                        <div key={panel.id} className="panel-cardd">
                            <div>{viewMode === 'grid' && <strong>{t("clusterList.name")}: </strong>}{panel.name}</div>
                            <div>{viewMode === 'grid' && <strong>{t("clusterList.powerRating")}: </strong>}{panel.powerRating}W</div>
                            <div>{viewMode === 'grid' && <strong>{t("clusterList.efficiency")}: </strong>}{panel.efficiency}%</div>
                            <div>{viewMode === 'grid' && <strong>{t("clusterList.quantity")}: </strong>}{panel.quantity}</div>
                            <div>{viewMode === 'grid' && <strong>{t("clusterList.cluster")}: </strong>}{panel.cluster?.name}</div>
                            <div>{viewMode === 'grid' && <strong>{t("clusterList.location")}: </strong>}{panel.location.city}, {panel.location.country}</div>
                            <div className="panel-actions">
                                <button onClick={() => navigate(`/view/${panel.id}`)} className="view-button">
                                    {t("clusterList.view")}
                                </button>
                                <button onClick={() => navigate(`/edit/${panel.id}`)} className="edit-button">
                                    {t("clusterList.edit")}
                                </button>
                                <button onClick={() => handleDelete(panel.id)} className="delete-button">
                                    {t("clusterList.delete")}
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default PanelList;
