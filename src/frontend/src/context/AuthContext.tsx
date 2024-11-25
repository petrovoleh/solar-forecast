import React, {createContext, useContext, useEffect, useState} from 'react';

interface AuthContextType {
    isLoggedIn: boolean;
    setIsLoggedIn: (status: boolean) => void;
    expirationDate: Date | null;
    setExpirationDate: (date: Date | null) => void;
    isAdmin: boolean;
    setIsAdmin: (status: boolean) => void;

}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({children}) => {
    const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
    const [expirationDate, setExpirationDate] = useState<Date | null>(null);
    const [isAdmin, setIsAdmin] = useState<boolean>(false);

    // Check local storage for token, expiration date, and role on component mount
    useEffect(() => {
        const token = localStorage.getItem('token');
        const storedExpiration = localStorage.getItem('expirationDate');
        const role = localStorage.getItem('role'); // Retrieve role from localStorage

        if (token && storedExpiration) {
            const parsedExpiration = new Date(storedExpiration);
            const currentTime = new Date();

            // Check if token is still valid based on expiration date
            if (parsedExpiration > currentTime) {
                setIsLoggedIn(true);
                setExpirationDate(parsedExpiration);

                // Set isAdmin if the role is 'ROLE_ADMIN'
                if (role === 'ROLE_ADMIN') {
                    setIsAdmin(true);
                }
            } else {
                // If token is expired, remove it from localStorage
                localStorage.removeItem('token');
                localStorage.removeItem('role');
                localStorage.removeItem('expirationDate');
                setIsLoggedIn(false);
                setExpirationDate(null);
                setIsAdmin(false); // Reset isAdmin if the session is expired
            }
        }
    }, []);

    return (
        <AuthContext.Provider value={{isLoggedIn, setIsLoggedIn, expirationDate, setExpirationDate, isAdmin,setIsAdmin}}>
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
