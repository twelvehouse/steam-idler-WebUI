import axios from 'axios';
import { ref } from 'vue';

// Reactive counter for active API requests
export const activeRequests = ref(0);

// When using Vite's proxy, the base URL should be the path that Vite will intercept.
// The Vite dev server will then forward requests from /api to http://localhost:3000/api.
const API_BASE_URL = '/api'; 

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptors to track request status
apiClient.interceptors.request.use(
  (config) => {
    activeRequests.value++;
    return config;
  },
  (error) => {
    activeRequests.value--;
    return Promise.reject(error);
  }
);

apiClient.interceptors.response.use(
  (response) => {
    activeRequests.value--;
    return response;
  },
  (error) => {
    activeRequests.value--;
    return Promise.reject(error);
  }
);

export default {
  getStatus() {
    return apiClient.get('/status');
  },
  getLogs() {
    return apiClient.get('/logs', { responseType: 'text' }); // Expect plain text for logs
  },
  getOwnedGames(accountName) {
    return apiClient.get(`/steam/owned_games?accountName=${accountName}`);
  },
  getCardDrops(accountName) {
    return apiClient.get(`/steam/card_drops?accountName=${accountName}`);
  },
  getGamesConfig() {
    return apiClient.get('/config/games');
  },
  updateGamesConfig(newConfigPayload) { // newConfigPayload should be like { playingGames: [...] }
    return apiClient.post('/config/games', newConfigPayload);
  },
};
