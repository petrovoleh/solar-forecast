export interface LocationDetails {
    country: string;
    city: string;
    district: string;
}

export interface Coordinates {
    lat: number;
    lon: number;
}

export type LocationData = LocationDetails & Coordinates;
