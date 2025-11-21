import axios from 'axios';

// Create axios instance with default config
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000/api',
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Important for cookies
});

// Add a response interceptor to handle common errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // You can handle global errors here (e.g., 401 Unauthorized -> redirect to login)
    // For now, we just reject the promise so the calling component can handle it
    return Promise.reject(error);
  }
);

export default api;
