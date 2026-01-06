import React, {useState} from 'react';
import {Link} from 'react-router-dom';
import {useAuth} from '../context/AuthContext';
import LanguageSwitcher from "./LanguageSwitcher";
import ThemeToggle from './ThemeToggle';
import {useTranslation} from "react-i18next";

const Header: React.FC = () => {
    // Using the auth context to get the current authentication state
    const {isLoggedIn, isAdmin} = useAuth();  // Get the isLoggedIn state from context
    const {t} = useTranslation(); // Use the useTranslation hook
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    return (
        <header className="header">
            <nav className="nav">
                <button
                    className="nav-toggle"
                    type="button"
                    aria-expanded={isMenuOpen}
                    aria-controls="primary-navigation"
                    onClick={() => setIsMenuOpen((open) => !open)}
                >
                    ☰ Menu
                </button>
                <ul
                    id="primary-navigation"
                    className={`nav-links${isMenuOpen ? ' is-open' : ''}`}
                    onClick={() => setIsMenuOpen(false)}
                >
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
                <div className="utility-controls">
                    <ThemeToggle />
                    <LanguageSwitcher/>
                </div>
            </nav>
        </header>
    );
};

export default Header;
