import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { backend_url } from '../config';
import './Dashboard.css';
import { useNavigate } from 'react-router-dom';
import {useAuth} from "../context/AuthContext";

interface Inverter {
    id: string;
    name: string;
}
interface User {
    id: string;
    username: string;
}
const Dashboard: React.FC = () => {
    const {isLoggedIn, isAdmin} = useAuth();  // Get the isLoggedIn state from context

    const [inverters, setInverters] = useState<Inverter[]>([]);
    const [clusters, setClusters] = useState<Inverter[]>([]);
    const [panels, setPanels] = useState<Inverter[]>([]);

    const [users, setUsers] = useState<User[]>([]);

    const [error, setError] = useState<string | null>(null);
    const navigate = useNavigate();
    if(!isLoggedIn || !isAdmin){
        navigate(`/error?error_text=You%20do%20not%20have%20permission%20to%20edit%20this%20page.&error_code=403 - Forbidden.`);
    }
    // Fetch inverters when component mounts
    useEffect(() => {
        const fetchPanels = async () => {
            try {
                const token = localStorage.getItem('token');
                const response = await fetch(`${backend_url}/api/panel/all`, {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                });

                if (response.ok) {
                    const data = await response.json();
                    setPanels(data);
                } else {
                    setError('Failed to fetch inverters.');
                }
            } catch (err) {
                setError('An error occurred while fetching inverters.');
            }
        };

        fetchPanels();
    }, []);
    useEffect(() => {
        const fetchInverters = async () => {
            try {
                const token = localStorage.getItem('token');
                const response = await fetch(`${backend_url}/api/inverter/all`, {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                });

                if (response.ok) {
                    const data = await response.json();
                    setInverters(data);
                } else {
                    setError('Failed to fetch inverters.');
                }
            } catch (err) {
                setError('An error occurred while fetching inverters.');
            }
        };

        fetchInverters();
    }, []);
    useEffect(() => {
        const fetchClusters = async () => {
            try {
                const token = localStorage.getItem('token');
                const response = await fetch(`${backend_url}/api/cluster/all`, {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                });

                if (response.ok) {
                    const data = await response.json();
                    setClusters(data);
                } else {
                    setError('Failed to fetch clusters.');
                }
            } catch (err) {
                setError('An error occurred while fetching clusters.');
            }
        };

        fetchClusters();
    }, []);
    useEffect(() => {
        const fetchUsers = async () => {
            try {
                const token = localStorage.getItem('token');
                const response = await fetch(`${backend_url}/api/user/all`, {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                });

                if (response.ok) {
                    const data = await response.json();
                    setUsers(data);
                } else {
                    setError('Failed to fetch Users.');
                }
            } catch (err) {
                setError('An error occurred while fetching Users.');
            }
        };

        fetchUsers();
    }, []);
    return (
        // <div className="profile-container">
            <div className="dashboard-container">

                {/* Users Section */}
                <section className="dashboard-section">
                    <div className="section-header"onClick={() => navigate(`/add-user/`)}>
                        <h2>Users</h2>
                        <button className="add-button">Add User</button>
                    </div>
                    <ul className="dashboard-list">
                        {users.map((user) => (
                            <li key={user.id} className="list-item">
                                <span>{user.username}</span>
                                <div className="button-group">
                                    <button
                                        className="view-button"
                                        onClick={() => navigate(`/view-user/${user.id}`)}
                                    >
                                        View
                                    </button>
                                    <button
                                        className="edit-button2"
                                        onClick={() => navigate(`/edit-user/${user.id}`)}
                                    >
                                        Edit
                                    </button>
                                    <button className="delete-button">Delete</button>
                                </div>
                            </li>
                        ))}
                    </ul>
                </section>

                {/* Clusters Section */}
                <section className="dashboard-section">
                    <div className="section-header">
                        <h2>Clusters</h2>
                        <button className="add-button" onClick={() => navigate(`/add-cluster/`)}>Add Cluster</button>
                    </div>
                    <ul className="dashboard-list">
                        {clusters.map((cluster) => (
                            <li key={cluster.id} className="list-item">
                                <span>{cluster.name}</span>
                                <div className="button-group">
                                    <button
                                        className="view-button"
                                        onClick={() => navigate(`/view-cluster/${cluster.id}`)}
                                    >
                                        View
                                    </button>
                                    <button
                                        className="edit-button2"
                                        onClick={() => navigate(`/edit-cluster/${cluster.id}`)}
                                    >
                                        Edit
                                    </button>
                                    <button className="delete-button">Delete</button>
                                </div>
                            </li>
                        ))}
                    </ul>
                </section>

                {/* Panels Section */}
                <section className="dashboard-section">
                    <div className="section-header">
                        <h2>Panels</h2>
                        <button className="add-button" onClick={() => navigate(`/add-panel/`)}>Add Panel</button>
                    </div>
                    <ul className="dashboard-list">
                        {panels.map((panel) => (
                            <li key={panel.id} className="list-item">
                                <span>{panel.name}</span>
                                <div className="button-group">
                                    <button
                                        className="view-button"
                                        onClick={() => navigate(`/view-panel/${panel.id}`)}
                                    >
                                        View
                                    </button>
                                    <button
                                        className="edit-button2"
                                        onClick={() => navigate(`/edit-panel/${panel.id}`)}
                                    >
                                        Edit
                                    </button>
                                    <button className="delete-button">Delete</button>
                                </div>
                            </li>
                        ))}
                    </ul>
                </section>

                {/* Inverters Section */}
                <section className="dashboard-section">
                    <div className="section-header">
                        <h2>Inverters</h2>
                        <button className="add-button" onClick={() => navigate(`/add-inverter/`)}>Add Inverter</button>
                    </div>
                    {error && <p className="error-message">{error}</p>}
                    <ul className="dashboard-list">
                        {inverters.map((inverter) => (
                            <li key={inverter.id} className="list-item">
                                <span>{inverter.name}</span>
                                <div className="button-group">
                                    <button
                                        className="view-button"
                                        onClick={() => navigate(`/view-inverter/${inverter.id}`)}
                                    >
                                        View
                                    </button>
                                    <button
                                        className="edit-button2"
                                        onClick={() => navigate(`/edit-inverter/${inverter.id}`)}
                                    >
                                        Edit
                                    </button>
                                    <button className="delete-button">Delete</button>
                                </div>
                            </li>
                        ))}
                    </ul>
                </section>
            </div>
        // </div>
    );
};

export default Dashboard;
