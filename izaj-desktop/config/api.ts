const API_URL: string =
  import.meta.env.NODE_ENV || 
  (import.meta.env.MODE === 'development'
    ? 'http://localhost:3001'
    : 'https://izaj-desktop-application-production.up.railway.app');

export default API_URL;
