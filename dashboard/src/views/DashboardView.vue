<template>
  <div class="dashboard-view">
    <h1>Bot Status Dashboard</h1>

    <div class="controls-header">
      <button @click="handleManualRefresh" :disabled="loading.bots">
        {{ loading.bots && !autoRefreshEnabled ? 'Refreshing...' : 'Refresh All Statuses' }}
      </button>
      <label class="auto-refresh-label">
        <input type="checkbox" v-model="autoRefreshEnabled" />
        Auto-refresh status every {{ REFRESH_INTERVAL / 1000 }} seconds
      </label>
    </div>

    <!-- Removed local error display for error.bots, will use global -->
    <div v-if="loading.bots && !bots.length" class="loading-message">Loading bot statuses...</div>

    <table v-if="bots.length">
      <thead>
        <tr>
          <th>Account Name</th>
          <th>Status</th>
          <th>Idling Games (AppIDs)</th>
          <th>Session Time</th>
          <th>Proxy</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        <template v-for="bot in bots" :key="bot.accountName">
          <tr>
            <td>{{ bot.accountName }}</td>
            <td>
              <span :class="['status-indicator', bot.isBotRunning ? 'running' : 'stopped']">
                {{ bot.isBotRunning ? 'Running' : 'Stopped' }}
              </span>
            </td>
            <td>{{ bot.playedAppIDs && bot.playedAppIDs.length ? bot.playedAppIDs.join(', ') : 'N/A' }}</td>
            <td>{{ formatTimeElapsed(bot.startedPlayingTimestamp, bot.isBotRunning) }}</td>
            <td>{{ bot.proxy || 'N/A' }}</td>
            <td>
              <button @click="fetchExtraData(bot)" :disabled="bot.loadingExtraData">
                {{ bot.loadingExtraData ? 'Loading...' : 'Load Playtime' }}
              </button>
              <button @click="toggleExtraDataVisibility(bot)" v-if="bot.ownedGamesData || bot.errorExtraData">
                {{ bot.showExtraData ? 'Hide' : 'Show' }} Details
              </button>
            </td>
          </tr>
          <tr v-if="bot.showExtraData && (bot.ownedGamesData || bot.loadingExtraData || bot.errorExtraData)" class="extra-data-row">
            <td colspan="6">
              <div v-if="bot.loadingExtraData" class="loading-message">Loading details for {{ bot.accountName }}...</div>
              <div v-if="bot.ownedGamesData" class="owned-games-section">
                <h4>Owned Games ({{ bot.ownedGamesData.length || 0 }})</h4>
                <ul v-if="bot.ownedGamesData && bot.ownedGamesData.length">
                  <li v-for="game in getTopPlayedGames(bot.ownedGamesData)" :key="game.appid">
                    <img v-if="game.img_icon_url" :src="game.img_icon_url" :alt="game.name + ' icon'" class="game-icon"/>
                    {{ game.name }} - {{ formatPlaytime(game.playtime_forever) }}
                  </li>
                </ul>
                <p v-else>No game data available or profile might be private.</p>
              </div>
            </td>
          </tr>
        </template>
      </tbody>
    </table>
    <p v-if="!loading.bots && !bots.length && !localErrorBots">No bots found or running.</p> <!-- Check localErrorBots -->
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, reactive, watch } from 'vue';
import api from '@/services/api';
import { setError, clearError, setSuccess } from '@/stores/errorStore'; 

const bots = ref([]);
const loading = reactive({
  bots: false,
});
let localErrorBots = null; 

const autoRefreshEnabled = ref(false);
const autoRefreshIntervalId = ref(null);
const REFRESH_INTERVAL = 15000; 

function formatTimeElapsed(timestamp, isRunning) {
  if (!isRunning || !timestamp) {
    return 'N/A';
  }
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  let interval = Math.floor(seconds / 31536000);
  if (interval >= 1) return interval + " year" + (interval > 1 ? "s" : "");
  interval = Math.floor(seconds / 2592000);
  if (interval >= 1) return interval + " month" + (interval > 1 ? "s" : "");
  interval = Math.floor(seconds / 86400);
  if (interval >= 1) return interval + " day" + (interval > 1 ? "s" : "");
  interval = Math.floor(seconds / 3600);
  if (interval >= 1) return interval + " hour" + (interval > 1 ? "s" : "");
  interval = Math.floor(seconds / 60);
  if (interval >= 1) return interval + " minute" + (interval > 1 ? "s" : "");
  return Math.floor(seconds) + " second" + (seconds !== 1 ? "s" : "");
}

function formatPlaytime(minutes) {
  if (typeof minutes !== 'number' || minutes < 0) return 'N/A';
  if (minutes === 0) return '0 minutes';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  let result = '';
  if (h > 0) result += `${h} hour${h > 1 ? 's' : ''} `;
  if (m > 0 || h === 0) result += `${m} minute${m > 1 ? 's' : ''}`;
  return result.trim();
}

async function fetchAllStatuses(isManualRefresh = false) {
  loading.bots = true;
  clearError(); 
  localErrorBots = null;

  const oldBotsMap = new Map();
  if (!isManualRefresh) { 
    bots.value.forEach(bot => {
      oldBotsMap.set(bot.accountName, {
        ownedGamesData: bot.ownedGamesData,
        cardDropsData: bot.cardDropsData,
        loadingExtraData: bot.loadingExtraData, 
        errorExtraData: bot.errorExtraData, 
        showExtraData: bot.showExtraData,
      });
    });
  }

  try {
    const response = await api.getStatus();
    const newStatusData = response.data;

    bots.value = newStatusData.map(newBotStatus => {
      const preservedData = oldBotsMap.get(newBotStatus.accountName);
      return {
        ...newBotStatus, 
        ownedGamesData: preservedData?.ownedGamesData || null,
        cardDropsData: preservedData?.cardDropsData || null,
        loadingExtraData: preservedData?.loadingExtraData || false,
        errorExtraData: preservedData?.errorExtraData || null, 
        showExtraData: preservedData?.showExtraData || false,
      };
    });
    if (isManualRefresh) setSuccess("Bot statuses refreshed.", 2000);

  } catch (err) {
    console.error('Failed to load bot statuses:', err);
    const message = err.response?.data?.message || err.message || 'Failed to load bot statuses. Ensure the backend is running.';
    setError(message);
    localErrorBots = message; 
  } finally {
    loading.bots = false;
  }
}

