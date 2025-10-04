import React, {useEffect, useState} from 'react';
import {MapContainer, Marker, Popup, TileLayer, useMap, useMapEvents} from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import '@fortawesome/fontawesome-free/css/all.css';
import {useTranslation} from 'react-i18next';
import {backend_url} from "../config";
import {LocationData, LocationDetails} from '../types/location';
import {reverseGeocode} from '../utils/geocoding';
import {apiRequest, requireOk} from '../utils/apiClient';

interface MapComponentProps {
    onLocationChange: (lat: number, lon: number) => void;
    address: LocationDetails;
    onAddressChange: (address: LocationDetails) => void;
    lat: number; // Initial latitude
    lon: number; // Initial longitude
    disabled?: boolean; // Disable map interactions
}

const MapClickHandler: React.FC<{
    onLocationChange: (lat: number, lon: number) => void;
    onAddressChange: (address: LocationDetails) => void;
    disabled?: boolean;
}> = ({onLocationChange, onAddressChange, disabled}) => {
    useMapEvents({
        click(e) {
            if (disabled) return;

            const lat = e.latlng.lat;
            const lng = e.latlng.lng;
            onLocationChange(lat, lng);

            reverseGeocode(lat, lng)
                .then(onAddressChange)
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

const MoveMapToLocation: React.FC<{ lat: number; lng: number }> = ({lat, lng}) => {
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
    const {t} = useTranslation();

    // Update position when props change
    useEffect(() => {
        setPosition([lat, lon]);
    }, [lat, lon]);
    const handleProfileLocation = async () => {
        try {
            const data = await requireOk<{ location?: Partial<LocationData> }>(
                apiRequest(`${backend_url}/api/user/profile`, {auth: true}),
            );

            if (data.location) {
                const {lat: profileLat, lon: profileLon, ...profileAddress} = data.location;

                onAddressChange({
                    country: profileAddress.country || 'Unknown',
                    city: profileAddress.city || 'Unknown',
                    district: profileAddress.district || 'Unknown',
                });

                if (profileLat && profileLon) {
                    onLocationChange(profileLat, profileLon);
                }
            }
        } catch (err) {
            console.error(err);
        }
    };
    const handleCurrentLocation = () => {
        if (disabled) return;

        navigator.geolocation.getCurrentPosition(
            (position) => {
                const {latitude, longitude} = position.coords;
                setPosition([latitude, longitude]);
                onLocationChange(latitude, longitude);

                // Geocode the current location to get address details
                reverseGeocode(latitude, longitude)
                    .then(onAddressChange)
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
                className="primary-button edit-button current-location-button"
                disabled={disabled}
            >
                {t('addPanel.currentLocation')}
            </button>
            <button
                onClick={handleProfileLocation}
                className="primary-button edit-button current-location-button margin10"
            >
                {t('addPanel.profileLocation')}
            </button>
        </div>
    );
};

export default MapComponent;
