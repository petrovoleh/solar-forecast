import React, {useState} from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import Home from './pages/Home';
import SignIn from './pages/SignIn';
import SignUp from './pages/SignUp';
import Profile from './pages/Profile';
import EditProfile from './pages/EditProfile';  // Import the EditProfile page
import Dashboard from './pages/Dashboard';
import Header from './components/Header';
import PanelsList from "./pages/PanelsList";
import "./App.css"
import AddPanel from "./pages/AddPanel";
import ViewPanel from "./pages/ViewPanel";
import { AuthProvider } from './context/AuthContext';
import Forecast from "./pages/Forecast";
interface SolarPanel {
    id: number;
    name: string;
    description: string;
    size: string;
    energyOutputNow: string;
    energyOutputMonth: string;
    location: string;
}

const samplePanels: SolarPanel[] = [
    {
        id: 1,
        name: "Solar Panel 1",
        description: "High efficiency solar panel",
        size: "2x1 meters",
        energyOutputNow: "500W",
        energyOutputMonth: "300kWh",
        location: "New York, USA",
    },
    {
        id: 2,
        name: "Solar Panel 2",
        description: "Eco-friendly panel",
        size: "1.8x1 meters",
        energyOutputNow: "400W",
        energyOutputMonth: "250kWh",
        location: "Los Angeles, USA",
    },
];

const App: React.FC = () => {
    const [panels, setPanels] = useState(samplePanels);

    return (
        <AuthProvider>
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
                        <Route path="/add" element={<AddPanel/>}/>
                        {/*<Route path="/edit/:id" element={<AddPanel panels={panels} setPanels={setPanels}/>}/>*/}
                        <Route path="/view/:id" element={<ViewPanel/>}/> {/* View route */}

                    </Routes>
                </div>
                <footer className="footer">
                    <p>© 2024 Oleh Petrov | Vilnius University</p>

                </footer>
            </Router>
        </AuthProvider>
    );
};

export default App;
