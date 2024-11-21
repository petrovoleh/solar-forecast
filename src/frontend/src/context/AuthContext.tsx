import React, {createContext, useContext, useEffect, useState} from 'react';

interface AuthContextType {
    isLoggedIn: boolean;
    setIsLoggedIn: (status: boolean) => void;
    expirationDate: Date | null;
    setExpirationDate: (date: Date | null) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({children}) => {
    const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
    const [expirationDate, setExpirationDate] = useState<Date | null>(null);

    // Check local storage for token and expiration date on component mount
    useEffect(() => {
        const token = localStorage.getItem('token');
        const storedExpiration = localStorage.getItem('expirationDate');

        if (token && storedExpiration) {
            const parsedExpiration = new Date(storedExpiration);
            const currentTime = new Date();

            // Check if token is still valid based on expiration date
            if (parsedExpiration > currentTime) {
                setIsLoggedIn(true);
                setExpirationDate(parsedExpiration);
            } else {
                // If token is expired, remove it from localStorage
                localStorage.removeItem('token');
                localStorage.removeItem('expirationDate');
                setIsLoggedIn(false);
                setExpirationDate(null);
            }
        }
    }, []);

    return (
        <AuthContext.Provider value={{isLoggedIn, setIsLoggedIn, expirationDate, setExpirationDate}}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
