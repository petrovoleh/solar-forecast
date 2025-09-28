import React, {useState} from 'react';
import {useAuth} from '../context/AuthContext';
import {backend_url} from "../config";
import {useNavigate} from 'react-router-dom';
import {useTranslation} from 'react-i18next'; // Import useTranslation
import {apiRequest} from '../utils/apiClient';

interface SignInFormState {
    emailOrUsername: string;
    password: string;
}

interface ValidationErrors {
    emailOrUsername?: string;
    password?: string;
}

const SignIn: React.FC = () => {
    const {t} = useTranslation(); // Initialize the useTranslation hook
    const navigate = useNavigate();
    const [formState, setFormState] = useState<SignInFormState>({
        emailOrUsername: '',
        password: ''
    });
    const {setIsLoggedIn,setIsAdmin} = useAuth();
    const [errors, setErrors] = useState<ValidationErrors>({});
    const [message, setMessage] = useState<string | null>(null);

    const validate = (): boolean => {
        const newErrors: ValidationErrors = {};

        if (!formState.emailOrUsername) {
            newErrors.emailOrUsername = t('signIn.emailOrUsernameError');
        } else if (!/\S+@\S+\.\S+/.test(formState.emailOrUsername) && formState.emailOrUsername.includes('@')) {
            newErrors.emailOrUsername = t('signIn.emailInvalidError');
        }

        if (!formState.password) {
            newErrors.password = t('signIn.passwordError');
        } 

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const {name, value} = e.target;
        setFormState((prevState) => ({
            ...prevState,
            [name]: value
        }));
    };

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (validate()) {
            try {
                const {response, data} = await apiRequest(
                    `${backend_url}/api/auth/signin`,
                    {
                        method: 'POST',
                        headers: {'Content-Type': 'application/json'},
                        body: JSON.stringify({
                            username: formState.emailOrUsername,
                            password: formState.password,
                        }),
                    },
                );

                if (response.ok) {
                    if (data && typeof data === 'object') {
                        const result = data as { token?: string; expirationDate?: string; role?: string };
                        if (result.token) {
                            localStorage.setItem('token', result.token);
                            if (result.expirationDate) {
                                localStorage.setItem('expirationDate', result.expirationDate);
                            }
                        }
                        setIsLoggedIn(true);
                        if (result.role === "ROLE_ADMIN") {
                            localStorage.setItem('role', result.role);
                            setIsAdmin(true);
                        }
                    } else if (typeof data === 'string') {
                        localStorage.setItem('token', data);
                        setIsLoggedIn(true);
                    }

                    setMessage(t('signIn.signInSuccess'));
                    navigate('/profile');
                } else {
                    const errorMessage = typeof data === 'string'
                        ? data
                        : (data as { message?: string } | null)?.message;
                    setMessage(`${t('signIn.signInFailed')}: ${errorMessage || response.statusText}`);
                }
            } catch (error) {
                setMessage(`${t('signIn.errorOccurred')} ${(error as Error).message}`);
            }
        }
    };

    return (
        <div className="auth-container">
            <form className="auth-form" onSubmit={handleSubmit}>
                <h2>{t('signIn.title')}</h2>

                <div className="form-group">
                    <label>{t('signIn.emailOrUsername')}</label>
                    <input
                        type="text"
                        name="emailOrUsername"
                        value={formState.emailOrUsername}
                        onChange={handleChange}
                        className={errors.emailOrUsername ? 'error' : ''}
                    />
                    {errors.emailOrUsername && <span className="error-message">{errors.emailOrUsername}</span>}
                </div>

                <div className="form-group">
                    <label>{t('signIn.password')}</label>
                    <input
                        type="password"
                        name="password"
                        value={formState.password}
                        onChange={handleChange}
                        className={errors.password ? 'error' : ''}
                    />
                    {errors.password && <span className="error-message">{errors.password}</span>}
                </div>

                <button type="submit" className="btn">{t('signIn.submitButton')}</button>

                {message && <p className="result-message">{message}</p>}
            </form>
        </div>
    );
};

export default SignIn;
