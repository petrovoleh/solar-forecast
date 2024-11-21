import React, {useEffect, useState} from 'react';
import './PanelList.css';
import {useNavigate} from "react-router-dom";
import {backend_url} from "../config";

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
    const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
    const [panels, setPanels] = useState<SolarPanel[]>([]);
    const [clusters, setClusters] = useState<SolarPanel[]>([]);  // Store clusters in a separate state
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

                // Check if the response is ok and has content
                if (response.ok) {
                    const text = await response.text(); // Get response as plain text first

                    if (text) {
                        const data = JSON.parse(text); // Parse only if there's content
                        setPanels(data);
                    } else {
                        setPanels([]); // Handle case with no data (empty array)
                    }
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

    const handleSort = (key: keyof SolarPanel | 'type') => {
        const sortedPanels = [...combinedData].sort((a, b) => {
            if (key === 'location') {
                // Compare by city first, then country, then district
                const aLocation = `${a.location.city || ''}, ${a.location.country || ''}, ${a.location.district || ''}`;
                const bLocation = `${b.location.city || ''}, ${b.location.country || ''}, ${b.location.district || ''}`;
                return aLocation.localeCompare(bLocation);
            } else if (key === 'type') {
                return a.type.localeCompare(b.type);
            } else if (typeof a[key] === 'string' && typeof b[key] === 'string') {
                // For other string fields like 'name'
                return (a[key] as string).localeCompare(b[key] as string);
            }
            return 0;
        });

        setCombinedData(sortedPanels);
        setSortKey(key as keyof SolarPanel); // Update sortKey state
    };


    const handleFilter = (event: React.ChangeEvent<HTMLInputElement>) => {
        setFilter(event.target.value);
    };
    const [combinedData, setCombinedData] = useState<SolarPanel[]>([]);

// Update `combinedData` whenever `panels` or `clusters` change
    useEffect(() => {
        setCombinedData([
            ...panels.map(panel => ({...panel, type: 'panel' as 'panel'})),
            ...clusters.map(cluster => ({...cluster, type: 'cluster' as 'cluster'})),
        ]);
    }, [panels, clusters]);


    const filteredPanels = combinedData.filter((item) =>
        (item.name && item.name.toLowerCase().includes(filter.toLowerCase())) ||
        (item.location?.city && item.location.city.toLowerCase().includes(filter.toLowerCase())) ||
        (item.location?.country && item.location.country.toLowerCase().includes(filter.toLowerCase())) ||
        (item.location?.district && item.location.district.toLowerCase().includes(filter.toLowerCase()))
    );


    return (
        <div className="panel-list-container">
            <div className="panel-list-header">
                <div className="panel-list-controls">
                    <input
                        type="text"
                        placeholder="Filter by name or location"
                        value={filter}
                        onChange={handleFilter}
                        className="filter-input"
                    />
                    <button onClick={() => navigate('/add')} className="add-panel-button">Add New Panel</button>
                    <div className="view-toggle-buttons">
                        <button onClick={() => setViewMode('list')} className={viewMode === 'list' ? 'active' : ''}>List
                            View
                        </button>
                        <button onClick={() => setViewMode('grid')} className={viewMode === 'grid' ? 'active' : ''}>Grid
                            View
                        </button>
                    </div>
                </div>
                <div className="panel-sort-options">
                    <span className="sortby">Sort by:</span>
                    <button onClick={() => handleSort('name')} className={sortKey === 'name' ? 'active' : ''}>Name
                    </button>
                    <button onClick={() => handleSort('location')}
                            className={sortKey === 'location' ? 'active' : ''}>Location
                    </button>
                    <button onClick={() => handleSort('type')} className={sortKey === 'type' ? 'active' : ''}>Type
                    </button>
                </div>

            </div>

            {/* Render headers when in list view */}
            {viewMode === 'list' && (
                <div className="forecast-list-headers">
                    <div>Name</div>
                    <div>Location</div>
                    <div>Type</div>
                    <div>Actions</div>
                </div>
            )}

            {filteredPanels.length === 0 ? (
                <div className="no-panels-message">No solar panels added yet.</div>
            ) : (
                <div className={`panel-list ${viewMode}`}>
                    {filteredPanels.map((panel) => (
                        <div key={panel.id} className="panel-cardd forecast-card ">
                            <div>{viewMode === 'grid' && <strong>Name: </strong>}{panel.name}</div>
                            <div>{viewMode === 'grid' &&
                                <strong>Location: </strong>}{panel.location.city}, {panel.location.country}</div>
                            <div>{viewMode === 'grid' &&
                                <strong>Type: </strong>}{panel.type}</div>

                            <div className="panel-actions">
                                <button
                                    onClick={() => navigate(`/bar_forecast/${panel.id}?type=${panel.type}`)}
                                    className="view-button"
                                >
                                    Bar forecast
                                </button>
                                <button
                                    onClick={() => navigate(`/panel_forecast/${panel.id}?type=${panel.type}`)}
                                    className="view-button"
                                >
                                    Graph Forecast
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
