import React, { useState, useEffect } from 'react';
import './ClusterList.css';
import { useNavigate } from "react-router-dom";
import {backend_url} from "../config";

interface Location {
    country: string;
    city: string;
    district: string;
    lat?: number;
    lon?: number;
}

interface Cluster {
    id: string;
    name: string;
    description: string;
    location: Location;
}

const ClusterList: React.FC = () => {
    const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
    const [clusters, setClusters] = useState<Cluster[]>([]);
    const [sortKey, setSortKey] = useState<keyof Cluster>('name');
    const [filter, setFilter] = useState<string>('');
    const navigate = useNavigate();

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

                    if (text) {
                        const data = JSON.parse(text);
                        setClusters(data);
                    } else {
                        setClusters([]);
                    }
                } else {
                    console.error("Failed to fetch clusters:", response.statusText);
                }
            } catch (error) {
                console.error("Error fetching clusters:", error);
            }
        };
        fetchClusters();
    }, []);

    const handleSort = (key: keyof Cluster) => {
        const sortedClusters = [...clusters].sort((a, b) => {
            if (typeof a[key] === 'string' && typeof b[key] === 'string') {
                return (a[key] as string).localeCompare(b[key] as string);
            }
            return 0;
        });
        setClusters(sortedClusters);
        setSortKey(key);
    };

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
        <div className="cluster-list-container">
            <div className="cluster-list-header">
                <div className="cluster-list-controls">
                    <input
                        type="text"
                        placeholder="Filter by name or location"
                        value={filter}
                        onChange={handleFilter}
                        className="filter-input"
                    />
                    <button onClick={() => navigate('/add-cluster')} className="add-cluster-button">Add New Cluster</button>
                    <div className="view-toggle-buttons">
                        <button onClick={() => setViewMode('list')} className={viewMode === 'list' ? 'active' : ''}>List View</button>
                        <button onClick={() => setViewMode('grid')} className={viewMode === 'grid' ? 'active' : ''}>Grid View</button>
                    </div>
                </div>
                <div className="cluster-sort-options">
                    <span>Sort by:</span>
                    <button onClick={() => handleSort('name')} className={sortKey === 'name' ? 'active' : ''}>Name</button>
                    <button onClick={() => handleSort('description')} className={sortKey === 'description' ? 'active' : ''}>Description</button>
                    <button onClick={() => handleSort('location')} className={sortKey === 'location' ? 'active' : ''}>Location</button>
                </div>
            </div>

            {viewMode === 'list' && (
                <div className="cluster-list-headers">
                    <div>Name</div>
                    <div>Description</div>
                    <div>Location</div>
                    <div>Actions</div>
                </div>
            )}

            {clusters.length === 0 ? (
                <div className="no-clusters-message">No clusters added yet.</div>
            ) : (
                <div className={`cluster-list ${viewMode}`}>
                    {filteredClusters.map((cluster) => (
                        <div key={cluster.id} className="cluster-card">
                            <div>{viewMode === 'grid' && <strong>Name: </strong>}{cluster.name}</div>
                            <div>{viewMode === 'grid' && <strong>Description: </strong>}{cluster.description}</div>
                            <div>{viewMode === 'grid' && <strong>Location: </strong>}{cluster.location.city}, {cluster.location.country}</div>
                            <div className="cluster-actions">
                                <button onClick={() => navigate(`/view-cluster/${cluster.id}`)} className="view-button">View</button>
                                <button onClick={() => navigate(`/edit-cluster/${cluster.id}`)} className="edit-button">Edit</button>
                                <button onClick={() => handleDelete(cluster.id)} className="delete-button">Delete</button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default ClusterList;
