import React, {useEffect, useState} from 'react';
import {useNavigate} from 'react-router-dom';
import ConfirmationModal from '../components/ConfirmationModal';
import {useAuth} from '../context/AuthContext';
import {backend_url} from "../config";
import {useTranslation} from 'react-i18next'; // Import the useTranslation hook

interface Address {
    country: string;
    city: string;
    district: string;
}

interface User {
    username: string;
    email: string;
    location: Address | null;
}

const Profile: React.FC = () => {
    const {t} = useTranslation(); // Use the useTranslation hook
    const navigate = useNavigate();
    const [isModalOpen, setModalOpen] = useState(false);
    const {setIsLoggedIn} = useAuth();
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const token = localStorage.getItem('token');
                const response = await fetch(`${backend_url}/api/user/profile`, {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });

                if (!response.ok) {
                    throw new Error('Failed to fetch profile');
                }

                const data = await response.json();
                setUser(data);
            } catch (err) {
                setError(t('profile.error')); // Use translation for error message
            } finally {
                setLoading(false);
            }
        };

        fetchProfile();
    }, [t]);

    const handleEditClick = () => {
        navigate('/edit-profile');
    };

    const handleExitClick = () => {
        setModalOpen(true);
    };

    const handleConfirmExit = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('role');
        localStorage.removeItem('expirationDate');

        setIsLoggedIn(false);
        navigate('/');
    };

    const handleCloseModal = () => {
        setModalOpen(false);
    };

    const displayAddress = (location: Address | null | undefined) => {
        if (!location || (!location.country && !location.city && !location.district)) {
            return t('profile.notSet'); // Use translation for "Not set"
        }
        return `${location.district || ''}, ${location.city || ''}, ${location.country || ''}`.trim().replace(/,\s*$/, '');
    };

    if (loading) {
        return <div>{t('profile.loading')}</div>; // Use translation for loading text
    }

    if (error) {
        return <div>{error}</div>;
    }

    return (
        <div className="profile-container">
            <div className="profile-card">
                <h2>{t('profile.title')}</h2> {/* Use translation for title */}
                <div className="profile-info">
                    <div className="info-item">
                        <label>{t('profile.name')}:</label> {/* Use translation for "Name" */}
                        <p>{user?.username || t('profile.notSet')}</p>
                    </div>
                    <div className="info-item">
                        <label>{t('profile.email')}:</label> {/* Use translation for "Email" */}
                        <p>{user?.email || t('profile.notSet')}</p>
                    </div>
                    <div className="info-item">
                        <label>{t('profile.address')}:</label> {/* Use translation for "Address" */}
                        <p>{displayAddress(user?.location)}</p>
                    </div>
                </div>
                <button className="edit-button" onClick={handleEditClick}>
                    {t('profile.edit')} {/* Use translation for "Edit Profile" */}
                </button>
                <button className="exit-button" onClick={handleExitClick}>
                    {t('profile.exit')} {/* Use translation for "Exit" */}
                </button>
            </div>

            <ConfirmationModal
                isOpen={isModalOpen}
                onClose={handleCloseModal}
                onConfirm={handleConfirmExit}
                message={t('profile.confirmExitMessage')} // Use translation for modal message
            />
        </div>
    );
};

export default Profile;
