import React, { useState } from 'react';
import './Auth.css';
import { useAuth } from '../context/AuthContext';
import {backend_url} from "../config";
import { useNavigate } from 'react-router-dom';


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
    const [formState, setFormState] = useState<SignUpFormState>({
        name: '',
        email: '',
        password: '',
        confirmPassword: ''
    });
    const navigate = useNavigate();

    const { setIsLoggedIn } = useAuth();
    const [errors, setErrors] = useState<ValidationErrors>({});
    const [message, setMessage] = useState<string | null>(null); // New state to store success/error message

    const validate = (): boolean => {
        const newErrors: ValidationErrors = {};
        if (!formState.name) newErrors.name = 'Name is required';
        if (!formState.email) newErrors.email = 'Email is required';
        else if (!/\S+@\S+\.\S+/.test(formState.email)) newErrors.email = 'Email is invalid';
        if (!formState.password) newErrors.password = 'Password is required';
        else if (formState.password.length < 6) newErrors.password = 'Password must be at least 6 characters long';
        if (formState.password !== formState.confirmPassword)
            newErrors.confirmPassword = 'Passwords do not match';
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
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        username: formState.name,
                        email: formState.email,
                        password: formState.password
                    })
                });

                // Check if the response is JSON by looking at the Content-Type header
                const contentType = response.headers.get('Content-Type');

                if (response.ok) {
                    // If the response is JSON, parse it
                    if (contentType && contentType.includes('application/json')) {
                        const result = await response.json();

                        if (result.token) {
                            // Store the token in localStorage
                            localStorage.setItem('token', result.token);
                            localStorage.setItem("expirationDate", result.expirationDate);

                        }
                        setIsLoggedIn(true);
                        setMessage('Sign Up Successful');
                    } else {
                        // If the response is not JSON, read it as text
                        const result = await response.text();
                        localStorage.setItem('token', result);
                        setIsLoggedIn(true);
                        setMessage('Sign Up Successful');
                    }
                    navigate('/profile');
                } else {
                    // Handle errors when the response is not ok
                    if (contentType && contentType.includes('application/json')) {
                        const error = await response.json();
                        setMessage('Sign Up Failed: ' + error.message);
                    } else {
                        const error = await response.text();
                        setMessage('Sign Up Failed: ' + error);
                    }
                }
            } catch (error) {
                setMessage('An error occurred: ' + (error as Error).message);
            }
        }
    };


    return (
        <div className="auth-container">
            <form className="auth-form" onSubmit={handleSubmit}>
                <h2>Sign Up</h2>

                {/* Name Input */}
                <div className="form-group">
                    <label>Name</label>
                    <input
                        type="text"
                        name="name"
                        value={formState.name}
                        onChange={handleChange}
                        className={errors.name ? 'error' : ''}
                    />
                    {errors.name && <span className="error-message">{errors.name}</span>}
                </div>

                {/* Email Input */}
                <div className="form-group">
                    <label>Email</label>
                    <input
                        type="email"
                        name="email"
                        value={formState.email}
                        onChange={handleChange}
                        className={errors.email ? 'error' : ''}
                    />
                    {errors.email && <span className="error-message">{errors.email}</span>}
                </div>

                {/* Password Input */}
                <div className="form-group">
                    <label>Password</label>
                    <input
                        type="password"
                        name="password"
                        value={formState.password}
                        onChange={handleChange}
                        className={errors.password ? 'error' : ''}
                    />
                    {errors.password && <span className="error-message">{errors.password}</span>}
                </div>

                {/* Confirm Password Input */}
                <div className="form-group">
                    <label>Confirm Password</label>
                    <input
                        type="password"
                        name="confirmPassword"
                        value={formState.confirmPassword}
                        onChange={handleChange}
                        className={errors.confirmPassword ? 'error' : ''}
                    />
                    {errors.confirmPassword && <span className="error-message">{errors.confirmPassword}</span>}
                </div>

                <button type="submit" className="btn">Sign Up</button>

                {/* Display success or error message */}
                {message && <p className="result-message">{message}</p>}
            </form>
        </div>
    );
};

export default SignUp;
