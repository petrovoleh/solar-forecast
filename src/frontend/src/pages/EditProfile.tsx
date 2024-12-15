import React, {useEffect, useState} from 'react';
import {useNavigate} from 'react-router-dom';
import MapComponent from '../components/MapComponent';
import {backend_url} from "../config"; // Імпорт компонента з мапою
import {useTranslation} from 'react-i18next'; // Import useTranslation hook

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
    const {t} = useTranslation(); // Initialize translation

    const [user, setUser] = useState<User | null>(null); // Стейт для зберігання даних користувача
    const [loading, setLoading] = useState<boolean>(true); // Стейт для статусу завантаження
    const [error, setError] = useState<string | null>(null); // Стейт для зберігання помилок

    // Функція для завантаження профілю
    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const token = localStorage.getItem('token'); // Get token from local storage
                const response = await fetch(`${backend_url}/api/user/profile`, {
                    headers: {
                        'Authorization': `Bearer ${token}` // Include the JWT token in the request
                    }
                });

                if (!response.ok) {
                    throw new Error('Failed to fetch profile');
                }

                const data = await response.json();
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

        fetch(`${backend_url}/api/user/update`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(user), // Відправка нових даних користувача
        }).then((response) => {
            if (response.ok) {
                navigate('/profile'); // Перехід на сторінку профілю після успішного оновлення
            } else {
                console.error('Error updating profile');
            }
        });
    };

    if (loading) {
        return  (
            <div className="profile-container">
                <div className="loader"></div>
            </div>
        )
    }

    if (error) {
        return <div>{error}</div>; // Показуємо повідомлення про помилку
    }

    return (
        <div className="profile-container">
            <div className="profile-card">
                <h2>{t('editProfile.title')}</h2> {/* Translation for title */}
                <form onSubmit={handleSubmit}>
                    <div className="profile-info">
                        <div className="info-item">
                            <label>{t('editProfile.username')}:</label> {/* Translation for "Name" */}
                            <input
                                type="text"
                                name="username"
                                value={user?.username || ''}
                                onChange={(e) => setUser({...user!, username: e.target.value})}
                                placeholder={t('editProfile.usernamePlaceholder')} // Translation for placeholder
                            />
                        </div>
                        <div className="info-item">
                            <label>{t('editProfile.email')}:</label> {/* Translation for "Email" */}
                            <input
                                type="email"
                                name="email"
                                value={user?.email || ''}
                                onChange={(e) => setUser({...user!, email: e.target.value})}
                                placeholder={t('editProfile.emailPlaceholder')} // Translation for placeholder
                            />
                        </div>
                        <div className="info-item">
                            <label>{t('editProfile.country')}:</label> {/* Translation for "Country" */}
                            <input
                                type="text"
                                name="country"
                                value={user?.location?.country || ''}
                                onChange={(e) => handleAddressChange({...user!.location, country: e.target.value})}
                                placeholder={t('editProfile.countryPlaceholder')} // Translation for placeholder
                            />
                        </div>
                        <div className="info-item">
                            <label>{t('editProfile.city')}:</label> {/* Translation for "City" */}
                            <input
                                type="text"
                                name="city"
                                value={user?.location?.city || ''}
                                onChange={(e) => handleAddressChange({...user!.location, city: e.target.value})}
                                placeholder={t('editProfile.cityPlaceholder')} // Translation for placeholder
                            />
                        </div>
                        <div className="info-item">
                            <label>{t('editProfile.district')}:</label> {/* Translation for "District" */}
                            <input
                                type="text"
                                name="district"
                                value={user?.location?.district || ''}
                                onChange={(e) => handleAddressChange({...user!.location, district: e.target.value})}
                                placeholder={t('editProfile.districtPlaceholder')} // Translation for placeholder
                            />
                        </div>
                    </div>
                    <button type="submit" className="edit-button">
                        {t('editProfile.save')} {/* Translation for "Save Changes" */}
                    </button>
                    <button
                        type="button"
                        className="discard-button"
                        onClick={() => navigate('/profile')}
                    >
                        {t('editProfile.discard')} {/* Translation for "Discard Changes" */}
                    </button>
                </form>
            </div>

            <MapComponent
                onLocationChange={handleLocationChange}
                address={user?.location || {
                    country: t('editProfile.defaultCountry'),
                    city: t('editProfile.defaultCity'),
                    district: t('editProfile.defaultDistrict'),
                }}
                onAddressChange={handleAddressChange}
                lat={user?.location?.lat || 54.6872}
                lon={user?.location?.lon || 25.2797}
            />
        </div>
    );
};

export default EditProfile;
