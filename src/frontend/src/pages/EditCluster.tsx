import React, {useEffect, useState} from 'react';
import {useParams} from 'react-router-dom';
import MapComponent from '../components/MapComponent';
import {backend_url} from "../config";
import {useTranslation} from "react-i18next";
import {LocationData, LocationDetails} from '../types/location';
import {DEFAULT_LOCATION, updateLocationState} from '../utils/location';
import {apiRequest, requireOk} from '../utils/apiClient';

interface ClusterFormData {
    name: string;
    description: string;
    location?: Partial<LocationData>;
    inverterId?: string; // Add inverterId to ClusterFormData
}

interface Inverter {
    id: string;
    name: string;
}

const EditCluster: React.FC = () => {
    const {id} = useParams<{ id: string }>();
    const isEditMode = Boolean(id);
    const {t} = useTranslation();

    const [inverters, setInverters] = useState<Inverter[]>([]); // State for list of inverters
    const [formData, setFormData] = useState<ClusterFormData>({
        name: '',
        description: '',
        location: {...DEFAULT_LOCATION},
        inverterId: '' // Initialize selected inverter ID
    });
    const [responseMessage, setResponseMessage] = useState<string | null>(null);

    // Fetch the list of inverters on component mount
    useEffect(() => {
        const fetchInverters = async () => {
            try {
                const data = await requireOk<{content: Inverter[]}>(
                    apiRequest(`${backend_url}/api/inverter/all`, {auth: true}),
                );
                setInverters(data.content);
            } catch (error) {
                console.error('Error fetching inverters:', error);
            }
        };

        fetchInverters();
    }, []);

    // Fetch existing cluster data if in edit mode
    useEffect(() => {
        if (!isEditMode) {
            return;
        }

        const fetchClusterData = async () => {
            try {
                const clusterData = await requireOk<ClusterFormData & { inverter?: { id: string } }>(
                    apiRequest(`${backend_url}/api/cluster/${id}`, {auth: true}),
                );
                setFormData({
                    ...clusterData,
                    inverterId: clusterData.inverter?.id || '',
                    location: clusterData.location ? {...clusterData.location} : {...DEFAULT_LOCATION},
                });
            } catch (error) {
                console.error('Error fetching cluster data:', error);
                setResponseMessage('An error occurred while fetching cluster data.');
            }
        };

        fetchClusterData();
    }, [id, isEditMode]);

    // Update form state on input change for non-location data
    const handleInputChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
    ) => {
        const {name, value} = e.target;
        setFormData((prevState) => ({
            ...prevState,
            [name]: value
        }));
    };

    // Function to handle map location changes (lat, lon)
    const handleLocationChange = (lat: number, lon: number) => {
        setFormData((prevState) => updateLocationState(prevState, {lat, lon}));
    };

    // Function to handle address changes from map component
    const handleAddressChange = (address: LocationDetails) => {
        setFormData((prevState) => updateLocationState(prevState, address));
    };

    // Function to update the map when manual address is entered
    const handleAddressManualChange = (
        e: React.ChangeEvent<HTMLInputElement>
    ) => {
        const {name, value} = e.target;
        setFormData((prevState) => updateLocationState(prevState, {[name]: value} as Partial<LocationData>));
    };

    // Submit form for add or edit
    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        if (!localStorage.getItem('token')) {
            setResponseMessage('You must be logged in to add or edit a cluster.');
            return;
        }

        try {
            const {response, data} = await apiRequest(
                isEditMode ? `${backend_url}/api/cluster/${id}` : `${backend_url}/api/cluster/add`,
                {
                    method: isEditMode ? 'PUT' : 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify(formData),
                    auth: true,
                },
            );

            if (response.ok) {
                setResponseMessage(isEditMode ? 'Cluster updated successfully!' : 'Cluster added successfully!');
            } else {
                setResponseMessage(`Error: ${data || 'Unknown error'}`);
            }
        } catch (error) {
            setResponseMessage('An error occurred while submitting the cluster.');
            console.error('Error:', error);
        }
    };

    return (
        <div className="panel-container">
            <div className="panel-card">
                <h2>{isEditMode ? t('editCluster.titleEdit') : t('editCluster.titleAdd')}</h2>
                <form onSubmit={handleSubmit}>
                    <div className="panel-info">
                        <div className="info-item">
                            <label>{t('editCluster.form.clusterName')}:</label>
                            <input
                                type="text"
                                name="name"
                                value={formData.name}
                                onChange={handleInputChange}
                                required
                                placeholder={t('editCluster.form.clusterNamePlaceholder')}
                            />
                        </div>
                        <div className="info-item">
                            <label>{t('editCluster.form.description')}:</label>
                            <textarea
                                name="description"
                                value={formData.description}
                                onChange={handleInputChange}
                                placeholder={t('editCluster.form.descriptionPlaceholder')}
                            />
                        </div>
                        <div className="info-item">
                            <label>{t('editCluster.form.inverter')}:</label>
                            <select
                                name="inverterId"
                                value={formData.inverterId || ''}
                                onChange={handleInputChange}
                            >
                                <option value="">{t('editCluster.form.inverterPlaceholder')}</option>
                                {inverters.map((inverter) => (
                                    <option key={inverter.id} value={inverter.id}>
                                        {inverter.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <p>{t('editCluster.form.locationInfo')}</p>

                    {/* Manual Address Input */}
                    <div className="location-manual-input">
                        <div className="info-item">
                            <label>{t('editCluster.form.country')}:</label>
                            <input
                                type="text"
                                name="country"
                                value={formData.location?.country || ''}
                                onChange={handleAddressManualChange}
                                placeholder={t('editCluster.form.countryPlaceholder')}
                            />
                        </div>
                        <div className="info-item">
                            <label>{t('editCluster.form.city')}:</label>
                            <input
                                type="text"
                                name="city"
                                value={formData.location?.city || ''}
                                onChange={handleAddressManualChange}
                                placeholder={t('editCluster.form.cityPlaceholder')}
                            />
                        </div>
                        <div className="info-item">
                            <label>{t('editCluster.form.district')}:</label>
                            <input
                                type="text"
                                name="district"
                                value={formData.location?.district || ''}
                                onChange={handleAddressManualChange}
                                placeholder={t('editCluster.form.districtPlaceholder')}
                            />
                        </div>
                    </div>

                    <button type="submit" className="btn-submit">
                        {isEditMode ? t('editCluster.form.submitButtonEdit') : t('editCluster.form.submitButtonAdd')}
                    </button>
                </form>
                {responseMessage && <div className="response-message">{responseMessage}</div>}
            </div>
            <div className="panel-map-container">
                <h2 className="location_header">{t('editCluster.mapSection.header')}</h2>
                <MapComponent
                    onLocationChange={handleLocationChange}
                    address={{
                        country: formData.location?.country || t('editCluster.mapSection.defaultCountry'),
                        city: formData.location?.city || t('editCluster.mapSection.defaultCity'),
                        district: formData.location?.district || t('editCluster.mapSection.defaultDistrict'),
                    }}
                    onAddressChange={handleAddressChange}
                    lat={formData.location?.lat || DEFAULT_LOCATION.lat}
                    lon={formData.location?.lon || DEFAULT_LOCATION.lon}
                />
            </div>
        </div>
    );
};

export default EditCluster;
