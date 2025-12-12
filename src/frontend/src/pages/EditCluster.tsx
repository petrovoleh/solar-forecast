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
    inverterId?: string | null;
}

interface Inverter {
    id: string;
    name: string;
}

interface Panel {
    id: string;
    name: string;
    powerRating: number;
    efficiency: number;
    quantity: number;
    location?: Partial<LocationData>;
    cluster?: {
        id: string;
        name: string;
    };
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
        inverterId: null,
    });
    const [isGroupCluster, setIsGroupCluster] = useState<boolean>(false);
    const [responseMessage, setResponseMessage] = useState<string | null>(null);
    const [panels, setPanels] = useState<Panel[]>([]);
    const [panelsLoading, setPanelsLoading] = useState<boolean>(isEditMode);
    const [selectedPanelIds, setSelectedPanelIds] = useState<string[]>([]);
    const [initialPanelIds, setInitialPanelIds] = useState<string[]>([]);
    const [panelSelectionReady, setPanelSelectionReady] = useState<boolean>(!isEditMode);
    const [isSyncingPanels, setIsSyncingPanels] = useState<boolean>(false);

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

    useEffect(() => {
        const fetchPanels = async () => {
            setPanelsLoading(true);
            try {
                const {response, data} = await apiRequest<Panel[]>(
                    `${backend_url}/api/panel/user`,
                    {auth: true},
                );

                if (response.ok && Array.isArray(data)) {
                    setPanels(data);
                } else {
                    setPanels([]);
                }
            } catch (error) {
                console.error('Error fetching panels:', error);
                setPanels([]);
            } finally {
                setPanelsLoading(false);
            }
        };

        const hasToken = Boolean(localStorage.getItem('token'));

        if (isEditMode && hasToken) {
            fetchPanels();
        } else if (!isEditMode || !hasToken) {
            setPanelsLoading(false);
        }
    }, [isEditMode]);

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
                    name: clusterData.name,
                    description: clusterData.description,
                    inverterId: clusterData.inverter?.id ?? null,
                    location: clusterData.location ? {...clusterData.location} : undefined,
                });
                setIsGroupCluster(!clusterData.location);
            } catch (error) {
                console.error('Error fetching cluster data:', error);
                setResponseMessage('An error occurred while fetching cluster data.');
            }
        };

        fetchClusterData();
    }, [id, isEditMode]);

    useEffect(() => {
        if (!isEditMode || !id || panelSelectionReady || panelsLoading) {
            return;
        }

        const assignedPanelIds = panels
            .filter((panel) => panel.cluster?.id === id)
            .map((panel) => panel.id);

        setSelectedPanelIds(assignedPanelIds);
        setInitialPanelIds(assignedPanelIds);
        setPanelSelectionReady(true);
    }, [isEditMode, id, panels, panelSelectionReady, panelsLoading]);

    // Update form state on input change for non-location data
    const handleInputChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
    ) => {
        const {name, value} = e.target;
        if (name === 'inverterId') {
            setFormData((prevState) => ({
                ...prevState,
                inverterId: value ? value : null,
            }));
            return;
        }

        setFormData((prevState) => ({
            ...prevState,
            [name]: value,
        }));
    };

    // Function to handle map location changes (lat, lon)
    const handleLocationChange = (lat: number, lon: number) => {
        if (isGroupCluster) {
            return;
        }
        setFormData((prevState) => updateLocationState(prevState, {lat, lon}));
    };

    // Function to handle address changes from map component
    const handleAddressChange = (address: LocationDetails) => {
        if (isGroupCluster) {
            return;
        }
        setFormData((prevState) => updateLocationState(prevState, address));
    };

    // Function to update the map when manual address is entered
    const handleAddressManualChange = (
        e: React.ChangeEvent<HTMLInputElement>
    ) => {
        const {name, value} = e.target;
        if (isGroupCluster) {
            return;
        }
        setFormData((prevState) => updateLocationState(prevState, {[name]: value} as Partial<LocationData>));
    };

    const togglePanelSelection = (panelId: string) => {
        setSelectedPanelIds((prevSelected) => (
            prevSelected.includes(panelId)
                ? prevSelected.filter((id) => id !== panelId)
                : [...prevSelected, panelId]
        ));
    };

    const updatePanelCluster = async (panel: Panel, clusterIdValue: string | null) => {
        const payload: {
            name: string;
            powerRating: number;
            efficiency: number;
            quantity: number;
            clusterId: string;
            location?: LocationData;
        } = {
            name: panel.name,
            powerRating: panel.powerRating,
            efficiency: panel.efficiency,
            quantity: panel.quantity,
            clusterId: clusterIdValue ?? '',
        };

        if (
            panel.location &&
            typeof panel.location.lat === 'number' &&
            typeof panel.location.lon === 'number' &&
            typeof panel.location.city === 'string' &&
            typeof panel.location.district === 'string' &&
            typeof panel.location.country === 'string'
        ) {
            payload.location = {
                lat: panel.location.lat,
                lon: panel.location.lon,
                city: panel.location.city,
                district: panel.location.district,
                country: panel.location.country,
            };
        }

        const {response, data} = await apiRequest(
            `${backend_url}/api/panel/${panel.id}`,
            {
                method: 'PUT',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify(payload),
                auth: true,
            },
        );

        if (!response.ok) {
            const errorMessage = typeof data === 'string' && data
                ? data
                : 'Failed to update panel cluster';
            throw new Error(errorMessage);
        }
    };

    const syncPanelAssignments = async (): Promise<{added: number; removed: number}> => {
        if (!isEditMode || !id) {
            return {added: 0, removed: 0};
        }

        const selectedSet = new Set(selectedPanelIds);
        const initialSet = new Set(initialPanelIds);

        const toAssign = panels.filter((panel) => selectedSet.has(panel.id) && !initialSet.has(panel.id));
        const toRemove = panels.filter((panel) => initialSet.has(panel.id) && !selectedSet.has(panel.id));

        if (toAssign.length === 0 && toRemove.length === 0) {
            return {added: 0, removed: 0};
        }

        setIsSyncingPanels(true);

        try {
            await Promise.all([
                ...toAssign.map((panel) => updatePanelCluster(panel, id)),
                ...toRemove.map((panel) => updatePanelCluster(panel, null)),
            ]);

            const assignIds = new Set(toAssign.map((panel) => panel.id));
            const removeIds = new Set(toRemove.map((panel) => panel.id));

            setInitialPanelIds([...selectedPanelIds]);
            setPanels((prevPanels) => prevPanels.map((panel) => {
                if (assignIds.has(panel.id)) {
                    return {
                        ...panel,
                        cluster: {
                            id,
                            name: formData.name,
                        },
                    };
                }

                if (removeIds.has(panel.id)) {
                    return {
                        ...panel,
                        cluster: undefined,
                    };
                }

                return panel;
            }));

            return {added: toAssign.length, removed: toRemove.length};
        } finally {
            setIsSyncingPanels(false);
        }
    };

    const handleGroupToggle = (event: React.ChangeEvent<HTMLInputElement>) => {
        const enabled = event.target.checked;
        setIsGroupCluster(enabled);
        setFormData((prevState) => ({
            ...prevState,
            location: enabled ? undefined : {...DEFAULT_LOCATION, ...prevState.location},
        }));
    };

    // Submit form for add or edit
    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        if (!localStorage.getItem('token')) {
            setResponseMessage('You must be logged in to add or edit a cluster.');
            return;
        }

        try {
            const sanitizedInverterId = typeof formData.inverterId === 'string' && formData.inverterId.trim() !== ''
                ? formData.inverterId.trim()
                : null;

            const payload: ClusterFormData & { group: boolean } = {
                ...formData,
                inverterId: sanitizedInverterId,
                location: isGroupCluster ? undefined : formData.location,
                group: isGroupCluster,
            };

            const {response, data} = await apiRequest(
                isEditMode ? `${backend_url}/api/cluster/${id}` : `${backend_url}/api/cluster/add`,
                {
                    method: isEditMode ? 'PUT' : 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify(payload),
                    auth: true,
                },
            );

            if (response.ok) {
                let message = isEditMode
                    ? t('editCluster.responseMessages.updateSuccess')
                    : t('editCluster.responseMessages.createSuccess');

                if (isEditMode && panelSelectionReady) {
                    try {
                        const panelResult = await syncPanelAssignments();
                        if (panelResult.added > 0 || panelResult.removed > 0) {
                            message = `${message} ${t('editCluster.responseMessages.panelSyncSuccess', panelResult)}`;
                        }
                    } catch (panelError) {
                        console.error('Error updating panel assignments:', panelError);
                        message = `${message} ${t('editCluster.responseMessages.panelSyncFailure')}`;
                    }
                }

                setResponseMessage(message);
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
            <div className="panel-card" style={{ gridTemplateColumns: "1fr 1fr 2fr",    minWidth: "60vw"}}>
                <div>
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
                                value={formData.inverterId ?? ''}
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
                        <div className="info-item checkbox-item">
                            <label>
                                <input
                                    type="checkbox"
                                    checked={isGroupCluster}
                                    onChange={handleGroupToggle}
                                    style={{ width: '10%' }}
                                />
                                {t('editCluster.form.groupLabel')}
                            </label>
                            <p className="helper-text">{t('editCluster.form.groupDescription')}</p>
                        </div>
                    </div>

                    {!isGroupCluster && <p>{t('editCluster.form.locationInfo')}</p>}

                    {/* Manual Address Input */}
                    <div className="location-manual-input">
                        <div className="info-item">
                            <label>{t('editCluster.form.country')}:</label>
                            <input
                                type="text"
                                name="country"
                                value={formData.location?.country || ''}
                                onChange={handleAddressManualChange}
                                disabled={isGroupCluster}
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
                                disabled={isGroupCluster}
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
                                disabled={isGroupCluster}
                                placeholder={t('editCluster.form.districtPlaceholder')}
                            />
                        </div>
                    </div>



                    <button type="submit" className="primary-button btn-submit">
                        {isEditMode ? t('editCluster.form.submitButtonEdit') : t('editCluster.form.submitButtonAdd')}
                    </button>
                </form>
                {responseMessage && <div className="response-message">{responseMessage}</div>}
                </div>
                {isEditMode && (
                    <div className="panel-assignment-section">
                        <h2>{t('editCluster.panelsSection.title')}</h2>
                        <p className="panel-assignment-description">
                            {t('editCluster.panelsSection.description')}
                        </p>
                        {panelsLoading ? (
                            <p className="panel-assignment-status">{t('editCluster.panelsSection.loading')}</p>
                        ) : panels.length === 0 ? (
                            <p className="panel-assignment-status">{t('editCluster.panelsSection.noPanels')}</p>
                        ) : (
                            <ul className="panel-selection-list">
                                {panels.map((panel) => {
                                    const isAssignedToCurrent = selectedPanelIds.includes(panel.id);
                                    const isAssignedElsewhere = panel.cluster && panel.cluster.id !== id;

                                    return (
                                        <li key={panel.id} className="panel-selection-item">
                                            <label className="panel-checkbox-label">
                                                <input
                                                    type="checkbox"
                                                    checked={isAssignedToCurrent}
                                                    onChange={() => togglePanelSelection(panel.id)}
                                                    disabled={!panelSelectionReady || isSyncingPanels}
                                                />
                                                <span className="panel-name">{panel.name}</span>
                                            </label>
                                            {isAssignedElsewhere && (
                                                <span className="panel-assigned-note">
                                                        {t('editCluster.panelsSection.assignedToOther', {name: panel.cluster?.name})}
                                                    </span>
                                            )}
                                        </li>
                                    );
                                })}
                            </ul>
                        )}
                        {!panelsLoading && panels.some((panel) => panel.cluster && panel.cluster.id !== id) && (
                            <p className="panel-assignment-hint">{t('editCluster.panelsSection.moveHint')}</p>
                        )}
                    </div>
                )}
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
                        disabled={isGroupCluster}
                    />
                </div>
            </div>

        </div>
    );
};

export default EditCluster;
