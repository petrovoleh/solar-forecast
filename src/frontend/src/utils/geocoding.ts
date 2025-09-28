import {LocationDetails} from '../types/location';

export const reverseGeocode = async (lat: number, lon: number): Promise<LocationDetails> => {
    const response = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`);
    const data = await response.json();
    const address = data.address ?? {};

    return {
        country: address.country || 'Unknown',
        city: address.city || address.town || address.village || address.hamlet || 'Unknown',
        district: address.state || address.county || 'Unknown',
    };
};
