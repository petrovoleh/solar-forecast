import React, {useEffect, useState} from 'react';
import {useNavigate, useParams} from 'react-router-dom';
import {backend_url} from '../config';
import { useTranslation } from 'react-i18next';

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
    const { t } = useTranslation();

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
        return  (
            <div className="profile-container">
                <div className="loader"></div>
            </div>
        )
    }

    if (errorMessage) {
        return <div className="error-message">{errorMessage}</div>;
    }

    if (!cluster) {
        return <div>Cluster not found</div>;
    }

    return (
        <div className="profile-container ">

            <div className="cluster-view-container ">
                <div className="cluster-details">
                    <h1>{t("clusterList.cluster")}: {cluster.name}</h1>
                    <p><strong>{t("clusterList.description")}:</strong> {cluster.description}</p>
                    <div className="location-info">
                        <h2>{t("viewPanel.location")}</h2>
                        <p><strong>{t("viewPanel.country")}:</strong> {cluster.location.country}</p>
                        <p><strong>{t("viewPanel.city")}:</strong> {cluster.location.city}</p>
                        <p><strong>{t("viewPanel.district")}:</strong> {cluster.location.district}</p>
                    </div>
                    {cluster.inverter && (
                        <div className="inverter-info">
                            <h2>{t("clusterList.inverterInformation")}</h2>
                            <p><strong>{t("clusterList.name")}:</strong> {cluster.inverter.name}</p>
                            <p><strong>{t("clusterList.capacity")}:</strong> {cluster.inverter.capacity} kW</p>
                            <p><strong>{t("clusterList.efficiency")}:</strong> {cluster.inverter.efficiency}%</p>
                            <p><strong>{t("clusterList.manufacturer")}:</strong> {cluster.inverter.manufacturer}</p>
                        </div>
                    )}
                </div>

                <div className="panels-list">
                    <h2>{t("clusterList.solarPanelsInCluster")}</h2>
                    {panels.length === 0 ? (
                        <p>No panels assigned to this cluster.</p>
                    ) : (
                        <div className="panel-list">
                            {panels.map((panel) => (
                                <div key={panel.id} className="panel-cardd">
                                    <h3><strong>{t("viewPanel.panelName")}:</strong> {panel.name}</h3>
                                    <p><strong>{t("viewPanel.powerRating")}:</strong> {panel.powerRating}W</p>
                                    <p><strong>{t("viewPanel.efficiency")}:</strong> {panel.efficiency}%</p>
                                    <p><strong>{t("viewPanel.quantity")}:</strong> {panel.quantity}</p>

                                    <div className="panel-actions">
                                        <button onClick={() => navigate(`/view/${panel.id}`)}>{t("clusterList.view")}</button>
                                        <button onClick={() => navigate(`/edit/${panel.id}`)}>{t("clusterList.edit")}</button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
                <button onClick={() => navigate(`/edit-cluster/${cluster?.id}`)} className="edit-button">
                    {t("clusterList.edit")}
                </button>
                <button className="exit-button" onClick={() => navigate('/clusterlist')}>                    {t('viewPanel.backButton')}
                </button>
            </div>
        </div>

    );
};

export default ViewCluster;
