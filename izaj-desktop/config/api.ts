const API_URL: string =
  import.meta.env.VITE_API_URL || 
  (import.meta.env.MODE === 'development'
    ? 'http://localhost:3001'
    : 'https://izaj-desktop-application.onrender.com');

export default API_URL;
