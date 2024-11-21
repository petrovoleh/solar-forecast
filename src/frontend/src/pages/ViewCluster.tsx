import React, {useEffect, useState} from 'react';
import {useNavigate, useParams} from 'react-router-dom';
import './ViewCluster.css';
import {backend_url} from '../config';

interface Location {
    country: string;
    city: string;
    district: string;
    lat?: number;
    lon?: number;
}

interface Inverter {
    id: string;
    name: string;
    capacity: number;
    efficiency: number;
    manufacturer: string;
}

interface Cluster {
    id: string;
    name: string;
    description: string;
    location: Location;
    inverter?: Inverter;
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

const ViewCluster: React.FC = () => {
    const {id} = useParams<{ id: string }>();
    const navigate = useNavigate();

    const [cluster, setCluster] = useState<Cluster | null>(null);
    const [panels, setPanels] = useState<SolarPanel[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    const token = localStorage.getItem('token');

    // Fetch cluster data
    useEffect(() => {
        const fetchCluster = async () => {
            try {
                const response = await fetch(`${backend_url}/api/cluster/${id}`, {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                    },
                });

                if (response.ok) {
                    const data = await response.json();
                    setCluster(data);
                } else {
                    setErrorMessage('Failed to fetch cluster data.');
                }
            } catch (error) {
                setErrorMessage('An error occurred while fetching cluster data.');
                console.error('Error fetching cluster:', error);
            }
        };

        fetchCluster();
    }, [id, token]);

    // Fetch panels data
    useEffect(() => {
        const fetchPanels = async () => {
            try {
                const response = await fetch(`${backend_url}/api/panel/user`, {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                });

                if (response.ok) {
                    const allPanels: SolarPanel[] = await response.json();
                    const filteredPanels = allPanels.filter((panel) => panel.cluster?.id === id);
                    setPanels(filteredPanels);
                } else {
                    setErrorMessage('Failed to fetch panels.');
                }
            } catch (error) {
                console.error('Error fetching panels:', error);
                setErrorMessage('An error occurred while fetching panels.');
            } finally {
                setLoading(false);
            }
        };

        fetchPanels();
    }, [id, token]);

    if (loading) {
        return <div>Loading...</div>;
    }

    if (errorMessage) {
        return <div className="error-message">{errorMessage}</div>;
    }

    if (!cluster) {
        return <div>Cluster not found</div>;
    }

    return (
        <div className="cluster-view-container ">
            <div className="cluster-details">
                <h1>Cluster: {cluster.name}</h1>
                <p><strong>Description:</strong> {cluster.description}</p>
                <div className="location-info">
                    <h2>Location</h2>
                    <p><strong>Country:</strong> {cluster.location.country}</p>
                    <p><strong>City:</strong> {cluster.location.city}</p>
                    <p><strong>District:</strong> {cluster.location.district}</p>
                </div>
                {cluster.inverter && (
                    <div className="inverter-info">
                        <h2>Inverter Information</h2>
                        <p><strong>Name:</strong> {cluster.inverter.name}</p>
                        <p><strong>Capacity:</strong> {cluster.inverter.capacity} kW</p>
                        <p><strong>Efficiency:</strong> {cluster.inverter.efficiency}%</p>
                        <p><strong>Manufacturer:</strong> {cluster.inverter.manufacturer}</p>
                    </div>
                )}
            </div>

            <div className="panels-list">
                <h2>Solar Panels in this Cluster</h2>
                {panels.length === 0 ? (
                    <p>No panels assigned to this cluster.</p>
                ) : (
                    <div className="panel-list">
                        {panels.map((panel) => (
                            <div key={panel.id} className="panel-card">
                                <h3>{panel.name}</h3>
                                <p><strong>Power Rating:</strong> {panel.powerRating}W</p>
                                <p><strong>Efficiency:</strong> {panel.efficiency}%</p>
                                <p><strong>Quantity:</strong> {panel.quantity}</p>
                                <p>
                                    <strong>Location:</strong> {panel.location.city}, {panel.location.country}
                                </p>
                                <div className="panel-actions">
                                    <button onClick={() => navigate(`/view/${panel.id}`)}>View</button>
                                    <button onClick={() => navigate(`/edit/${panel.id}`)}>Edit</button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <button className="back-button" onClick={() => navigate('/clusterslist')}>Back</button>
        </div>
    );
};

export default ViewCluster;
