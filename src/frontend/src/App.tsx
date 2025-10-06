import React from 'react';
import {BrowserRouter as Router, Route, Routes} from 'react-router-dom';
import Home from './pages/Home';
import SignIn from './pages/SignIn';
import GraphForecast from './pages/GraphForecast';
import BarForecast from './pages/BarForecast';
import {Helmet} from 'react-helmet';
import SignUp from './pages/SignUp';
import Profile from './pages/Profile';
import EditProfile from './pages/EditProfile'; // Import the EditProfile page
import Dashboard from './pages/Dashboard';
import Header from './components/Header';
import PanelsList from "./pages/PanelsList";
import './styles/base.css';
import './styles/forms.css';
import './styles/lists.css';
import './styles/components.css';
import './styles/header.css';
import './styles/forecast.css';
import EditPanel from "./pages/EditPanel";
import ViewPanel from "./pages/ViewPanel";
import {AuthProvider} from './context/AuthContext';
import {ThemeProvider} from './context/ThemeContext';
import Forecast from "./pages/Forecast";
import ClusterList from "./pages/ClusterList";
import EditCluster from "./pages/EditCluster";
import NotFound from "./pages/NotFound";
import EditInverter from "./pages/EditInverter";
import './i18n';
import ViewCluster from "./pages/ViewCluster";
import ErrorPage from "./pages/ErrorPage";
import {ws_url} from "./config"; // Import the i18n configuration
import {useTranslation} from 'react-i18next';


const App: React.FC = () => {
    const {t} = useTranslation();
    // const wsClient = new WebSocketClient(ws_url);
    return (
        <ThemeProvider>
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
                        <Route path="/edit-profile/:id" element={<EditProfile/>}/>

                        <Route path="/dashboard" element={<Dashboard/>}/>
                        <Route path="/panelslist" element={<PanelsList/>}/>
                        <Route path="/clusterlist" element={<ClusterList/>}/>
                        <Route path="/add" element={<EditPanel/>}/>
                        <Route path="/add-panel" element={<EditPanel/>}/>

                        <Route path="/edit/:id" element={<EditPanel/>}/>
                        <Route path="/edit-panel/:id" element={<EditPanel/>}/>
                        <Route path="/add-user" element={<SignUp/>}/>
                        <Route path="/view-user/:id" element={<Profile/>}/>

                        <Route path="/add-cluster" element={<EditCluster/>}/>
                        <Route path="/add-inverter" element={<EditInverter/>}/>
                        <Route path="/edit-inverter/:id" element={<EditInverter/>}/>

                        <Route path="/edit-cluster/:id" element={<EditCluster/>}/>
                        <Route path="/view/:id" element={<ViewPanel/>}/> {/* View route */}
                        <Route path="/view-panel/:id" element={<ViewPanel/>}/> {/* View route */}

                        <Route path="/view-cluster/:id" element={<ViewCluster/>}/> {/* View route */}
                        <Route path="/error" element={<ErrorPage />} />

                        <Route path="/panel_forecast/:id" element={<GraphForecast/>}/>
                        <Route path="/bar_forecast/:id" element={<BarForecast/>}/>
                        <Route path="*" element={<NotFound/>}/>
                        </Routes>
                    </div>
                    <footer className="footer">
                        <p>{t('footer.copyright')}</p>
                    </footer>
                </Router>
            </AuthProvider>
        </ThemeProvider>
    );
};

export default App;
