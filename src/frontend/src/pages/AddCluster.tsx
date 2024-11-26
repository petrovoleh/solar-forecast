import React, {useEffect, useState} from 'react';
import {useParams} from 'react-router-dom';
import MapComponent from '../components/MapComponent';
import {backend_url} from "../config";

interface LocationRequest {
    lat: number;
    lon: number;
    city: string;
    district: string;
    country: string;
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
                <h2>{isEditMode ? 'Edit Cluster' : 'Add a Cluster'}</h2>
                <form onSubmit={handleSubmit}>
                    <div className="cluster-info">
                        <div className="info-item">
                            <label>Cluster Name:</label>
                            <input
                                type="text"
                                name="name"
                                value={formData.name}
                                onChange={handleInputChange}
                                required
                                placeholder="Enter cluster name"
                            />
                        </div>
                        <div className="info-item">
                            <label>Description:</label>
                            <textarea
                                name="description"
                                value={formData.description}
                                onChange={handleInputChange}
                                required
                                placeholder="Enter description"
                            />
                        </div>
                    </div>

                    {/* Inverter Selection Dropdown */}
                    <div className="info-item">
                        <label>Inverter:</label>
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
                            <option value="">Select an Inverter</option>
                            {inverters.map((inverter) => (
                                <option key={inverter.id} value={inverter.id}>
                                    {inverter.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Manual Address Input */}
                    <div className="location-manual-input">
                        <div className="info-item">
                            <label>Country:</label>
                            <input
                                type="text"
                                required
                                name="country"
                                value={formData.location?.country || ''}
                                onChange={handleAddressManualChange}
                                placeholder="Enter country"
                            />
                        </div>
                        <div className="info-item">
                            <label>City:</label>
                            <input
                                type="text"
                                required
                                name="city"
                                value={formData.location?.city || ''}
                                onChange={handleAddressManualChange}
                                placeholder="Enter city"
                            />
                        </div>
                        <div className="info-item">
                            <label>District:</label>
                            <input
                                type="text"
                                required
                                name="district"
                                value={formData.location?.district || ''}
                                onChange={handleAddressManualChange}
                                placeholder="Enter district"
                            />
                        </div>
                    </div>

                    <button type="submit"
                            className="cluster-button">{isEditMode ? 'Update Cluster' : 'Add Cluster'}</button>
                    {responseMessage && <p>{responseMessage}</p>}
                </form>
            </div>

            {/* Right side: Map */}
            <div className="cluster-map-container">
                <h2 className="location_header">Select location on the map</h2>
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
