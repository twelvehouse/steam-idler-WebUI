<template>
  <div class="logs-view">
    <h1>Application Logs</h1>

    <div class="controls">
      <button @click="handleFetchLogs" :disabled="isLoading">
        {{ isLoading && !autoRefreshEnabled ? 'Refreshing...' : 'Refresh Logs' }}
      </button>
      <label class="auto-refresh-label">
        <input type="checkbox" v-model="autoRefreshEnabled" />
        Auto-refresh every {{ REFRESH_INTERVAL / 1000 }} seconds
      </label>
    </div>

    <div v-if="isLoading && logs === ''" class="loading-message">Loading logs...</div>
    <!-- Removed local error display, will use global -->
    
    <pre v-if="logs" class="logs-container">{{ logs }}</pre>
    <div v-if="!isLoading && !logs && !localError" class="no-logs-message">No logs available or logs are empty.</div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch } from 'vue';
import api from '@/services/api';
import { setError, clearError, setSuccess } from '@/stores/errorStore';

const logs = ref('');
const isLoading = ref(false);
// const error = ref(null); // Replaced by global handler
let localError = null; // For internal logic if needed
const autoRefreshEnabled = ref(false);
const autoRefreshIntervalId = ref(null);
const REFRESH_INTERVAL = 10000; // 10 seconds

async function fetchLogs(isAutoRefresh = false) {
  isLoading.value = true;
  if (!isAutoRefresh) clearError(); // Clear global error for manual refresh or initial load
  localError = null;

  try {
    const response = await api.getLogs();
    logs.value = response.data; 
    if (!isAutoRefresh) setSuccess('Logs loaded successfully.', 2000);
  } catch (err) {
    console.error('Failed to load logs:', err);
    const message = err.response?.data?.message || err.message || 'Failed to load logs. Ensure the backend is running and the log file exists.';
    setError(message);
    localError = message;
  } finally {
    isLoading.value = false;
  }
}

function handleFetchLogs() {
    // This function is for the manual refresh button
    if (autoRefreshIntervalId.value) {
        // If auto-refresh is on, fetching manually shouldn't stop it,
        // but we might want to reset the timer.
        // For simplicity, we'll just fetch. The auto-refresh will continue.
    }
    fetchLogs(false);
}

watch(autoRefreshEnabled, (newValue) => {
  if (newValue) {
    if (autoRefreshIntervalId.value) { 
        clearInterval(autoRefreshIntervalId.value);
    }
    autoRefreshIntervalId.value = setInterval(() => fetchLogs(true), REFRESH_INTERVAL);
    if (!isLoading.value) {
        fetchLogs(true); // Fetch immediately when auto-refresh is enabled
    }
  } else {
    if (autoRefreshIntervalId.value) {
      clearInterval(autoRefreshIntervalId.value);
      autoRefreshIntervalId.value = null;
    }
  }
});

onMounted(() => {
  fetchLogs(false); // Initial fetch
});

onUnmounted(() => {
  if (autoRefreshIntervalId.value) {
    clearInterval(autoRefreshIntervalId.value); 
  }
});
</script>

<style scoped>
.logs-view {
  padding: 20px;
  font-family: sans-serif;
}

.controls {
  margin-bottom: 15px;
  display: flex;
  align-items: center;
}

.controls button {
  padding: 8px 15px;
  border: 1px solid #ccc;
  background-color: #f0f0f0;
  cursor: pointer;
  border-radius: 4px;
  margin-right: 15px;
}
.controls button:hover {
  background-color: #e0e0e0;
}
.controls button:disabled {
  cursor: not-allowed;
  opacity: 0.7;
}

.auto-refresh-label {
  display: flex;
  align-items: center;
  cursor: pointer;
}
.auto-refresh-label input {
  margin-right: 8px;
}

.loading-message {
  color: #555;
  font-style: italic;
  padding: 10px 0;
}

/* Removed local .error-message class */

.no-logs-message {
  color: #777;
  font-style: italic;
  padding: 10px 0;
}

.logs-container {
  background-color: #f4f4f4;
  border: 1px solid #ddd;
  padding: 15px;
  white-space: pre-wrap; 
  word-wrap: break-word; 
  max-height: 600px; 
  overflow-y: auto; 
  font-family: 'Courier New', Courier, monospace; 
  font-size: 0.9em;
  border-radius: 4px;
}
</style>
