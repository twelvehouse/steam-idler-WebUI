<template>
  <div class="manage-games-view">
    <h1>Manage Games Configuration</h1>

    <!-- Display Current Configuration -->
    <section class="config-section">
      <h2>Current Configuration</h2>
      <div v-if="isLoadingConfig" class="loading-message">Loading current configuration...</div>
      <!-- Removed local configError display -->
      <pre v-if="currentConfigDisplay" class="current-config-display">{{ currentConfigDisplay }}</pre>
      <p v-if="!isLoadingConfig && !currentConfigDisplay && !localConfigError">No configuration loaded or configuration is empty.</p>
    </section>

    <!-- Edit Configuration -->
    <section class="config-section">
      <h2>Edit Configuration</h2>
      <p class="instructions">
        Enter the new 'playingGames' configuration below.
        This can be an array of AppIDs or game names (e.g., <code>[730, "Custom Game"]</code>)
        or an object for per-account settings (e.g., <code>{"account1": [730], "account2": [440, "Another Game"]}</code>).
      </p>
      <textarea v-model="newConfigInput" rows="10" placeholder="Enter new games configuration as JSON..."></textarea>
      <button @click="saveConfiguration" :disabled="isSaving" class="save-button">
        {{ isSaving ? 'Saving...' : 'Save Configuration' }}
      </button>
      <!-- Removed local saveStatus display -->
    </section>

    <!-- Fetch and Display Owned Games -->
    <section class="config-section">
      <h2>Helper: Add Games by AppID</h2>
      <div class="owned-games-fetch">
        <input type="text" v-model="selectedAccountName" placeholder="Enter Account Name" />
        <button @click="fetchOwnedGames" :disabled="isLoadingOwnedGames || !selectedAccountName">
          {{ isLoadingOwnedGames ? 'Loading Games...' : 'Load Owned Games for Account' }}
        </button>
      </div>
      <div v-if="isLoadingOwnedGames && !ownedGamesList.length" class="loading-message">Loading owned games...</div>
      <!-- Removed local ownedGamesError display -->
      
      <div v-if="ownedGamesList.length > 0" class="owned-games-list">
        <h3>Owned Games for {{ displayedAccountName }}: ({{ ownedGamesList.length }})</h3>
        <p class="instructions">Click on a game to attempt to add its AppID to the configuration editor.</p>
        <ul>
          <li v-for="game in sortedOwnedGames" :key="game.appid" @click="addGameIdToConfig(game.appid)" class="game-item">
            <img v-if="game.img_icon_url" :src="game.img_icon_url" :alt="game.name + ' icon'" class="game-icon"/>
            <span>{{ game.name }} (AppID: {{ game.appid }}) - {{ formatPlaytime(game.playtime_forever) }}</span>
          </li>
        </ul>
      </div>
      <p v-if="!isLoadingOwnedGames && ownedGamesList.length === 0 && displayedAccountName && !localOwnedGamesError">
        No games found for account '{{ displayedAccountName }}' or profile is private.
      </p>
    </section>

  </div>
</template>

<script setup>
import { ref, onMounted, reactive, computed } from 'vue';
import api from '@/services/api';
import { setError, setSuccess, setInfo, clearError } from '@/stores/errorStore'; // Added setInfo

// Configuration state
const currentConfigDisplay = ref('');
const currentConfigRaw = ref(null); 
const newConfigInput = ref('');
const isLoadingConfig = ref(false);
let localConfigError = null; 

// Saving state
const isSaving = ref(false);

// Owned games state
const selectedAccountName = ref('');
const displayedAccountName = ref(''); 
const ownedGamesList = ref([]);
const isLoadingOwnedGames = ref(false);
let localOwnedGamesError = null; 

// --- Helper Functions ---
function formatPlaytime(minutes) {
  if (typeof minutes !== 'number' || minutes < 0) return 'N/A';
  if (minutes === 0) return '0m';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  let result = '';
  if (h > 0) result += `${h}h `;
  if (m > 0 || h === 0) result += `${m}m`;
  return result.trim();
}

