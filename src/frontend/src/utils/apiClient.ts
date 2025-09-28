export const getAuthToken = (): string | null => localStorage.getItem('token');

const mergeHeaders = (base?: HeadersInit, extra?: HeadersInit): HeadersInit => {
    const headers = new Headers(base || {});
    if (extra) {
        const extraHeaders = new Headers(extra);
        extraHeaders.forEach((value, key) => headers.set(key, value));
    }
    return headers;
};

export const parseResponseBody = async <T>(response: Response): Promise<T | string | null> => {
    const contentType = response.headers.get('Content-Type') ?? '';

    if (contentType.includes('application/json')) {
        return (await response.json()) as T;
    }

    if (contentType.includes('text/')) {
        return await response.text();
    }

    return null;
};

interface ApiRequestOptions extends RequestInit {
    auth?: boolean;
    parseResponse?: boolean;
}

interface ApiRequestResult<T> {
    response: Response;
    data: T | string | null;
}

export const apiRequest = async <T = unknown>(
    url: string,
    {auth = false, parseResponse = true, headers, ...init}: ApiRequestOptions = {},
): Promise<ApiRequestResult<T>> => {
    const finalHeaders = auth
        ? mergeHeaders(headers, {Authorization: `Bearer ${getAuthToken() ?? ''}`})
        : headers;

    const response = await fetch(url, {...init, headers: finalHeaders});
    const data = parseResponse ? await parseResponseBody<T>(response) : null;

    return {response, data};
};

export const requireOk = async <T = unknown>(
    request: Promise<ApiRequestResult<T>>,
): Promise<T> => {
    const {response, data} = await request;

    if (!response.ok) {
        const errorMessage = typeof data === 'string' && data
            ? data
            : response.statusText || 'Request failed';
        throw new Error(errorMessage);
    }

    return data as T;
};
