import React, {useEffect, useState} from 'react';
import {useNavigate, useParams} from 'react-router-dom';
import {backend_url} from "../config";
import { useTranslation } from 'react-i18next';

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
    const {id} = useParams<{ id: string }>();
    const [panelData, setPanelData] = useState<PanelData | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const navigate = useNavigate();
    const token = localStorage.getItem('token');
    const { t } = useTranslation();

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
        return  (
            <div className="profile-container">
                <div className="loader"></div>
            </div>
        )
    }

    if (!panelData) {
        return <div>Panel not found</div>;
    }

    return (
        <div className="profile-container">
            <div className="profile-card">
                <h2>{t('viewPanel.panelName')}: {panelData.name}</h2>
                <div className="profile-info">
                    <div className="info-item">
                        <label>{t('viewPanel.powerRating')}:</label>
                        <p>{panelData.powerRating}</p>
                    </div>
                    {/*<div className="info-item">*/}
                    {/*    <label>{t('viewPanel.temperatureCoefficient')}:</label>*/}
                    {/*    <p>{panelData.temperatureCoefficient}</p>*/}
                    {/*</div>*/}
                    <div className="info-item">
                        <label>{t('viewPanel.efficiency')}:</label>
                        <p>{panelData.efficiency}</p>
                    </div>
                    <div className="info-item">
                        <label>{t('viewPanel.quantity')}:</label>
                        <p>{panelData.quantity}</p>
                    </div>
                    {panelData.location && (
                        <div className="info-item">
                            <h3>{t('viewPanel.location')}</h3>
                            <p>{t('viewPanel.country')}: {panelData.location.country}</p>
                            <p>{t('viewPanel.city')}: {panelData.location.city}</p>
                            <p>{t('viewPanel.district')}: {panelData.location.district}</p>
                        </div>
                    )}
                </div>

                <button className="primary-button edit-button" onClick={() => navigate(`/edit/{id}`)}>
                    {t('viewPanel.editButton')}
                </button>
                <button className="exit-button" onClick={() => navigate(`/panelslist`)}>
                    {t('viewPanel.backButton')}
                </button>
            </div>
        </div>
    );
};

export default ViewPanel;
