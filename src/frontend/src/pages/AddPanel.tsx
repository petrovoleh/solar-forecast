import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom'; // Import for reading route parameters
import './AddPanel.css';
import MapComponent from '../components/MapComponent'; // Import MapComponent

// Define the type for location request
interface LocationRequest {
    lat: number;
    lon: number;
    city: string;
    district: string;
    country: string;
}

// Define the type for the panel form data
interface PanelFormData {
    name: string;
    powerRating: number;
    temperatureCoefficient: number;
    efficiency: number;
    quantity: number;
    location?: LocationRequest;
}

const AddPanel: React.FC = () => {
    const { id } = useParams<{ id: string }>(); // Extract the ID from the route
    const isEditMode = Boolean(id); // Determine if we're in edit mode based on presence of id
    const [formData, setFormData] = useState<PanelFormData>({
        name: '',
        powerRating: 0,
        temperatureCoefficient: 0,
        efficiency: 0,
        quantity: 1,
        location: {
            lat: 54.6872, // Default latitude (Vilnius)
            lon: 25.2797, // Default longitude (Vilnius)
            city: '',
            district: '',
            country: ''
        }
    });

    const [responseMessage, setResponseMessage] = useState<string | null>(null);

    // Fetch existing panel data if in edit mode
    useEffect(() => {
        if (isEditMode) {
            const fetchPanelData = async () => {
                try {
                    const token = localStorage.getItem('token');
                    const response = await fetch(`http://localhost:8080/api/panel/${id}`, {
                        headers: {
                            'Authorization': `Bearer ${token}`,
                        },
                    });
                    if (response.ok) {
                        const panelData = await response.json();
                        setFormData(panelData); // Populate form with existing panel data
                    } else {
                        setResponseMessage('Failed to fetch panel data.');
                    }
                } catch (error) {
                    setResponseMessage('An error occurred while fetching panel data.');
                }
            };
            fetchPanelData();
        }
    }, [id, isEditMode]);

    // Update form state on input change for non-location data
    const handleInputChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
    ) => {
        const { name, value } = e.target;
        setFormData((prevState) => ({
            ...prevState,
            [name]: name === 'powerRating' || name === 'temperatureCoefficient' || name === 'efficiency' || name === 'quantity' ? parseInt(value) : value
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
            setResponseMessage('You must be logged in to add or edit a panel.');
            return;
        }

        try {
            const response = await fetch(isEditMode ? `http://localhost:8080/api/panel/${id}` : 'http://localhost:8080/api/panel/add', {
                method: isEditMode ? 'PUT' : 'POST', // PUT if editing, POST if adding
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify(formData),
            });

            if (response.ok) {
                setResponseMessage(isEditMode ? 'Panel updated successfully!' : 'Panel added successfully!');
            } else {
                const errorMessage = await response.text();
                setResponseMessage(`Error: ${errorMessage}`);
            }
        } catch (error) {
            setResponseMessage('An error occurred while submitting the panel.');
            console.error('Error:', error);
        }
    };

    return (
        <div className="panel-container">
            <div className="panel-card">
                <h2>{isEditMode ? 'Edit Solar Panel' : 'Add a Solar Panel'}</h2>
                <form onSubmit={handleSubmit}>
                    <div className="panel-info">
                        <div className="info-item">
                            <label>Panel Name:</label>
                            <input
                                type="text"
                                name="name"
                                value={formData.name}
                                onChange={handleInputChange}
                                required
                                placeholder="Enter panel name"
                            />
                        </div>
                        <div className="info-item">
                            <label>Power Rating (W):</label>
                            <input
                                type="number"
                                name="powerRating"
                                value={formData.powerRating}
                                onChange={handleInputChange}
                                required
                                placeholder="Enter power rating"
                            />
                        </div>
                        <div className="info-item">
                            <label>Temperature Coefficient (%/°C):</label>
                            <input
                                type="number"
                                name="temperatureCoefficient"
                                value={formData.temperatureCoefficient}
                                onChange={handleInputChange}
                                required
                                placeholder="Enter temperature coefficient"
                            />
                        </div>
                        <div className="info-item">
                            <label>Efficiency (%):</label>
                            <input
                                type="number"
                                name="efficiency"
                                value={formData.efficiency}
                                onChange={handleInputChange}
                                required
                                placeholder="Enter efficiency"
                            />
                        </div>
                        <div className="info-item">
                            <label>Quantity:</label>
                            <input
                                type="number"
                                name="quantity"
                                value={formData.quantity}
                                onChange={handleInputChange}
                                required
                                placeholder="Enter quantity"
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

                    <button type="submit" className="panel-button">{isEditMode ? 'Update Panel' : 'Add Panel'}</button>
                    {responseMessage && <p>{responseMessage}</p>}
                </form>
            </div>

            {/* Right side: Map */}
            <div className="panel-map-container">
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

export default AddPanel;
