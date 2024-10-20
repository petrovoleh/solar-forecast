// Header.tsx
import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext'; // Import the Auth context
import './Header.css';  // Optional styling

const Header: React.FC = () => {
    // Using the auth context to get the current authentication state
    const { isLoggedIn } = useAuth();  // Get the isLoggedIn state from context

    return (
        <header className="header">
            <nav className="nav">
                <ul className="nav-links">
                    <li><Link to="/">Home</Link></li>
                    {isLoggedIn ? (  // Check if user is logged in from context
                        <>
                            <li><Link to="/profile">Profile</Link></li>
                            <li><Link to="/dashboard">Dashboard</Link></li>
                            <li><Link to="/panelslist">My Panels</Link></li>
                            <li><Link to="/forecast">Forecast</Link></li>
                        </>
                    ) : (
                        <>
                            <li><Link to="/signin">Sign In</Link></li>
                            <li><Link to="/signup">Sign Up</Link></li>
                        </>
                    )}
                </ul>
            </nav>
        </header>
    );
};

export default Header;
