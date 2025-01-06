import React, {useState} from 'react';
import {useAuth} from '../context/AuthContext';
import {backend_url} from "../config";
import {useNavigate} from 'react-router-dom';
import {useTranslation} from 'react-i18next'; // Import useTranslation

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
                const response = await fetch(`${backend_url}/api/auth/signin`, {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({
                        username: formState.emailOrUsername,
                        password: formState.password
                    })
                });

                const contentType = response.headers.get('Content-Type');

                if (response.ok) {
                    if (contentType && contentType.includes('application/json')) {
                        const result = await response.json();
                        if (result.token) {
                            localStorage.setItem('token', result.token);
                            localStorage.setItem("expirationDate", result.expirationDate);

                        }
                        setIsLoggedIn(true);
                        if(result.role === "ROLE_ADMIN"){
                            localStorage.setItem("role", result.role);
                            setIsAdmin(true);
                        }
                        setMessage(t('signIn.signInSuccess'));
                    } else {
                        const result = await response.text();
                        localStorage.setItem('token', result);
                        setIsLoggedIn(true);

                        setMessage(t('signIn.signInSuccess'));
                    }
                    navigate('/profile');
                } else {
                    if (contentType && contentType.includes('application/json')) {
                        const error = await response.json();
                        setMessage(`${t('signIn.signInFailed')}: ${error.message}`);
                    } else {
                        const error = await response.text();
                        setMessage(`${t('signIn.signInFailed')}: ${error}`);
                    }
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
