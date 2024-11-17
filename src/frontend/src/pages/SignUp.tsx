import React, { useState } from 'react';
import './Auth.css';
import { useAuth } from '../context/AuthContext';
import { backend_url } from "../config";
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next'; // Import useTranslation

interface SignUpFormState {
    name: string;
    email: string;
    password: string;
    confirmPassword: string;
}

interface ValidationErrors {
    name?: string;
    email?: string;
    password?: string;
    confirmPassword?: string;
}

const SignUp: React.FC = () => {
    const { t } = useTranslation(); // Initialize the useTranslation hook
    const [formState, setFormState] = useState<SignUpFormState>({
        name: '',
        email: '',
        password: '',
        confirmPassword: ''
    });
    const navigate = useNavigate();
    const { setIsLoggedIn } = useAuth();
    const [errors, setErrors] = useState<ValidationErrors>({});
    const [message, setMessage] = useState<string | null>(null);

    const validate = (): boolean => {
        const newErrors: ValidationErrors = {};
        if (!formState.name) newErrors.name = t('signUp.nameError');
        if (!formState.email) newErrors.email = t('signUp.emailError');
        else if (!/\S+@\S+\.\S+/.test(formState.email)) newErrors.email = t('signUp.emailInvalidError');
        if (!formState.password) newErrors.password = t('signUp.passwordError');
        else if (formState.password.length < 6) newErrors.password = t('signUp.passwordLengthError');
        if (formState.password !== formState.confirmPassword)
            newErrors.confirmPassword = t('signUp.confirmPasswordError');
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormState((prevState) => ({
            ...prevState,
            [name]: value
        }));
    };

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (validate()) {
            try {
                const response = await fetch(`${backend_url}/api/auth/signup`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        username: formState.name,
                        email: formState.email,
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
                        setMessage(t('signUp.signUpSuccess'));
                    } else {
                        const result = await response.text();
                        localStorage.setItem('token', result);
                        setIsLoggedIn(true);
                        setMessage(t('signUp.signUpSuccess'));
                    }
                    navigate('/profile');
                } else {
                    if (contentType && contentType.includes('application/json')) {
                        const error = await response.json();
                        setMessage(`${t('signUp.signUpFailed')}: ${error.message}`);
                    } else {
                        const error = await response.text();
                        setMessage(`${t('signUp.signUpFailed')}: ${error}`);
                    }
                }
            } catch (error) {
                setMessage(`${t('signUp.errorOccurred')} ${(error as Error).message}`);
            }
        }
    };

    return (
        <div className="auth-container">
            <form className="auth-form" onSubmit={handleSubmit}>
                <h2>{t('signUp.title')}</h2>

                <div className="form-group">
                    <label>{t('signUp.name')}</label>
                    <input
                        type="text"
                        name="name"
                        value={formState.name}
                        onChange={handleChange}
                        className={errors.name ? 'error' : ''}
                    />
                    {errors.name && <span className="error-message">{errors.name}</span>}
                </div>

                <div className="form-group">
                    <label>{t('signUp.email')}</label>
                    <input
                        type="email"
                        name="email"
                        value={formState.email}
                        onChange={handleChange}
                        className={errors.email ? 'error' : ''}
                    />
                    {errors.email && <span className="error-message">{errors.email}</span>}
                </div>

                <div className="form-group">
                    <label>{t('signUp.password')}</label>
                    <input
                        type="password"
                        name="password"
                        value={formState.password}
                        onChange={handleChange}
                        className={errors.password ? 'error' : ''}
                    />
                    {errors.password && <span className="error-message">{errors.password}</span>}
                </div>

                <div className="form-group">
                    <label>{t('signUp.confirmPassword')}</label>
                    <input
                        type="password"
                        name="confirmPassword"
                        value={formState.confirmPassword}
                        onChange={handleChange}
                        className={errors.confirmPassword ? 'error' : ''}
                    />
                    {errors.confirmPassword && <span className="error-message">{errors.confirmPassword}</span>}
                </div>

                <button type="submit" className="btn">{t('signUp.submitButton')}</button>

                {message && <p className="result-message">{message}</p>}
            </form>
        </div>
    );
};

export default SignUp;
