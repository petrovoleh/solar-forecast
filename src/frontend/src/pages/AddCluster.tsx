import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom'; // Import for reading route parameters
import './AddCluster.css';
import MapComponent from '../components/MapComponent'; // Import MapComponent

// Define the type for location request
interface LocationRequest {
    lat: number;
    lon: number;
    city: string;
    district: string;
    country: string;
}

// Define the type for the cluster form data
interface ClusterFormData {
    name: string;
    description: string;
    location?: LocationRequest;
}

const AddCluster: React.FC = () => {
    const { id } = useParams<{ id: string }>(); // Extract the ID from the route
    const isEditMode = Boolean(id); // Determine if we're in edit mode based on the presence of id
    const [formData, setFormData] = useState<ClusterFormData>({
        name: '',
        description: '',
        location: {
            lat: 54.6872, // Default latitude (Vilnius)
            lon: 25.2797, // Default longitude (Vilnius)
            city: '',
            district: '',
            country: ''
        }
    });

    const [responseMessage, setResponseMessage] = useState<string | null>(null);

    // Fetch existing cluster data if in edit mode
    useEffect(() => {
        if (isEditMode) {
            const fetchClusterData = async () => {
                try {
                    const token = localStorage.getItem('token');
                    const response = await fetch(`http://localhost:8080/api/cluster/${id}`, {
                        headers: {
                            'Authorization': `Bearer ${token}`,
                        },
                    });
                    if (response.ok) {
                        const clusterData = await response.json();
                        setFormData(clusterData); // Populate form with existing cluster data
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
        const { name, value } = e.target;
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
        const { name, value } = e.target;
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
            const response = await fetch(isEditMode ? `http://localhost:8080/api/cluster/${id}` : 'http://localhost:8080/api/cluster/add', {
                method: isEditMode ? 'PUT' : 'POST', // PUT if editing, POST if adding
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify(formData),
            });

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
            <div className="cluster-card">
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
                    {/* Manual Address Input */}
                    <div className="location-manual-input">
                        <div className="info-item">
                            <label>Country:</label>
                            <input
                                type="text"
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
                                name="district"
                                value={formData.location?.district || ''}
                                onChange={handleAddressManualChange}
                                placeholder="Enter district"
                            />
                        </div>
                    </div>

                    <button type="submit" className="cluster-button">{isEditMode ? 'Update Cluster' : 'Add Cluster'}</button>
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
