import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import ConfirmationModal from '../components/ConfirmationModal'; // Import the custom modal
import { useAuth } from '../context/AuthContext';
import {backend_url} from "../config";

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
    const navigate = useNavigate();
    const [isModalOpen, setModalOpen] = useState(false); // State to manage modal visibility
    const { setIsLoggedIn } = useAuth();
    const [user, setUser] = useState<User | null>(null); // State to store user data
    const [loading, setLoading] = useState<boolean>(true); // State for loading status
    const [error, setError] = useState<string | null>(null); // State to store errors

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
                console.log(data)
                setUser(data); // Now data contains both user info and location
            } catch (err) {
                setError('Error fetching profile data');
            } finally {
                setLoading(false);
            }
        };

        fetchProfile();
    }, []);


    const handleEditClick = () => {
        navigate('/edit-profile');  // Navigate to EditProfile page
    };

    const handleExitClick = () => {
        setModalOpen(true); // Open the modal
    };

    const handleConfirmExit = () => {
        localStorage.removeItem('token'); // Remove the token from local storage
        setIsLoggedIn(false);
        navigate('/'); // Navigate to home page
    };

    const handleCloseModal = () => {
        setModalOpen(false); // Close the modal
    };

    // Function to display location or "Not set"
    const displayAddress = (location: Address | null | undefined) => {
        if (!location || (!location.country && !location.city && !location.district)) {
            return 'Not set';
        }
        return `${location.district || ''}, ${location.city || ''}, ${location.country || ''}`.trim().replace(/,\s*$/, '');
    };

    if (loading) {
        return <div>Loading...</div>; // Show loading spinner or text while fetching data
    }

    if (error) {
        return <div>{error}</div>; // Show error if there's an issue fetching the data
    }

    return (
        <div className="profile-container">
            <div className="profile-card">
                <h2>Profile</h2>
                <div className="profile-info">
                    <div className="info-item">
                        <label>Name:</label>
                        <p>{user?.username || 'Not set'}</p> {/* Display 'Not set' if name is missing */}
                    </div>
                    <div className="info-item">
                        <label>Email:</label>
                        <p>{user?.email || 'Not set'}</p> {/* Display 'Not set' if email is missing */}
                    </div>
                    <div className="info-item">
                        <label>Address:</label>
                        <p>{displayAddress(user?.location)}</p> {/* Display formatted location */}
                    </div>
                </div>
                <button className="edit-button" onClick={handleEditClick}>Edit Profile</button>
                <button className="exit-button" onClick={handleExitClick}>Exit</button>
            </div>

            {/* Render the confirmation modal */}
            <ConfirmationModal
                isOpen={isModalOpen}
                onClose={handleCloseModal}
                onConfirm={handleConfirmExit}
                message="Are you sure you want to exit?"
            />
        </div>
    );
};

export default Profile;
