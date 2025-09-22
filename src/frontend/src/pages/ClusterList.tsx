import React, { useEffect, useState } from 'react';
import { useNavigate } from "react-router-dom";
import { useTranslation } from 'react-i18next';
import { backend_url } from "../config";

interface Location {
    id: string;
    country: string;
    city: string;
    district: string;
    lat?: number;
    lon?: number;
}

interface Inverter {
    id: string;
    name: string;
    manufacturer: string;
    efficiency: number;
    capacity: number;
}

interface Cluster {
    id: string;
    name: string;
    description: string;
    location: Location;
    inverter: Inverter;
}

const ClusterList: React.FC = () => {
    const { t, i18n } = useTranslation();
    const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
    const [clusters, setClusters] = useState<Cluster[]>([]);
    const [sortKey, setSortKey] = useState<keyof Cluster>('name');
    const [filter, setFilter] = useState<string>('');
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);

    // Fetch clusters from the backend
    useEffect(() => {
        const fetchClusters = async () => {
            try {
                setLoading(true)
                const token = localStorage.getItem('token');
                const response = await fetch(`${backend_url}/api/cluster/user`, {
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
            setLoading(false)

        };
        fetchClusters();
    }, []);

    // Sorting logic
    const handleSort = (key: keyof Cluster | 'location' | 'inverter' | 'efficiency') => {
        const sortedClusters = [...clusters].sort((a, b) => {
            if (key === 'name' || key === 'description') {
                return (a[key] as string).localeCompare(b[key] as string);
            } else if (key === 'location') {
                return (
                    a.location.city.localeCompare(b.location.city) ||
                    a.location.country.localeCompare(b.location.country) ||
                    a.location.district.localeCompare(b.location.district)
                );
            } else if (key === 'inverter') {
                return a.inverter.name.localeCompare(b.inverter.name);
            } else if (key === 'efficiency') {
                return a.inverter.efficiency - b.inverter.efficiency;
            }
            return 0;
        });
        setClusters(sortedClusters);
        setSortKey(key as keyof Cluster);
    };

    // Deleting a cluster
    const handleDelete = async (id: string) => {
        const token = localStorage.getItem('token');
        if (!token) return;

        try {
            const response = await fetch(`${backend_url}/api/cluster/${id}`, {
                method: 'DELETE',
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });
            if (response.ok) {
                setClusters(clusters.filter(cluster => cluster.id !== id));
            } else {
                console.error("Failed to delete cluster:", response.statusText);
            }
        } catch (error) {
            console.error("Error deleting cluster:", error);
        }
    };

    // Filter clusters based on input
    const handleFilter = (event: React.ChangeEvent<HTMLInputElement>) => {
        setFilter(event.target.value);
    };

    const filteredClusters = clusters.filter((cluster) =>
        cluster.name.toLowerCase().includes(filter.toLowerCase()) ||
        cluster.location.city.toLowerCase().includes(filter.toLowerCase()) ||
        cluster.location.country.toLowerCase().includes(filter.toLowerCase()) ||
        cluster.location.district.toLowerCase().includes(filter.toLowerCase())
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
                    <button onClick={() => navigate('/add-cluster')} className="add-cluster-button">
                        {t('clusterList.addCluster')}
                    </button>
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
                <div className="cluster-sort-options">
                    <span className="sortby">{t('clusterList.sortBy')}</span>
                    <button onClick={() => handleSort('name')} className={sortKey === 'name' ? 'active' : ''}>
                        {t('clusterList.name')}
                    </button>
                    <button onClick={() => handleSort('location')} className={sortKey === 'location' ? 'active' : ''}>
                        {t('clusterList.location')}
                    </button>
                    <button onClick={() => handleSort('inverter')} className={sortKey === 'inverter' ? 'active' : ''}>
                        {t('clusterList.inverter')}
                    </button>
                </div>
            </div>
            {viewMode === 'list' && (
                <div className="list-headers">
                    <div>{t('clusterList.name')}</div>
                    <div>{t('clusterList.description')}</div>

                    <div>{t('clusterList.location')}</div>
                    <div>{t('clusterList.inverter')}</div>
                    <div>{t("clusterList.efficiency")}</div>
                    <div>{t('clusterList.actions')}</div>
                </div>
            )}
            {loading &&
                <div className="mini-loader-container">
                    <div className="loader"></div>
                </div>
            }
            {!loading && clusters.length === 0 ? (
                <div className="no-clusters-message">{t('clusterList.noClustersMessage')}</div>
            ) : (
                <div className={`cluster-list ${viewMode}`}>
                    {filteredClusters.map((cluster) => (
                        <div key={cluster.id} className="cluster-card">
                            <div>{viewMode === 'grid' && <strong>{t('clusterList.name')}: </strong>}{cluster.name}</div>
                            <div>
                                {viewMode === 'grid' && <strong>{t('clusterList.description')}: </strong>}
                                {cluster.description}
                            </div>
                            <div>
                                {viewMode === 'grid' && <strong>{t('clusterList.location')}: </strong>}
                                {cluster.location.city}, {cluster.location.country}
                            </div>
                            <div>
                                {viewMode === 'grid' && <strong>{t('clusterList.inverter')}: </strong>}
                                {cluster.inverter?.name ? cluster.inverter.name : 'N/A'}
                            </div>
                            <div>
                                {viewMode === 'grid' && <strong>{t('clusterList.efficiency')}: </strong>}
                                {cluster.inverter?.efficiency ? `${cluster.inverter.efficiency}%` : 'N/A'}
                            </div>
                            <div className="cluster-actions">
                                <button onClick={() => navigate(`/view-cluster/${cluster.id}`)} className="view-button">
                                    {t('clusterList.view')}
                                </button>
                                <button onClick={() => navigate(`/edit-cluster/${cluster.id}`)} className="edit-button">
                                    {t('clusterList.edit')}
                                </button>
                                <button onClick={() => handleDelete(cluster.id)} className="delete-button">
                                    {t('clusterList.delete')}
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default ClusterList;
