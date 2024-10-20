import React, { useState, useEffect } from 'react';
import './PanelList.css';
import { useNavigate } from "react-router-dom";
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
    location: Location; // Updated with correct structure
}

const PanelList: React.FC = () => {
    const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
    const [panels, setPanels] = useState<SolarPanel[]>([]);
    const [sortKey, setSortKey] = useState<keyof SolarPanel>('name');
    const [filter, setFilter] = useState<string>('');
    const navigate = useNavigate();

    useEffect(() => {
        const fetchPanels = async () => {
            try {
                const token = localStorage.getItem('token');
                const response = await fetch('http://localhost:8080/api/panel/user', {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                });
                if (response.ok) {
                    const data = await response.json();
                    setPanels(data);
                } else {
                    console.error("Failed to fetch panels:", response.statusText);
                }
            } catch (error) {
                console.error("Error fetching panels:", error);
            }
        };
        fetchPanels();
    }, []);

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
                        <button onClick={() => setViewMode('list')} className={viewMode === 'list' ? 'active' : ''}>List View</button>
                        <button onClick={() => setViewMode('grid')} className={viewMode === 'grid' ? 'active' : ''}>Grid View</button>
                    </div>
                </div>
                <div className="panel-sort-options">
                    <span>Sort by:</span>
                    <button onClick={() => handleSort('name')} className={sortKey === 'name' ? 'active' : ''}>Name</button>
                    <button onClick={() => handleSort('powerRating')} className={sortKey === 'powerRating' ? 'active' : ''}>Power Rating</button>
                    <button onClick={() => handleSort('efficiency')} className={sortKey === 'efficiency' ? 'active' : ''}>Efficiency</button>
                    <button onClick={() => handleSort('quantity')} className={sortKey === 'quantity' ? 'active' : ''}>Quantity</button>
                    <button onClick={() => handleSort('location')} className={sortKey === 'location' ? 'active' : ''}>Location</button>
                </div>
            </div>

            {/* Render headers when in list view */}
            {viewMode === 'list' && (
                <div className="panel-list-headers">
                    <div>Name</div>
                    <div>Power Rating</div>
                    <div>Efficiency</div>
                    <div>Quantity</div>
                    <div>Location</div>
                    <div>Actions</div>
                </div>
            )}

            <div className={`panel-list ${viewMode}`}>
                {filteredPanels.map((panel) => (
                    <div key={panel.id} className="panel-cardd">
                        <div>{viewMode === 'grid' && <strong>Name: </strong>}{panel.name}</div>
                        <div>{viewMode === 'grid' && <strong>Power Rating: </strong>}{panel.powerRating}W</div>
                        <div>{viewMode === 'grid' && <strong>Efficiency: </strong>}{panel.efficiency}%</div>
                        <div>{viewMode === 'grid' && <strong>Quantity: </strong>}{panel.quantity}</div>
                        <div>{viewMode === 'grid' && <strong>Location: </strong>}{panel.location.city}, {panel.location.country}</div>
                        <div className="panel-actions">
                            <button onClick={() => navigate(`/view/${panel.id}`)} className="view-button">View</button>
                            <button onClick={() => navigate(`/edit/${panel.id}`)} className="edit-button">Edit</button>
                            <button className="delete-button">Delete</button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default PanelList;