const sortedOwnedGames = computed(() => {
  return [...ownedGamesList.value].sort((a, b) => b.playtime_forever - a.playtime_forever);
});

// --- Core Logic ---
async function fetchCurrentConfig() {
  isLoadingConfig.value = true;
  clearError();
  localConfigError = null;

  try {
    const response = await api.getGamesConfig();
    currentConfigRaw.value = response.data.playingGames;
    const prettyConfig = JSON.stringify(response.data.playingGames, null, 2);
    currentConfigDisplay.value = prettyConfig;
    newConfigInput.value = prettyConfig; 
  } catch (err) {
    console.error('Failed to load current games configuration:', err);
    const message = err.response?.data?.message || err.message || 'Failed to load current configuration.';
    setError(message);
    localConfigError = message;
    currentConfigDisplay.value = 'Error loading configuration.';
    newConfigInput.value = '{}'; 
  } finally {
    isLoadingConfig.value = false;
  }
}

async function saveConfiguration() {
  isSaving.value = true;
  clearError();
  let parsedConfig;

  try {
    parsedConfig = JSON.parse(newConfigInput.value);
  } catch (parseErr) {
    console.error('Invalid JSON format:', parseErr);
    setError('Invalid JSON format. Please check your input.');
    isSaving.value = false;
    return;
  }

  try {
    await api.updateGamesConfig({ playingGames: parsedConfig });
    setSuccess('Configuration updated successfully!');
    await fetchCurrentConfig(); 
  } catch (err) {
    console.error('Failed to save configuration:', err);
    const message = err.response?.data?.message || err.message || 'Failed to save configuration.';
    setError(message);
  } finally {
    isSaving.value = false;
  }
}

async function fetchOwnedGames() {
  if (!selectedAccountName.value.trim()) {
    setError('Please enter an account name.');
    return;
  }
  isLoadingOwnedGames.value = true;
  clearError();
  localOwnedGamesError = null;
  ownedGamesList.value = []; 
  displayedAccountName.value = selectedAccountName.value;

  try {
    const response = await api.getOwnedGames(selectedAccountName.value.trim());
    // The API for owned_games now directly returns the array of games
    ownedGamesList.value = Array.isArray(response.data) ? response.data : []; 
    
    if (ownedGamesList.value.length === 0 && response.data && response.data.message) { 
        // This case might not be hit if API directly returns empty array for private profiles now via getUserOwnedApps
        const message = `For ${displayedAccountName.value}: ${response.data.message}`;
        setInfo(message, 7000); 
        localOwnedGamesError = message;
    } else if (ownedGamesList.value.length > 0) {
        setSuccess(`Owned games loaded for ${displayedAccountName.value}.`, 2000);
    } else { // Empty list, no specific message from API (e.g. private profile with getUserOwnedApps gives EResult 5)
        setInfo(`No games found for account '${displayedAccountName.value}'. The game list might be empty or the profile private.`, 7000);
        localOwnedGamesError = `No games for ${displayedAccountName.value}`;
    }

  } catch (err) {
    console.error(`Failed to load owned games for ${selectedAccountName.value}:`, err);
    const message = err.response?.data?.message || err.message || `Failed to load owned games for ${selectedAccountName.value}.`;
    setError(message); // This will display errors like "Profile is private (EResult 5)"
    localOwnedGamesError = message;
    // API Key specific notification removed here
  } finally {
    isLoadingOwnedGames.value = false;
  }
}

