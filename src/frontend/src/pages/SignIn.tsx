import React, { useState } from 'react';
import './Auth.css';
import { useAuth } from '../context/AuthContext';

interface SignInFormState {
    emailOrUsername: string;
    password: string;
}

interface ValidationErrors {
    emailOrUsername?: string;
    password?: string;
}

const SignIn: React.FC = () => {
    const [formState, setFormState] = useState<SignInFormState>({
        emailOrUsername: '', // Accepts either email or username
        password: ''
    });
    const { setIsLoggedIn } = useAuth();
    const [errors, setErrors] = useState<ValidationErrors>({});
    const [message, setMessage] = useState<string | null>(null); // To store success or error messages

    const validate = (): boolean => {
        const newErrors: ValidationErrors = {};

        // Validation for either email or username
        if (!formState.emailOrUsername) {
            newErrors.emailOrUsername = 'Email or username is required';
        } else if (!/\S+@\S+\.\S+/.test(formState.emailOrUsername) && formState.emailOrUsername.includes('@')) {
            // If it's an email (contains '@'), validate it
            newErrors.emailOrUsername = 'Email is invalid';
        }

        // Password validation
        if (!formState.password) {
            newErrors.password = 'Password is required';
        } else if (formState.password.length < 8) {
            newErrors.password = 'Password must be at least 8 characters long';
        }

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
                const response = await fetch('http://localhost:8080/api/auth/signin', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        username: formState.emailOrUsername, // Send either email or username
                        password: formState.password
                    })
                });

                const contentType = response.headers.get('Content-Type');

                if (response.ok) {
                    if (contentType && contentType.includes('application/json')) {
                        const result = await response.json();

                        // Assuming result contains a token
                        if (result.token) {
                            // Store the token in localStorage
                            localStorage.setItem('token', result.token);
                            localStorage.setItem("expirationDate", result.expirationDate);
                        }
                        setIsLoggedIn(true);
                        setMessage('Sign In Successful');
                    } else {
                        const result = await response.text();
                        localStorage.setItem('token', result);
                        setIsLoggedIn(true);
                        setMessage('Sign In Successful');
                    }
                } else {
                    // Handle errors when the response is not ok
                    if (contentType && contentType.includes('application/json')) {
                        const error = await response.json();
                        setMessage('Sign In Failed: ' + error.message);
                    } else {
                        const error = await response.text();
                        setMessage('Sign In Failed: ' + error);
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
                <h2>Sign In</h2>

                {/* Email or Username Input */}
                <div className="form-group">
                    <label>Email or Username</label>
                    <input
                        type="text"
                        name="emailOrUsername"
                        value={formState.emailOrUsername}
                        onChange={handleChange}
                        className={errors.emailOrUsername ? 'error' : ''}
                    />
                    {errors.emailOrUsername && <span className="error-message">{errors.emailOrUsername}</span>}
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

                <button type="submit" className="btn">Sign In</button>

                {/* Display success or error message */}
                {message && <p className="result-message">{message}</p>}
            </form>
        </div>
    );
};

export default SignIn;
