import React from 'react';
import {BrowserRouter as Router, Route, Routes} from 'react-router-dom';
import Home from './pages/Home';
import SignIn from './pages/SignIn';
import PanelForecast from './pages/PanelForecast';
import BarForecast from './pages/BarForecast';
import {Helmet} from 'react-helmet';
import SignUp from './pages/SignUp';
import Profile from './pages/Profile';
import EditProfile from './pages/EditProfile'; // Import the EditProfile page
import Dashboard from './pages/Dashboard';
import Header from './components/Header';
import PanelsList from "./pages/PanelsList";
import "./App.css"
import AddPanel from "./pages/AddPanel";
import ViewPanel from "./pages/ViewPanel";
import {AuthProvider} from './context/AuthContext';
import Forecast from "./pages/Forecast";
import ClusterList from "./pages/ClusterList";
import AddCluster from "./pages/AddCluster";
import NotFound from "./pages/NotFound";
import AddInverter from "./pages/AddInverter";
import './i18n';
import ViewCluster from "./pages/ViewCluster";
import ErrorPage from "./pages/ErrorPage"; // Import the i18n configuration


const App: React.FC = () => {
    return (
        <AuthProvider>
            <Helmet>
                <title>Solar forecast</title>
            </Helmet>
            <Router>
                <Header/>
                <div className="page-content">
                    <Routes>
                        <Route path="/" element={<Home/>}/>
                        <Route path="/forecast" element={<Forecast/>}/>

                        <Route path="/signin" element={<SignIn/>}/>
                        <Route path="/signup" element={<SignUp/>}/>
                        <Route path="/profile" element={<Profile/>}/>
                        <Route path="/edit-profile" element={<EditProfile/>}/>
                        <Route path="/dashboard" element={<Dashboard/>}/>
                        <Route path="/panelslist" element={<PanelsList/>}/>
                        <Route path="/clusterlist" element={<ClusterList/>}/>
                        <Route path="/add" element={<AddPanel/>}/>
                        <Route path="/add-panel" element={<AddPanel/>}/>

                        <Route path="/edit/:id" element={<AddPanel/>}/>
                        <Route path="/edit-panel/:id" element={<AddPanel/>}/>
                        <Route path="/add-user" element={<SignUp/>}/>

                        <Route path="/add-cluster" element={<AddCluster/>}/>
                        <Route path="/add-inverter" element={<AddInverter/>}/>
                        <Route path="/edit-inverter/:id" element={<AddInverter/>}/>

                        <Route path="/edit-cluster/:id" element={<AddCluster/>}/>
                        <Route path="/view/:id" element={<ViewPanel/>}/> {/* View route */}
                        <Route path="/view-panel/:id" element={<ViewPanel/>}/> {/* View route */}

                        <Route path="/view-cluster/:id" element={<ViewCluster/>}/> {/* View route */}
                        <Route path="/error" element={<ErrorPage />} />

                        <Route path="/panel_forecast/:id" element={<PanelForecast/>}/>
                        <Route path="/bar_forecast/:id" element={<BarForecast/>}/>
                        <Route path="*" element={<NotFound/>}/>
                    </Routes>
                </div>
                <footer className="footer">
                    <p>© 2025 Oleh Petrov | Vilnius University</p>

                </footer>
            </Router>
        </AuthProvider>
    );
};

export default App;
