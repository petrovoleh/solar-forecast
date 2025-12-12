import {LocationData} from '../types/location';

export const DEFAULT_LOCATION: LocationData = {
    lat: 54.7405,
    lon: 25.2637,
    city: 'Vilnius',
    district: 'Didlaukio g. 49',
    country: 'Lithuania',
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
