import React from 'react';
import { Link } from 'react-router-dom';
import './Home.css'; // Add some custom styles if you want

const NotFound: React.FC = () => {
    return (
        <div className="not-found-container">
            <h1>404 - Page Not Found</h1>
            <p>Oops! The page you are looking for does not exist.</p>
            <Link to="/" className="btn">Go Back Home</Link>
        </div>
    );
};

export default NotFound;
