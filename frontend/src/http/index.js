import axios from 'axios';

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL,
    withCredentials: true,
    headers: {
        'Content-type': 'application/json',
        Accept: 'application/json',
    },
});


api.interceptors.response.use(
    (config) => {
        return config;
    },
    async (error) => {
        const originalRequest = error.config;
        if (
            error.response?.status === 401 &&
            originalRequest &&
            !originalRequest.isRetry
        ) {
            originalRequest.isRetry = true;
            try {
                await axios.get(
                    `${import.meta.env.VITE_API_URL}/api/refresh`,
                    {
                        withCredentials: true,
                    }
                );

                return api.request(originalRequest);
            } catch (err) {
                console.log(err.message);
            }
        }
        throw error;
    }
);


// List of all the endpoints
export const sendOtp = (data) => api.post('/api/send-otp', data);
export const verifyOtp = (data) => api.post('/api/verify-otp', data);
export const activate = (data) =>
    api.post('/api/activate', data, {
        headers: {
            'Content-Type': 'multipart/form-data',
        },
    });
export const logout = () =>api.post("/api/logout");
export const createRoom = (data) => api.post('/api/rooms', data);
export const getAllRooms = () => api.get('/api/rooms');
export const searchRooms = (query) =>
    api.get('/api/rooms/search', { params: { query } });
export const getRoom = (roomId) => api.get(`/api/rooms/${roomId}`);

export const getProfile = (userId) => api.get(`/api/profile/${userId}`);

export const followUser = (userId) => api.post(`/api/follow/${userId}`);

export const unfollowUser = (userId) => api.post(`/api/unfollow/${userId}`);

export const searchUsers = (query) =>
    api.get('/api/search', { params: { query } });

export const updateProfile = (formData) =>
    api.put('/api/profile', formData, {
        transformRequest: [
            (data, headers) => {
                delete headers['Content-Type'];
                return data;
            },
        ],
    });

export default api;
