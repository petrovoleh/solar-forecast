import {LocationData} from '../types/location';

export const DEFAULT_LOCATION: LocationData = {
    lat: 54.6872,
    lon: 25.2797,
    city: '',
    district: '',
    country: '',
};

export const mergeLocation = (
    current: Partial<LocationData> | undefined,
    updates: Partial<LocationData>,
): LocationData => ({
    ...DEFAULT_LOCATION,
    ...current,
    ...updates,
});

export const updateLocationState = <T extends { location?: Partial<LocationData> }>(
    state: T,
    updates: Partial<LocationData>,
): T => ({
    ...state,
    location: mergeLocation(state.location, updates),
});
