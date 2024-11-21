import React, {useEffect, useState} from 'react';
import {MapContainer, Marker, Popup, TileLayer, useMap, useMapEvents} from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './MapComponent.css';
import '@fortawesome/fontawesome-free/css/all.css';

interface MapComponentProps {
    onLocationChange: (lat: number, lon: number) => void;
    address: {
        country: string;
        city: string;
        district: string;
    };
    onAddressChange: (address: { country: string; city: string; district: string }) => void;
    lat: number; // Required prop for initial latitude
    lon: number; // Required prop for initial longitude
}

const MapClickHandler: React.FC<{
    onLocationChange: (lat: number, lon: number) => void,
    onAddressChange: (address: { country: string; city: string; district: string }) => void
}> = ({onLocationChange, onAddressChange}) => {
    useMapEvents({
        click(e) {
            const lat = e.latlng.lat;
            const lng = e.latlng.lng;
            onLocationChange(lat, lng);

            const map = e.target;
            map.setView(e.latlng, map.getZoom());

            // Geocode the clicked location
            fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`)
                .then(response => response.json())
                .then(data => {
                    const address = data.address;
                    onAddressChange({
                        country: address.country || 'Unknown',
                        city: address.city || address.town || address.village || address.hamlet || 'Unknown',
                        district: address.state || address.county || 'Unknown'
                    });
                })
                .catch(error => console.error('Geocoding error:', error));
        },
    });
    return null;
};

// Custom marker icon using FontAwesome
const customIcon = L.divIcon({
    html: '<i class="fas fa-map-marker-alt fa-3x" style="color:red;"></i>',
    className: 'custom-marker-icon',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
});

const MoveMapToLocation: React.FC<{ lat: number, lng: number }> = ({lat, lng}) => {
    const map = useMap();
    map.setView([lat, lng], map.getZoom());
    return null;
};

const MapComponent: React.FC<MapComponentProps> = ({onLocationChange, address, onAddressChange, lat, lon}) => {
    const [position, setPosition] = useState<[number, number]>([lat, lon]); // Initialize with props lat and lon
    const [currentLocation, setCurrentLocation] = useState<[number, number] | null>(null);

    // Update position when props change
    useEffect(() => {
        setPosition([lat, lon]);
    }, [lat, lon]);

    const handleCurrentLocation = () => {
        navigator.geolocation.getCurrentPosition((position) => {
            const {latitude, longitude} = position.coords;
            setPosition([latitude, longitude]);
            setCurrentLocation([latitude, longitude]);
            onLocationChange(latitude, longitude);

            // Geocode the current location to get address details
            fetch(`https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`)
                .then(response => response.json())
                .then(data => {
                    const address = data.address;
                    onAddressChange({
                        country: address.country || 'Unknown',
                        city: address.city || address.town || address.village || address.hamlet || 'Unknown',
                        district: address.state || address.county || 'Unknown'
                    });
                })
                .catch(error => console.error('Geocoding error:', error));
        }, (error) => {
            console.error('Error getting current location:', error);
        });
    };

    return (
        <div className="map-card">
            <MapContainer center={position} zoom={13} className="map-container">
                <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                />
                <MapClickHandler onLocationChange={(lat, lng) => {
                    setPosition([lat, lng]);
                    onLocationChange(lat, lng);
                }} onAddressChange={onAddressChange}/>
                <Marker position={position} icon={customIcon}>
                    <Popup>
                        Selected Location<br/>
                        Latitude: {position[0]}<br/>
                        Longitude: {position[1]}
                    </Popup>
                </Marker>
                {currentLocation && <MoveMapToLocation lat={currentLocation[0]} lng={currentLocation[1]}/>}
            </MapContainer>
            <button onClick={handleCurrentLocation} className="edit-button current-location-button">
                Current Location
            </button>
        </div>
    );
};

export default MapComponent;
