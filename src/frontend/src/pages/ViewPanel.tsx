import React, { useEffect, useState } from 'react';
import {useNavigate, useParams} from 'react-router-dom';
import {backend_url} from "../config";

interface PanelData {
    name: string;
    powerRating: number;
    temperatureCoefficient: number;
    efficiency: number;
    quantity: number;
    location?: {
        country: string;
        city: string;
        district: string;
    };
}

const ViewPanel: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const [panelData, setPanelData] = useState<PanelData | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const navigate = useNavigate();
    const token = localStorage.getItem('token');

    useEffect(() => {
        const fetchPanelData = async () => {
            try {
                const response = await fetch(`${backend_url}/api/panel/${id}`, {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`,

                    },
                });

                if (response.ok) {
                    const data = await response.json();
                    setPanelData(data);
                } else {
                    console.error('Failed to fetch panel data');
                }
            } catch (error) {
                console.error('Error:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchPanelData();
    }, [id]);


    if (loading) {
        return <div>Loading...</div>;
    }

    if (!panelData) {
        return <div>Panel not found</div>;
    }

    return (
        <div className="profile-container">
            <div className="profile-card">
                <h2>{panelData.name}</h2>
                <div className="profile-info">
                    <div className="info-item">
                        <label>Power Rating (W):</label>
                        <p>{panelData.powerRating}</p>
                    </div>
                    <div className="info-item">
                        <label>Temperature Coefficient (%/°C):</label>
                        <p>{panelData.temperatureCoefficient}</p>
                    </div>
                    <div className="info-item">
                        <label>Efficiency (%):</label>
                        <p>{panelData.efficiency}</p>
                    </div>
                    <div className="info-item">
                        <label>Quantity:</label>
                        <p>{panelData.quantity}</p>
                    </div>
                    {panelData.location && (
                        <div className="info-item">
                            <h3>Location Information</h3>
                            <p>Country: {panelData.location.country}</p>
                            <p>City: {panelData.location.city}</p>
                            <p>District: {panelData.location.district}</p>
                        </div>
                    )}
                </div>

                <button className="edit-button" onClick={() => navigate(`/edit/{id}`)}>
                    Edit Panel
                </button>
                <button className="exit-button" onClick={() => navigate(`/panelslist`)}>
                    Back
                </button>
            </div>
        </div>
    );
};

export default ViewPanel;
