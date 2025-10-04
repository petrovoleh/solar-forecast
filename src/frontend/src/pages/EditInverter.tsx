import React, {useEffect, useState} from 'react';
import {useParams} from 'react-router-dom';
import {backend_url} from "../config";

interface InverterFormData {
    name: string;
    manufacturer: string;
    capacity: number;
    efficiency: number;
}

const EditInverter: React.FC = () => {
    const {id} = useParams<{ id: string }>();
    const isEditMode = Boolean(id);
    const [formData, setFormData] = useState<InverterFormData>({
        name: '',
        manufacturer: '',
        capacity: 0,
        efficiency: 0,
    });

    const [responseMessage, setResponseMessage] = useState<string | null>(null);

    useEffect(() => {
        if (isEditMode) {
            const fetchInverterData = async () => {
                try {
                    const token = localStorage.getItem('token');
                    const response = await fetch(`${backend_url}/api/inverter/${id}`, {
                        headers: {
                            'Authorization': `Bearer ${token}`,
                        },
                    });
                    if (response.ok) {
                        const inverterData = await response.json();
                        setFormData(inverterData);
                    } else {
                        setResponseMessage('Failed to fetch inverter data.');
                    }
                } catch (error) {
                    setResponseMessage('An error occurred while fetching inverter data.');
                }
            };
            fetchInverterData();
        }
    }, [id, isEditMode]);

    const handleInputChange = (
        e: React.ChangeEvent<HTMLInputElement>
    ) => {
        const {name, value} = e.target;
        setFormData((prevState) => ({
            ...prevState,
            [name]: name === 'capacity' || name === 'efficiency' ? parseFloat(value) : value
        }));
    };

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        const token = localStorage.getItem('token');
        if (!token) {
            setResponseMessage('You must be logged in to add or edit an inverter.');
            return;
        }

        try {
            const response = await fetch(isEditMode ? `${backend_url}/api/inverter/${id}` : `${backend_url}/api/inverter/add`, {
                method: isEditMode ? 'PUT' : 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify(formData),
            });

            if (response.ok) {
                setResponseMessage(isEditMode ? 'Inverter updated successfully!' : 'Inverter added successfully!');
            } else {
                const errorMessage = await response.text();
                setResponseMessage(`Error: ${errorMessage}`);
            }
        } catch (error) {
            setResponseMessage('An error occurred while submitting the inverter.');
        }
    };

    return (
        <div className="inverter-container">
            <div className="inverter-card">
                <h2>{isEditMode ? 'Edit Inverter' : 'Add an Inverter'}</h2>
                <form onSubmit={handleSubmit}>
                    <div className="inverter-info">
                        <div className="info-item">
                            <label>name:</label>
                            <input
                                type="text"
                                name="name"
                                value={formData.name}
                                onChange={handleInputChange}
                                required
                                placeholder="Enter name"
                            />
                        </div>
                        <div className="info-item">
                            <label>Manufacturer:</label>
                            <input
                                type="text"
                                name="manufacturer"
                                value={formData.manufacturer}
                                onChange={handleInputChange}
                                required
                                placeholder="Enter manufacturer"
                            />
                        </div>
                        <div className="info-item">
                            <label>Capacity (kW):</label>
                            <input
                                type="number"
                                name="capacity"
                                value={formData.capacity}
                                onChange={handleInputChange}
                                required
                                placeholder="Enter capacity"
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
                    </div>
                    <button type="submit"
                            className="primary-button inverter-button">{isEditMode ? 'Update Inverter' : 'Add Inverter'}</button>
                    {responseMessage && <p>{responseMessage}</p>}
                </form>
            </div>
        </div>
    );
};

export default EditInverter;
