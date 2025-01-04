import React from 'react';
import {Link} from 'react-router-dom';
import {useAuth} from '../context/AuthContext';
import LanguageSwitcher from "./LanguageSwitcher";
import {useTranslation} from "react-i18next";

const Header: React.FC = () => {
    // Using the auth context to get the current authentication state
    const {isLoggedIn, isAdmin} = useAuth();  // Get the isLoggedIn state from context
    const {t} = useTranslation(); // Use the useTranslation hook

    return (
        <header className="header">
            <nav className="nav">
                <ul className="nav-links">
                    <li><Link to="/">{t('nav.home')}</Link></li>
                    {!isLoggedIn ? (  // Check if user is logged in from context
                        <>
                            <li><Link to="/signin">{t('nav.signIn')}</Link></li>
                            <li><Link to="/signup">{t('nav.signUp')}</Link></li>
                        </>
                    ) : (<>
                            <li><Link to="/profile">{t('nav.profile')}</Link></li>
                            {isAdmin && <li><Link to="/dashboard">{t('nav.dashboard')}</Link></li>}
                            <li><Link to="/panelslist">{t('nav.myPanels')}</Link></li>
                            <li><Link to="/clusterlist">{t('nav.myClusters')}</Link></li>

                            <li><Link to="/forecast">{t('nav.forecast')}</Link></li>
                        </>
                    )}
                </ul>
                <LanguageSwitcher/>
            </nav>
        </header>
    );
};

export default Header;
