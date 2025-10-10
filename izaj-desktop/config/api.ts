const API_URL: string =
  import.meta.env.MODE === 'development'
    ? 'http://localhost:3001'
    : 'https://izaj-backend.onrender.com';

export default API_URL;
