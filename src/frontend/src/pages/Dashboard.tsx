import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { backend_url } from '../config';
import './Dashboard.css';
import { useAuth } from "../context/AuthContext";

interface Item {
    id: string;
    name: string;
}

const Dashboard: React.FC = () => {
    const { isLoggedIn, isAdmin } = useAuth();  // Get the isLoggedIn state from context
    const navigate = useNavigate();

    const [page, setPage] = useState<number>(0); // Current page
    const [size, setSize] = useState<number>(10); // Page size

    const [inverters, setInverters] = useState<Item[]>([]);
    const [clusters, setClusters] = useState<Item[]>([]);
    const [panels, setPanels] = useState<Item[]>([]);
    const [users, setUsers] = useState<Item[]>([]);
    const [error, setError] = useState<string | null>(null);

    if (!isLoggedIn || !isAdmin) {
        navigate(`/error?error_text=You%20do%20not%20have%20permission%20to%20edit%20this%20page.&error_code=403 - Forbidden.`);
    }

    const fetchData = async (endpoint: string, setData: React.Dispatch<React.SetStateAction<Item[]>>) => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${backend_url}/api/${endpoint}/all?page=${page}&size=${size}`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            if (response.ok) {
                const data = await response.json();
                console.log(data.content)
                setData(data.content || []); // Access the "content" array
            } else {
                setError(`Failed to fetch ${endpoint}.`);
            }
        } catch (err) {
            setError(`An error occurred while fetching ${endpoint}.`);
        }
    };
    const generateInverters = async (endpoint: string) => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${backend_url}/api/${endpoint}/create`, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            if (response.ok) {
                // const data = await response.;
                console.log("created")
                await fetchData("inverter", setInverters);

            } else {
                setError(`Failed to fetch ${endpoint}.`);
            }
        } catch (err) {
            setError(`An error occurred while fetching ${endpoint}.`);
        }
    };
    useEffect(() => {
        fetchData("panel", setPanels);
        fetchData("inverter", setInverters);
        fetchData("cluster", setClusters);
        fetchData("user", setUsers);
    }, [page, size]);
    const handleDelete = async (id: string, type: 'cluster' | 'panel' | 'inverter' | 'user') => {
        const token = localStorage.getItem('token');
        if (!token) return;

        try {
            const response = await fetch(`${backend_url}/api/${type}/${id}`, {
                method: 'DELETE',
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });
            if (response.ok) {
                // Remove the deleted item from the respective state
                if (type === 'cluster') setClusters(clusters.filter(item => item.id !== id));
                if (type === 'panel') setPanels(panels.filter(item => item.id !== id));
                if (type === 'inverter') setInverters(inverters.filter(item => item.id !== id));
                if (type === 'user') setUsers(users.filter(item => item.id !== id));
            } else {
                setError(`Failed to delete ${type}.`);
            }
        } catch (error) {
            setError(`An error occurred while deleting ${type}.`);
        }
    };

    const handlePageChange = (direction: string) => {
        if (direction === 'prev' && page > 0) {
            setPage(page - 1);
        } else if (direction === 'next') {
            setPage(page + 1);
        }
    };

    const handleSizeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setSize(parseInt(e.target.value));
        setPage(0); // Reset to first page when size changes
    };

    return (
        <>
        <div className="dashboard-container">
            {/* Users Section */}
            <section className="dashboard-section">
                <div className="section-header" onClick={() => navigate(`/add-user/`)}>
                    <h2>Users</h2>
                    <button className="add-button">Create new User</button>
                </div>
                <ul className="dashboard-list">
                    {users.map((user) => (
                        <li key={user.id} className="list-item">
                            <span>{user.name || user.id}</span>
                            <div className="button-group">
                                <button
                                    className="view-button"
                                    onClick={() => navigate(`/view-user/${user.id}`)}
                                >
                                    View
                                </button>
                                <button
                                    className="edit-button2"
                                    onClick={() => navigate(`/edit-profile/${user.id}`)}
                                >
                                    Edit
                                </button>
                                <button
                                    className="delete-button"
                                    onClick={() => handleDelete(user.id, 'user')}
                                >
                                    Delete
                                </button>
                            </div>
                        </li>
                    ))}
                </ul>
            </section>

            {/* Clusters Section */}
            <section className="dashboard-section">
                <div className="section-header">
                    <h2>Clusters</h2>
                    <button className="add-button" onClick={() => navigate(`/add-cluster/`)}>Create new Cluster</button>
                </div>
                <ul className="dashboard-list">
                    {clusters.map((cluster) => (
                        <li key={cluster.id} className="list-item">
                            <span>{cluster.name || cluster.id}</span>
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
                                <button
                                    className="delete-button"
                                    onClick={() => handleDelete(cluster.id, 'cluster')}
                                >
                                    Delete
                                </button>
                            </div>
                        </li>
                    ))}
                </ul>
            </section>

            {/* Panels Section */}
            <section className="dashboard-section">
                <div className="section-header">
                    <h2>Panels</h2>
                    <button className="add-button" onClick={() => navigate(`/add-panel/`)}>Create new Panel</button>
                </div>
                <ul className="dashboard-list">
                    {panels.map((panel) => (
                        <li key={panel.id} className="list-item">
                            <span>{panel.name || panel.id}</span>
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
                                <button
                                    className="delete-button"
                                    onClick={() => handleDelete(panel.id, 'panel')}
                                >
                                    Delete
                                </button>
                            </div>
                        </li>
                    ))}
                </ul>
            </section>

            {/* Inverters Section */}
            <section className="dashboard-section">
                <div className="section-header">
                    <h2>Inverters</h2>
                    <button className="add-button" onClick={()=>generateInverters("inverter")}>Generate Inverters
                    </button>

                    <button className="add-button" onClick={() => navigate(`/add-inverter/`)}>Create new Inverter
                    </button>
                </div>
                <ul className="dashboard-list">
                    {inverters.map((inverter) => (
                        <li key={inverter.id} className="list-item">
                            <span>{inverter.name}</span>
                            <div className="button-group">
                                {/*<button*/}
                                {/*    className="view-button"*/}
                                {/*    onClick={() => navigate(`/view-inverter/${inverter.id}`)}*/}
                                {/*>*/}
                                {/*    View*/}
                                {/*</button>*/}
                                <button
                                    className="edit-button2"
                                    onClick={() => navigate(`/edit-inverter/${inverter.id}`)}
                                >
                                    Edit
                                </button>
                                <button
                                    className="delete-button"
                                    onClick={() => handleDelete(inverter.id, 'inverter')}
                                >
                                    Delete
                                </button>
                            </div>
                        </li>
                    ))}
                </ul>
            </section>


        </div>
    <footer className="pagination-controls">
        <button
            className="pagination-button"
            onClick={() => handlePageChange('prev')}
            disabled={page === 0}
        >
            Previous
        </button>
        <span className="pagination-info">Page: {page + 1}</span>
        <button
            className="pagination-button"
            onClick={() => handlePageChange('next')}
        >
            Next
        </button>
        <select className="page-size-dropdown" value={size} onChange={handleSizeChange}>
            <option value={5}>5</option>
            <option value={10}>10</option>
            <option value={12}>12</option>
            <option value={15}>15</option>
            <option value={20}>20</option>
            <option value={25}>25</option>
        </select>
    </footer>
    </>
)
    ;
};

export default Dashboard;
