// export const backend_url = 'http://193.219.91.103:2300';
// export const ws_url = 'ws://193.219.91.103:13415/ws'


export const backend_url = process.env.REACT_APP_BACKEND_URL || "http://localhost:8080";
export const ws_url = process.env.REACT_APP_WS_URL || "";
