import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './EditProfile.css'; // Спільний CSS для профілю
import MapComponent from '../components/MapComponent'; // Імпорт компонента з мапою

interface Address {
    country: string;
    city: string;
    district: string;
    lat?: number;
    lon?: number;
}

interface User {
    username: string;
    email: string;
    location: Address;
}

const EditProfile: React.FC = () => {
    const navigate = useNavigate();
    const [user, setUser] = useState<User | null>(null); // Стейт для зберігання даних користувача
    const [loading, setLoading] = useState<boolean>(true); // Стейт для статусу завантаження
    const [error, setError] = useState<string | null>(null); // Стейт для зберігання помилок

    // Функція для завантаження профілю
    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const token = localStorage.getItem('token'); // Get token from local storage
                const response = await fetch('http://backend:8080/api/user/profile', {
                    headers: {
                        'Authorization': `Bearer ${token}` // Include the JWT token in the request
                    }
                });

                if (!response.ok) {
                    throw new Error('Failed to fetch profile');
                }

                const data = await response.json();
                console.log(data)
                setUser(data); // Now data contains both user info and address
            } catch (err) {
                setError('Error fetching profile data');
            } finally {
                setLoading(false);
            }
        };

        fetchProfile();
    }, []);


    const handleLocationChange = (lat: number, lon: number) => {
        setUser((prevState) => {
            if (!prevState) return null;
            return {
                ...prevState,
                location: {
                    ...prevState.location,
                    lat,
                    lon,
                },
            };
        });
    };

    const handleAddressChange = (address: Address) => {
        setUser((prevState) => {
            if (!prevState) return null;
            return {
                ...prevState,
                location: {
                    ...prevState.location,
                    ...address,
                },
            };
        });
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const token = localStorage.getItem('token');

        fetch('http://backend:8080/api/user/update', {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(user), // Відправка нових даних користувача
        }).then((response) => {
            if (response.ok) {
                console.log('Profile updated:', user);
                navigate('/profile'); // Перехід на сторінку профілю після успішного оновлення
            } else {
                console.error('Error updating profile');
            }
        });
    };

    if (loading) {
        return <div>Loading...</div>; // Показуємо повідомлення про завантаження
    }

    if (error) {
        return <div>{error}</div>; // Показуємо повідомлення про помилку
    }

    return (
        <div className="profile-container">
            <div className="profile-card">
                <h2>Edit Profile</h2>
                <form onSubmit={handleSubmit}>
                    <div className="profile-info">
                        <div className="info-item">
                            <label>Name:</label>
                            <input
                                type="text"
                                name="username"
                                value={user?.username || ''}
                                onChange={(e) => setUser({...user!, username: e.target.value})}
                                placeholder="Enter your name"
                            />
                        </div>
                        <div className="info-item">
                            <label>Email:</label>
                            <input
                                type="email"
                                name="email"
                                value={user?.email || ''}
                                onChange={(e) => setUser({...user!, email: e.target.value})}
                                placeholder="Enter your email"
                            />
                        </div>
                        <div className="info-item">
                            <label>Country:</label>
                            <input
                                type="text"
                                name="country"
                                value={user?.location?.country || ''}
                                onChange={(e) => handleAddressChange({...user!.location, country: e.target.value})}
                                placeholder="Enter your country"
                            />
                        </div>
                        <div className="info-item">
                            <label>City or town:</label>
                            <input
                                type="text"
                                name="city"
                                value={user?.location?.city || ''}
                                onChange={(e) => handleAddressChange({...user!.location, city: e.target.value})}
                                placeholder="Enter your city"
                            />
                        </div>
                        <div className="info-item">
                            <label>District:</label>
                            <input
                                type="text"
                                name="district"
                                value={user?.location?.district || ''}
                                onChange={(e) => handleAddressChange({...user!.location, district: e.target.value})}
                                placeholder="Enter your district"
                            />
                        </div>
                    </div>
                    <button type="submit" className="edit-button">Save Changes</button>
                    <button
                        type="button"
                        className="discard-button"
                        onClick={() => navigate('/profile')} // Navigate to profile
                    >
                        Discard Changes
                    </button>
                </form>
            </div>

            <MapComponent
                onLocationChange={handleLocationChange}
                address={user?.location || {
                    country: "Lithuania",
                    city: "Vilnius",
                    district: "Vilnius County",
                    }}
                    onAddressChange={handleAddressChange}
                    lat={user?.location?.lat || 54.6872} // Use latitude from user data or default
                    lon={user?.location?.lon || 25.2797} // Use longitude from user data or default
                />
        </div>
    );
};

export default EditProfile;