function handleManualRefresh() {
    if (autoRefreshIntervalId.value) {
        clearInterval(autoRefreshIntervalId.value);
        autoRefreshIntervalId.value = null;
    }
    fetchAllStatuses(true); 
    if (autoRefreshEnabled.value) {
        autoRefreshIntervalId.value = setInterval(() => fetchAllStatuses(false), REFRESH_INTERVAL);
    }
}

watch(autoRefreshEnabled, (newValue) => {
  if (newValue) {
    if (autoRefreshIntervalId.value) clearInterval(autoRefreshIntervalId.value); 
    if (!loading.bots) {
        fetchAllStatuses(false); 
    }
    autoRefreshIntervalId.value = setInterval(() => fetchAllStatuses(false), REFRESH_INTERVAL);
  } else {
    if (autoRefreshIntervalId.value) {
      clearInterval(autoRefreshIntervalId.value);
      autoRefreshIntervalId.value = null;
    }
  }
}, { immediate: false }); 

async function fetchExtraData(bot) {
  if (!bot) return;

  bot.loadingExtraData = true;
  bot.errorExtraData = null;
  clearError();

  try {
    const ownedGamesResponse = await api.getOwnedGames(bot.accountName);

    if (ownedGamesResponse) {
      bot.ownedGamesData = ownedGamesResponse.data;
    } else {
      bot.ownedGamesData = null;
      bot.errorExtraData = 'Failed to load owned games.';
    }

    if (!bot.errorExtraData) bot.showExtraData = true;
    else if (bot.ownedGamesData) bot.showExtraData = true;

    setSuccess(`Details loaded for ${bot.accountName}`, 2000);
  } catch (err) {
    console.error(`Unexpected error fetching extra data for ${bot.accountName}:`, err);
    const message = `Unexpected error fetching details for ${bot.accountName}.`;
    setError(message);
    bot.errorExtraData = message;
  } finally {
    bot.loadingExtraData = false;
  }
}

function toggleExtraDataVisibility(bot) {
  bot.showExtraData = !bot.showExtraData;
}

function getTopPlayedGames(gamesArray, count = 5) { // gamesArray is now directly the array of games
  if (!gamesArray || !gamesArray.length) return [];
  return [...gamesArray].sort((a, b) => b.playtime_forever - a.playtime_forever).slice(0, count);
}

function getGameNameById(ownedGamesArray, appid) { // ownedGamesArray is now directly the array of games
  if (!ownedGamesArray || !ownedGamesArray.length || !appid) return null;
  const game = ownedGamesArray.find(g => g.appid === appid);
  return game ? game.name : null;
}

onMounted(() => {
    fetchAllStatuses(true); 
});

onUnmounted(() => {
  if (autoRefreshIntervalId.value) {
    clearInterval(autoRefreshIntervalId.value);
  }
});
</script>

<style scoped>
.dashboard-view {
  padding: 20px;
  font-family: sans-serif;
}

.controls-header {
  margin-bottom: 20px;
  display: flex;
  align-items: center;
  gap: 20px; /* Spacing between button and checkbox */
}

.auto-refresh-label {
  display: flex;
  align-items: center;
  cursor: pointer;
}
.auto-refresh-label input {
  margin-right: 8px;
}


table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 20px;
}

th, td {
  border: 1px solid #ddd;
  padding: 10px;
  text-align: left;
}

th {
  background-color: #f4f4f4;
}

.loading-message {
  color: #555;
  font-style: italic;
  padding: 10px 0;
}

/* Removed local .error-message class as global handler is used */

.status-indicator {
  padding: 3px 7px;
  border-radius: 4px;
  color: white;
  font-weight: bold;
}
.status-indicator.running {
  background-color: #28a745; /* Green */
}
.status-indicator.stopped {
  background-color: #dc3545; /* Red */
}

button {
  margin-right: 5px;
  padding: 8px 12px; /* Adjusted padding */
  border: 1px solid #ccc;
  background-color: #f8f8f8;
  cursor: pointer;
  border-radius: 4px;
  font-size: 0.9em; /* Slightly smaller font */
}
button:hover {
  background-color: #e9e9e9;
}
button:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

.extra-data-row td {
  background-color: #f9f9f9;
  padding: 15px;
}

.owned-games-section, .card-drops-section {
  margin-bottom: 15px;
  padding: 10px;
  border: 1px solid #eee;
  background-color: #fff;
}
.owned-games-section h4, .card-drops-section h4 {
  margin-top: 0;
  color: #333;
}

.owned-games-section ul, .card-drops-section ul {
  list-style-type: none;
  padding-left: 0;
}
.owned-games-section li, .card-drops-section li {
  padding: 5px 0;
  border-bottom: 1px dashed #eee;
}
.owned-games-section li:last-child, .card-drops-section li:last-child {
  border-bottom: none;
}

.game-icon {
  width: 32px; 
  height: 32px;
  margin-right: 8px;
  vertical-align: middle;
}
</style>
