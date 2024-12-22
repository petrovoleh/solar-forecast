import React, { useEffect, useState } from 'react';
import { MapContainer, Marker, Popup, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import '@fortawesome/fontawesome-free/css/all.css';
import { useTranslation } from 'react-i18next';
import {backend_url} from "../config";

interface MapComponentProps {
    onLocationChange: (lat: number, lon: number) => void;
    address: {
        country: string;
        city: string;
        district: string;
    };
    onAddressChange: (address: { country: string; city: string; district: string }) => void;
    lat: number; // Initial latitude
    lon: number; // Initial longitude
    disabled?: boolean; // Disable map interactions
}

const MapClickHandler: React.FC<{

    onLocationChange: (lat: number, lon: number) => void;
    onAddressChange: (address: { country: string; city: string; district: string }) => void;
    disabled?: boolean;
}> = ({ onLocationChange, onAddressChange, disabled }) => {

    useMapEvents({
        click(e) {
            if (disabled) return;

            const lat = e.latlng.lat;
            const lng = e.latlng.lng;
            onLocationChange(lat, lng);

            // Geocode the clicked location
            fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`)
                .then((response) => response.json())
                .then((data) => {
                    const address = data.address;
                    onAddressChange({
                        country: address.country || 'Unknown',
                        city: address.city || address.town || address.village || address.hamlet || 'Unknown',
                        district: address.state || address.county || 'Unknown',
                    });
                })
                .catch((error) => console.error('Geocoding error:', error));
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

const MoveMapToLocation: React.FC<{ lat: number; lng: number }> = ({ lat, lng }) => {
    const map = useMap();

    // Fly to the new location with animation
    useEffect(() => {
        map.flyTo([lat, lng], map.getZoom());
    }, [lat, lng, map]);

    return null;
};

const MapComponent: React.FC<MapComponentProps> = ({
                                                       onLocationChange,
                                                       address,
                                                       onAddressChange,
                                                       lat,
                                                       lon,
                                                       disabled = false,
                                                   }) => {
    const [position, setPosition] = useState<[number, number]>([lat, lon]); // Initialize with props lat and lon
    const [currentLocation, setCurrentLocation] = useState<[number, number] | null>(null);
    const { t } = useTranslation();

    // Update position when props change
    useEffect(() => {
        setPosition([lat, lon]);
    }, [lat, lon]);
    const handleProfileLocation = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${backend_url}/api/user/profile`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                throw new Error('Failed to fetch profile');
            }

            const data = await response.json();

            if (data.location ) {
                onAddressChange({
                    country: data.location.country || 'Unknown',
                    city: data.location.city || 'Unknown',
                    district: data.location.district || 'Unknown',
                })
                const { lat, lon } = data.location;
                if (lat && lon ) {
                    onLocationChange(lat, lon)
                }
            }


        } catch (err) {
            console.error(err)
        }
    };
    const handleCurrentLocation = () => {
        if (disabled) return;

        navigator.geolocation.getCurrentPosition(
            (position) => {
                const { latitude, longitude } = position.coords;
                setPosition([latitude, longitude]);
                setCurrentLocation([latitude, longitude]);
                onLocationChange(latitude, longitude);

                // Geocode the current location to get address details
                fetch(`https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`)
                    .then((response) => response.json())
                    .then((data) => {
                        const address = data.address;
                        onAddressChange({
                            country: address.country || 'Unknown',
                            city: address.city || address.town || address.village || address.hamlet || 'Unknown',
                            district: address.state || address.county || 'Unknown',
                        });
                    })
                    .catch((error) => console.error('Geocoding error:', error));
            },
            (error) => {
                console.error('Error getting current location:', error);
            }
        );
    };

    return (
        <div className={`map-card ${disabled ? 'map-disabled' : ''}`}>
            <MapContainer center={position} zoom={13} className="map-container">
                <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                />
                <MapClickHandler
                    onLocationChange={(lat, lng) => {
                        if (!disabled) {
                            setPosition([lat, lng]);
                            onLocationChange(lat, lng);
                        }
                    }}
                    onAddressChange={onAddressChange}
                    disabled={disabled}
                />
                <Marker position={position} icon={customIcon}>
                    <Popup>
                        Selected Location<br/>
                        Latitude: {position[0]}<br/>
                        Longitude: {position[1]}
                    </Popup>
                </Marker>
                {/* Automatically move map when the position changes */}
                <MoveMapToLocation lat={position[0]} lng={position[1]}/>
            </MapContainer>
            <button
                onClick={handleCurrentLocation}
                className="edit-button current-location-button"
                disabled={disabled}
            >
                {t('addPanel.currentLocation')}
            </button>
            <button
                onClick={handleProfileLocation}
                className="edit-button current-location-button margin10"
            >
                {t('addPanel.profileLocation')}
            </button>
        </div>
    );
};

export default MapComponent;
