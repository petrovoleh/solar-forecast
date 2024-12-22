import React, {useEffect, useState} from 'react';
import {useParams} from 'react-router-dom';
import MapComponent from '../components/MapComponent';
import {backend_url} from "../config";
import {useTranslation} from "react-i18next";

interface LocationRequest {
    lat: number;
    lon: number;
    city: string;
    district: string;
    country: string;
}
interface User {
    username: string;
    email: string;
    location: Address | null;
}
interface Address {
    country: string;
    city: string;
    district: string;
    lat: number;
    lon: number;
}
interface ClusterFormData {
    name: string;
    description: string;
    location?: LocationRequest;
    inverterId?: string; // Add inverterId to ClusterFormData
}

interface Inverter {
    id: string;
    name: string;
}

const AddCluster: React.FC = () => {
    const {id} = useParams<{ id: string }>();
    const isEditMode = Boolean(id);
    const { t } = useTranslation();

    const [inverters, setInverters] = useState<Inverter[]>([]); // State for list of inverters
    const [formData, setFormData] = useState<ClusterFormData>({
        name: '',
        description: '',
        location: {
            lat: 54.6872, // Default latitude (Vilnius)
            lon: 25.2797, // Default longitude (Vilnius)
            city: '',
            district: '',
            country: ''
        },
        inverterId: '' // Initialize selected inverter ID
    });
    const [responseMessage, setResponseMessage] = useState<string | null>(null);
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);



    // Fetch the list of inverters on component mount
    useEffect(() => {
        const fetchInverters = async () => {
            try {
                const token = localStorage.getItem('token');
                const response = await fetch(`${backend_url}/api/inverter/all`, {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });
                if (response.ok) {
                    const data = await response.json();
                    const content = data.content
                    setInverters(content); // Set the inverter list

                } else {
                    console.error('Failed to fetch inverters');
                }
            } catch (error) {
                console.error('Error fetching inverters:', error);
            }
        };

        fetchInverters();
    }, []);

    // Fetch existing cluster data if in edit mode
    useEffect(() => {
        if (isEditMode) {
            const fetchClusterData = async () => {
                try {
                    const token = localStorage.getItem('token');
                    const response = await fetch(`${backend_url}/api/cluster/${id}`, {
                        headers: {
                            'Authorization': `Bearer ${token}`,
                        },
                    });
                    if (response.ok) {
                        const clusterData = await response.json();
                        setFormData({
                            ...clusterData,
                            inverterId: clusterData.inverter?.id || ''
                        });
                    } else {
                        setResponseMessage('Failed to fetch cluster data.');
                    }
                } catch (error) {
                    setResponseMessage('An error occurred while fetching cluster data.');
                }
            };
            fetchClusterData();
        }
    }, [id, isEditMode]);

    // Update form state on input change for non-location data
    const handleInputChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
    ) => {
        const {name, value} = e.target;
        setFormData((prevState) => ({
            ...prevState,
            [name]: value
        }));
    };

    // Function to handle map location changes (lat, lon)
    const handleLocationChange = (lat: number, lon: number) => {
        setFormData((prevState) => ({
            ...prevState,
            location: {
                ...prevState.location!,
                lat,
                lon
            }
        }));
    };

    // Function to handle address changes from map component
    const handleAddressChange = (address: { country: string; city: string; district: string }) => {
        setFormData((prevState) => ({
            ...prevState,
            location: {
                ...prevState.location!,
                ...address
            }
        }));
    };

    // Function to update the map when manual address is entered
    const handleAddressManualChange = (
        e: React.ChangeEvent<HTMLInputElement>
    ) => {
        const {name, value} = e.target;
        setFormData((prevState) => ({
            ...prevState,
            location: {
                ...prevState.location!,
                [name]: value
            }
        }));
    };

    // Submit form for add or edit
    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        const token = localStorage.getItem('token');
        if (!token) {
            setResponseMessage('You must be logged in to add or edit a cluster.');
            return;
        }

        try {
            const response = await fetch(
                isEditMode ? `${backend_url}/api/cluster/${id}` : `${backend_url}/api/cluster/add`,
                {
                    method: isEditMode ? 'PUT' : 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`,
                    },
                    body: JSON.stringify(formData),
                }
            );

            if (response.ok) {
                setResponseMessage(isEditMode ? 'Cluster updated successfully!' : 'Cluster added successfully!');
            } else {
                const errorMessage = await response.text();
                setResponseMessage(`Error: ${errorMessage}`);
            }
        } catch (error) {
            setResponseMessage('An error occurred while submitting the cluster.');
            console.error('Error:', error);
        }
    };

    return (
        <div className="cluster-container">
            <div className="cluster-card2">
                <h2>{isEditMode ? t('addCluster.titleEdit') : t('addCluster.titleAdd')}</h2>
                <form onSubmit={handleSubmit}>
                    <div className="cluster-info">
                        <div className="info-item">
                            <label>{t('addCluster.form.panelName')}:</label>
                            <input
                                type="text"
                                name="name"
                                value={formData.name}
                                onChange={handleInputChange}
                                required
                                placeholder={t('addCluster.form.panelNamePlaceholder')}
                            />
                        </div>
                        <div className="info-item">
                            <label>{t('addCluster.form.description')}:</label>
                            <textarea
                                name="description"
                                value={formData.description}
                                onChange={handleInputChange}
                                required
                                placeholder={t('addCluster.form.description')}
                            />
                        </div>
                    </div>

                    {/* Inverter Selection Dropdown */}
                    <div className="info-item">
                        <label>{t('clusterList.inverter')}:</label>
                        <select
                            required
                            name="inverterId"
                            value={formData.inverterId || ''} // Default to empty if no inverter selected
                            onChange={(e) =>
                                setFormData((prevState) => ({
                                    ...prevState,
                                    inverterId: e.target.value
                                }))
                            }
                        >
                            <option value="">{t('addCluster.form.selectInverter')}</option>
                            {inverters.map((inverter) => (
                                <option key={inverter.id} value={inverter.id}>
                                    {inverter.name}
                                </option>
                            ))}
                        </select>
                    </div>
                    <p>{t('addCluster.form.clusterInfo')}</p>

                    {/* Manual Address Input */}
                    <div className="location-manual-input">
                        <div className="info-item">
                            <label>{t('addCluster.form.country')}:</label>
                            <input
                                type="text"
                                required
                                name="country"
                                value={formData.location?.country || ''}
                                onChange={handleAddressManualChange}
                                placeholder={t('addCluster.form.countryPlaceholder')}
                            />
                        </div>
                        <div className="info-item">
                            <label>{t('addCluster.form.city')}:</label>
                            <input
                                type="text"
                                required
                                name="city"
                                value={formData.location?.city || ''}
                                onChange={handleAddressManualChange}
                                placeholder={t('addCluster.form.cityPlaceholder')}
                            />
                        </div>
                        <div className="info-item">
                            <label>{t('addCluster.form.district')}:</label>
                            <input
                                type="text"
                                required
                                name="district"
                                value={formData.location?.district || ''}
                                onChange={handleAddressManualChange}
                                placeholder={t('addCluster.form.districtPlaceholder')}
                            />
                        </div>
                    </div>

                    <button type="submit" className="btn-submit">
                        {isEditMode ? t('addCluster.form.submitButtonEdit') : t('addCluster.form.submitButtonAdd')}
                    </button>
                    {responseMessage && <p>{responseMessage}</p>}
                </form>
            </div>

            {/* Right side: Map */}
            <div className="cluster-map-container">
                <h2 className="location_header">{t('addCluster.mapSection.header')}</h2>
                <MapComponent
                    onLocationChange={handleLocationChange}
                    address={formData.location || {
                        country: "Lithuania",
                        city: "Vilnius",
                        district: "Vilnius County",
                    }}
                    onAddressChange={handleAddressChange}
                    lat={formData.location?.lat || 54.6872} // Default latitude (Vilnius)
                    lon={formData.location?.lon || 25.2797} // Default longitude (Vilnius)
                />

            </div>
        </div>
    );
};

export default AddCluster;
