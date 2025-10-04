import React, {useEffect, useState} from 'react';
import {useParams} from 'react-router-dom'; // Import for reading route parameters
import {useTranslation} from 'react-i18next';
import MapComponent from '../components/MapComponent';
import {backend_url} from "../config"; // Import MapComponent
import {LocationData, LocationDetails} from '../types/location';
import {DEFAULT_LOCATION, updateLocationState} from '../utils/location';
import {apiRequest, requireOk} from '../utils/apiClient';

// Define the type for cluster
interface Cluster {
    id: string;
    name: string;
    location: LocationData; // Address is of the same type as in panel
}

// Define the type for the panel form data
interface PanelFormData {
    name: string;
    powerRating: number;
    temperatureCoefficient: number;
    efficiency: number;
    quantity: number;
    location?: Partial<LocationData>;
    clusterId?: string; // Add clusterId to the form data
}

const EditPanel: React.FC = () => {
    const {id} = useParams<{ id: string }>(); // Extract the ID from the route
    const {t} = useTranslation();
    const [isSubmitting, setIsSubmitting] = useState<boolean>(false); // Track if the form is being submitted

    const isEditMode = Boolean(id); // Determine if we're in edit mode based on presence of id
    const [formData, setFormData] = useState<PanelFormData>({
        name: '',
        powerRating: 1000,
        temperatureCoefficient: 0,
        efficiency: 100,
        quantity: 1,
        location: {...DEFAULT_LOCATION},
    });
    const [clusters, setClusters] = useState<Cluster[]>([]); // State to store clusters
    const [responseMessage, setResponseMessage] = useState<string | null>(null);

    // Fetch clusters and existing panel data if in edit mode
    useEffect(() => {
        const fetchClusters = async () => {
            try {
                const clusterData = await requireOk<Cluster[]>(
                    apiRequest(`${backend_url}/api/cluster/user`, {auth: true}),
                );
                setClusters(clusterData);
            } catch (error) {
                console.error(error);
                setResponseMessage('An error occurred while fetching clusters.');
            }
        };

        const fetchPanelData = async () => {
            if (!isEditMode) {
                return;
            }

            try {
                const panelData = await requireOk<{ cluster?: { id: string } } & PanelFormData>(
                    apiRequest(`${backend_url}/api/panel/${id}`, {auth: true}),
                );
                const {cluster, ...panelDetails} = panelData;
                setFormData({
                    ...panelDetails,
                    clusterId: cluster?.id || '', // Pre-select the cluster if it exists
                    location: panelData.location ? {...panelData.location} : {...DEFAULT_LOCATION},
                });
            } catch (error) {
                console.error(error);
                setResponseMessage('An error occurred while fetching panel data.');
            }
        };

        fetchClusters();
        fetchPanelData();
    }, [id, isEditMode]);
    const isClusterSelected = Boolean(formData.clusterId);

    // Update form state on input change for non-location data
    const handleInputChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
    ) => {
        const {name, value} = e.target;
        setFormData((prevState) => ({
            ...prevState,
            [name]: name === 'powerRating'
                ? Math.min(Math.max(parseInt(value, 10), 100), 10000) // Ensure value is between 100 and 10000
                : name === 'efficiency'
                    ? Math.min(Math.max(parseInt(value, 10), 20), 100) // Ensure value is between 20 and 100
                    : name === 'quantity'
                        ? Math.min(Math.max(parseInt(value, 10), 1), 20) // Ensure value is between 1 and 20
                        : value
        }));
    };


    // Handle cluster selection
    const handleClusterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const {value} = e.target;

        // Find the selected cluster
        const selectedCluster = clusters.find((cluster) => cluster.id === value);
        const fallbackLocation: LocationData = selectedCluster
            ? selectedCluster.location
            : {...DEFAULT_LOCATION, lat: 0, lon: 0};

        setFormData((prevState) => ({
            ...updateLocationState(prevState, fallbackLocation),
            clusterId: value,
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
            setResponseMessage('You must be logged in to add or edit a panel.');
            return;
        }
        if (formData.powerRating < 1 || formData.efficiency < 1 || !formData.location?.lat || !formData.location?.lon) {
            setResponseMessage('Power rating, efficiency, latitude, and longitude must be valid and greater than 1.');
            return;
        }
        try {
            const {response, data} = await apiRequest(
                isEditMode ? `${backend_url}/api/panel/${id}` : `${backend_url}/api/panel/add`,
                {
                    method: isEditMode ? 'PUT' : 'POST', // PUT if editing, POST if adding
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify(formData),
                    auth: true,
                },
            );

            if (response.ok) {
                setResponseMessage(isEditMode ? 'Panel updated successfully!' : 'Panel added successfully!');
                setIsSubmitting(true); // Disable the button

            } else {
                setResponseMessage(`Error: ${data || 'Unknown error'}`);
            }
        } catch (error) {
            setResponseMessage('An error occurred while submitting the panel.');
            console.error('Error:', error);
        }
    };

    return (
        <>
            <div className="panel-container">
                <div className="panel-card">
                    <h2>{isEditMode ? t('addPanel.titleEdit') : t('addPanel.titleAdd')}</h2>
                    <form onSubmit={handleSubmit}>
                        <div className="panel-info">
                            <div className="info-item">
                                <label>{t('addPanel.form.panelName')}:</label>
                                <input
                                    type="text"
                                    name="name"
                                    value={formData.name}
                                    onChange={handleInputChange}
                                    required
                                    placeholder={t('addPanel.form.panelNamePlaceholder')}
                                />
                            </div>
                            <div className="info-item">
                                <label>{t('addPanel.form.powerRating')}:</label>
                                <input
                                    type="number"
                                    name="powerRating"
                                    value={formData.powerRating}
                                    onChange={handleInputChange}
                                    required
                                    placeholder={t('addPanel.form.powerRatingPlaceholder')}
                                />
                            </div>
                            {/*<div className="info-item">*/}
                            {/*    <label>{t('addPanel.form.temperatureCoefficient')}:</label>*/}
                            {/*    <input*/}
                            {/*        type="number"*/}
                            {/*        name="temperatureCoefficient"*/}
                            {/*        value={formData.temperatureCoefficient}*/}
                            {/*        onChange={handleInputChange}*/}
                            {/*        required*/}
                            {/*        placeholder={t('addPanel.form.temperatureCoefficientPlaceholder')}*/}
                            {/*    />*/}
                            {/*</div>*/}
                            <div className="info-item">
                                <label>{t('addPanel.form.efficiency')}:</label>
                                <input
                                    type="number"
                                    name="efficiency"
                                    value={formData.efficiency}
                                    onChange={handleInputChange}
                                    required
                                    placeholder={t('addPanel.form.efficiencyPlaceholder')}
                                />
                            </div>
                            <div className="info-item">
                                <label>{t('addPanel.form.quantity')}:</label>
                                <input
                                    type="number"
                                    name="quantity"
                                    value={formData.quantity}
                                    onChange={handleInputChange}
                                    required
                                    placeholder={t('addPanel.form.quantityPlaceholder')}
                                />
                            </div>
                            <div className="info-item">
                                <label>{t('addPanel.form.cluster')}:</label>

                                <select
                                    name="clusterId"
                                    value={formData.clusterId || ''}
                                    onChange={handleClusterChange}
                                >
                                    <option value=""
                                            disabled={!isEditMode}>{t('addPanel.form.clusterPlaceholder')}</option>
                                    {/* Option to select None */}
                                    {clusters.map((cluster) => (
                                        <option key={cluster.id} value={cluster.id}>
                                            {cluster.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                        </div>
                        <p>{t('addPanel.form.clusterInfo')}</p>

                        {/* Manual Address Input */}
                        <div className="location-manual-input">
                            <div className="info-item">
                                <label>{t('addPanel.form.country')}:</label>
                                <input
                                    type="text"
                                    name="country"
                                    value={formData.location?.country || ''}
                                    onChange={handleAddressManualChange}
                                    placeholder={t('addPanel.form.countryPlaceholder')}
                                    disabled={isClusterSelected} // Disable if cluster is selected
                                />
                            </div>
                            <div className="info-item">
                                <label>{t('addPanel.form.city')}:</label>
                                <input
                                    type="text"
                                    name="city"
                                    value={formData.location?.city || ''}
                                    onChange={handleAddressManualChange}
                                    placeholder={t('addPanel.form.cityPlaceholder')}
                                    disabled={isClusterSelected}
                                />
                            </div>
                            <div className="info-item">
                                <label>{t('addPanel.form.district')}:</label>
                                <input
                                    type="text"
                                    name="district"
                                    value={formData.location?.district || ''}
                                    onChange={handleAddressManualChange}
                                    placeholder={t('addPanel.form.districtPlaceholder')}
                                    disabled={isClusterSelected}
                                />
                            </div>

                        </div>

                        {/* Submit Button */}
                        <button
                            type="submit"
                            className="primary-button btn-submit"
                            disabled={isSubmitting} // Disable button if isSubmitting is true
                        >
                            {isEditMode ? t('addPanel.form.submitButtonEdit') : t('addPanel.form.submitButtonAdd')}
                        </button>
                    </form>
                    {responseMessage && <div className="response-message">{responseMessage}</div>}
                </div>
                <div className="panel-map-container">
                    <h2 className="location_header">{t('addPanel.mapSection.header')}</h2>
                    <MapComponent
                        disabled={isClusterSelected}
                        onLocationChange={handleLocationChange}
                        address={{
                            country: formData.location?.country || t('addPanel.mapSection.defaultCountry'),
                            city: formData.location?.city || t('addPanel.mapSection.defaultCity'),
                            district: formData.location?.district || t('addPanel.mapSection.defaultDistrict'),
                        }}
                        onAddressChange={handleAddressChange}
                        lat={formData.location?.lat || DEFAULT_LOCATION.lat}
                        lon={formData.location?.lon || DEFAULT_LOCATION.lon}
                    />
                </div>
            </div>

        </>
    )
        ;
};

export default EditPanel;