function addGameIdToConfig(appid) {
  clearError();
  try {
    let currentParsedConfig = JSON.parse(newConfigInput.value);
    
    if (Array.isArray(currentParsedConfig)) {
      if (!currentParsedConfig.includes(appid) && !currentParsedConfig.includes(String(appid))) {
        currentParsedConfig.push(appid); 
         setSuccess(`AppID ${appid} added to the array.`, 2000);
      } else {
         setInfo(`AppID ${appid} is already in the array.`, 2000);
         return;
      }
    } else if (typeof currentParsedConfig === 'object' && currentParsedConfig !== null) {
      setInfo(`Configuration is an object. Please add AppID ${appid} manually to the desired account within the JSON structure in the editor.`, 5000);
      return; 
    } else {
      currentParsedConfig = [appid];
      setSuccess(`Initialized config with AppID ${appid}.`, 2000);
    }
    newConfigInput.value = JSON.stringify(currentParsedConfig, null, 2);
  } catch (e) {
    newConfigInput.value = JSON.stringify([appid], null, 2);
    setSuccess(`Textarea content was not valid JSON. Initialized with new array containing AppID ${appid}.`, 3000);
  }
}

onMounted(fetchCurrentConfig);

</script>

<style scoped>
.manage-games-view {
  padding: 20px;
  font-family: sans-serif;
}

.config-section {
  background-color: #f9f9f9;
  border: 1px solid #e0e0e0;
  padding: 20px;
  margin-bottom: 25px;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.05);
}

.config-section h2 {
  margin-top: 0;
  color: #333;
  border-bottom: 2px solid #42b983; /* Vue green accent */
  padding-bottom: 10px;
  margin-bottom: 15px;
}

.instructions {
  font-size: 0.9em;
  color: #555;
  margin-bottom: 10px;
}
.instructions code {
  background-color: #e0e0e0;
  padding: 2px 5px;
  border-radius: 4px;
  font-family: 'Courier New', Courier, monospace;
}

.current-config-display {
  background-color: #fff;
  border: 1px solid #ccc;
  padding: 10px;
  border-radius: 4px;
  max-height: 200px;
  overflow-y: auto;
  font-family: 'Courier New', Courier, monospace;
  font-size: 0.9em;
}

textarea {
  width: 100%;
  padding: 10px;
  border: 1px solid #ccc;
  border-radius: 4px;
  box-sizing: border-box;
  font-family: 'Courier New', Courier, monospace;
  font-size: 0.9em;
  margin-bottom: 10px;
}

.save-button {
  background-color: #42b983; /* Vue green */
  color: white;
  padding: 10px 20px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 1em;
  transition: background-color 0.3s ease;
}
.save-button:hover {
  background-color: #36a476;
}
.save-button:disabled {
  background-color: #a5d6b8;
  cursor: not-allowed;
}

.loading-message {
  color: #555;
  font-style: italic;
  padding: 10px 0;
}

/* Removed local error/success message classes */

.owned-games-fetch {
  display: flex;
  gap: 10px;
  margin-bottom: 15px;
  align-items: center;
}
.owned-games-fetch input[type="text"] {
  padding: 8px;
  border: 1px solid #ccc;
  border-radius: 4px;
  flex-grow: 1;
}
.owned-games-fetch button {
  padding: 8px 15px;
  background-color: #5bc0de; /* Bootstrap info blue */
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}
.owned-games-fetch button:hover {
  background-color: #31b0d5;
}
.owned-games-fetch button:disabled {
  background-color: #a9d9e8;
  cursor: not-allowed;
}

.owned-games-list {
  margin-top: 15px;
}
.owned-games-list h3 {
    color: #333;
}
.owned-games-list ul {
  list-style-type: none;
  padding-left: 0;
  max-height: 300px;
  overflow-y: auto;
  border: 1px solid #eee;
  border-radius: 4px;
}
.owned-games-list .game-item {
  padding: 8px 10px;
  border-bottom: 1px solid #f0f0f0;
  cursor: pointer;
  display: flex;
  align-items: center;
  transition: background-color 0.2s ease;
}
.owned-games-list .game-item:last-child {
  border-bottom: none;
}
.owned-games-list .game-item:hover {
  background-color: #e9f5ff; /* Light blue hover */
}
.game-icon {
  width: 24px; /* Smaller icon for the list */
  height: 24px;
  margin-right: 10px;
  vertical-align: middle;
}
</style>
