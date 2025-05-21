<template>
  <div :class="['app-layout', themeClass]">
    <header class="app-header">
      <h1>Steam Idler Dashboard</h1>
      <div class="account-select">
        <label>Account:
          <select v-model="selectedAccount" @change="onAccountChange" class="account-dropdown">
            <option v-for="acc in accounts" :key="acc" :value="acc">{{ acc }}</option>
          </select>
        </label>
      </div>
      <div class="theme-switch">
        <label>
          <select v-model="theme" @change="applyTheme">
            <option value="auto">Auto</option>
            <option value="light">Light</option>
            <option value="dark">Dark</option>
          </select>
          Theme
        </label>
      </div>
    </header>

    <main>
      <section v-if="currentBot" class="summary-section">
        <div class="account-summary">
          <h2>{{ currentBot.accountName }}</h2>
          <div class="status-row">
            <span :class="['status-indicator', currentBot.isBotRunning ? 'running' : 'stopped']">
              {{ currentBot.isBotRunning ? 'Running' : 'Stopped' }}
            </span>
            <span v-if="currentBot.proxy" class="proxy-info">Proxy: {{ currentBot.proxy }}</span>
          </div>
          <div class="idling-games" v-if="currentBot.playedAppIDs && currentBot.playedAppIDs.length">
            <h3>
              Idling Games
              <button class="edit-btn" @click="toggleEditIdlingGames">
                {{ editIdlingGames ? 'Cancel' : 'Edit' }}
              </button>
            </h3>
            <ul>
              <li v-for="appid in currentBot.playedAppIDs" :key="appid">
                <img
                  v-if="getGameIcon(appid)"
                  :src="getGameIcon(appid)"
                  :alt="getGameName(appid) + ' icon'"
                  class="game-icon"
                />
                <span>{{ getGameName(appid) || 'AppID: ' + appid }}</span>
                <span class="appid-label">(AppID: {{ appid }})</span>
                <button
                  v-if="editIdlingGames"
                  class="remove-btn"
                  @click="removeIdlingGame(appid)"
                >✕</button>
              </li>
            </ul>
          </div>
          <div v-if="editIdlingGames" class="add-idle-game-section">
            <h3>Add Game to Idle</h3>
            <input
              type="text"
              v-model="gameSearch"
              placeholder="Search owned games by name..."
              class="game-search-input"
            />
            <ul class="owned-games-list">
              <li
                v-for="game in filteredOwnedGames"
                :key="game.appid"
                @click="addIdlingGame(game.appid)"
                :class="{ alreadyIdling: isIdling(game.appid) }"
              >
                <img v-if="game.img_icon_url" :src="game.img_icon_url" :alt="game.name + ' icon'" class="game-icon" />
                <span>{{ game.name }}</span>
                <span class="appid-label">(AppID: {{ game.appid }})</span>
                <span v-if="isIdling(game.appid)" class="already-idling-label">Already Idling</span>
              </li>
            </ul>
          </div>
        </div>
        <div class="owned-games-chart-section">
          <h3>Owned Games Playtime (Top 10)</h3>
          <canvas ref="pieChartRef" width="400" height="400"></canvas>
        </div>
      </section>
      <section v-else class="summary-section">
        <p>Please select an account.</p>
      </section>
    </main>

    <footer class="logs-footer">
      <h3>Application Logs</h3>
      <pre class="logs-container console-dark" ref="logsContainerRef" v-html="coloredLogs"></pre>
    </footer>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch, nextTick } from 'vue';
import { useAccountStore } from '@/stores/accountStore';
import api from '@/services/api';
import Chart from 'chart.js/auto';

const accountStore = useAccountStore();
const accounts = computed(() => accountStore.accounts);
const selectedAccount = computed({
  get: () => accountStore.selectedAccount,
  set: (val) => accountStore.setSelectedAccount(val)
});
const bots = ref([]);
const ownedGames = ref([]);
const logs = ref('');
const pieChartRef = ref(null);
const logsContainerRef = ref(null);
let pieChartInstance = null;

const gameSearch = ref('');
const editIdlingGames = ref(false);

const theme = ref('auto');
const themeClass = computed(() => {
  if (theme.value === 'dark') return 'theme-dark';
  if (theme.value === 'light') return 'theme-light';
  return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'theme-dark' : 'theme-light';
});
function applyTheme() {
  document.body.classList.remove('theme-dark', 'theme-light');
  document.body.classList.add(themeClass.value);
}

onMounted(() => {
  applyTheme();
  if (window.matchMedia) {
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', applyTheme);
  }
});
watch(theme, applyTheme);

const currentBot = computed(() => {
  if (!selectedAccount.value) return null;
  return bots.value.find(b => b.accountName === selectedAccount.value) || null;
});

function getGameName(appid) {
  const game = ownedGames.value.find(g => g.appid === appid);
  return game ? game.name : null;
}
function getGameIcon(appid) {
  const game = ownedGames.value.find(g => g.appid === appid);
  return game && game.img_icon_url ? game.img_icon_url : null;
}

const filteredOwnedGames = computed(() => {
  if (!gameSearch.value) return ownedGames.value;
  const q = gameSearch.value.toLowerCase();
  return ownedGames.value.filter(g => g.name && g.name.toLowerCase().includes(q));
});

function isIdling(appid) {
  return currentBot.value && currentBot.value.playedAppIDs && currentBot.value.playedAppIDs.includes(appid);
}

async function addIdlingGame(appid) {
  if (!currentBot.value || isIdling(appid)) return;
  const configRes = await api.getGamesConfig();
  let playingGames = configRes.data.playingGames;
  if (typeof playingGames !== 'object' || playingGames === null) playingGames = {};
  if (!Array.isArray(playingGames[selectedAccount.value])) playingGames[selectedAccount.value] = [];
  if (!playingGames[selectedAccount.value].includes(appid)) {
    playingGames[selectedAccount.value].push(appid);
    await api.updateGamesConfig({ playingGames });
    await fetchBots();
  }
}

async function removeIdlingGame(appid) {
  if (!currentBot.value) return;
  const configRes = await api.getGamesConfig();
  let playingGames = configRes.data.playingGames;
  if (typeof playingGames !== 'object' || playingGames === null) playingGames = {};
  if (!Array.isArray(playingGames[selectedAccount.value])) playingGames[selectedAccount.value] = [];
  playingGames[selectedAccount.value] = playingGames[selectedAccount.value].filter(id => id !== appid);
  await api.updateGamesConfig({ playingGames });
  await fetchBots();
}

function toggleEditIdlingGames() {
  editIdlingGames.value = !editIdlingGames.value;
  if (editIdlingGames.value) {
    fetchOwnedGames();
  }
}

function onAccountChange(e) {
  selectedAccount.value = e.target.value;
  editIdlingGames.value = false;
}

async function fetchAccountsAndBots() {
  const res = await api.getAccounts();
  accountStore.setAccounts(res.data);
  if (res.data.length > 0 && !selectedAccount.value) {
    selectedAccount.value = res.data[0];
  }
  await fetchBots();
}
async function fetchBots() {
  const res = await api.getStatus();
  bots.value = res.data;
}
async function fetchOwnedGames() {
  if (!selectedAccount.value) return;
  const res = await api.getOwnedGames(selectedAccount.value);
  ownedGames.value = Array.isArray(res.data) ? res.data : [];
  await nextTick();
  drawPieChart();
}

const coloredLogs = computed(() => {
  if (!logs.value) return '';
  let html = logs.value.replace(
    /(\[\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\])/g,
    '<span class="log-timestamp">$1</span>'
  );
  html = html.replace(/(error|fail|failed|exception)/gi, '<span class="log-error">$&</span>');
  html = html.replace(/(warn|warning)/gi, '<span class="log-warn">$&</span>');
  html = html.replace(/(success|started|listening|ready)/gi, '<span class="log-success">$&</span>');
  html = html.replace(/(info|notice)/gi, '<span class="log-info">$&</span>');
  html = html.replace(/(debug)/gi, '<span class="log-debug">$&</span>');
  return html;
});

async function fetchLogs() {
  try {
    const res = await api.getLogs();
    logs.value = res.data;
    await nextTick();
    if (logsContainerRef.value) {
      logsContainerRef.value.scrollTop = logsContainerRef.value.scrollHeight;
    }
  } catch {}
}
let logInterval = null;
function startLogAutoRefresh() {
  fetchLogs();
  if (logInterval) clearInterval(logInterval);
  logInterval = setInterval(fetchLogs, 5000);
}

function drawPieChart() {
  if (!pieChartRef.value) return;
  if (pieChartInstance) {
    pieChartInstance.destroy();
    pieChartInstance = null;
  }
  const topGames = [...ownedGames.value]
    .sort((a, b) => b.playtime_forever - a.playtime_forever)
    .slice(0, 10);
  if (topGames.length === 0) return;
  const ctx = pieChartRef.value.getContext('2d');
  pieChartInstance = new Chart(ctx, {
    type: 'pie',
    data: {
      labels: topGames.map(g => g.name),
      datasets: [{
        data: topGames.map(g => g.playtime_forever),
        backgroundColor: [
          '#42b983', '#36a2eb', '#ff6384', '#ffcd56', '#4bc0c0',
          '#9966ff', '#ff9f40', '#c9cbcf', '#e7e9ed', '#b2dfdb'
        ]
      }]
    },
    options: {
      plugins: {
        legend: {
          display: true,
          position: 'bottom'
        }
      }
    }
  });
}

watch(selectedAccount, async () => {
  await fetchBots();
  await fetchOwnedGames();
});

onMounted(async () => {
  await fetchAccountsAndBots();
  await fetchOwnedGames();
  startLogAutoRefresh();
});
</script>

<style scoped>
.app-layout {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  color: #2c3e50;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: var(--bg-main, #fff);
  transition: background 0.2s;
}
.theme-dark {
  --bg-main: #181c20;
  --header-bg: #222;
  --header-color: #fff;
}
.theme-light {
  --bg-main: #fff;
  --header-bg: #222;
  --header-color: #fff;
}
.app-header {
  display: flex;
  align-items: center;
  gap: 30px;
  padding: 10px 20px;
  background: var(--header-bg, #222);
  color: var(--header-color, #fff);
}
.account-select label {
  font-size: 1em;
  color: var(--header-color, #fff);
}
.account-select select,
.account-dropdown {
  margin-left: 8px;
  padding: 3px 8px;
  border-radius: 4px;
  border: 1px solid #bbb;
  background: #fff;
  color: #222;
  font-size: 1em;
  min-width: 120px;
  appearance: auto;
}
.account-select select:focus {
  outline: 2px solid #42b983;
}
.theme-switch {
  margin-left: auto;
  color: var(--header-color, #fff);
}
.theme-switch select {
  margin-left: 6px;
  padding: 2px 8px;
  border-radius: 4px;
  border: 1px solid #bbb;
  font-size: 1em;
}
.summary-section {
  display: flex;
  gap: 40px;
  padding: 30px 20px 10px 20px;
  align-items: flex-start;
}
.account-summary {
  min-width: 300px;
}
.status-row {
  display: flex;
  gap: 20px;
  align-items: center;
  margin-bottom: 10px;
}
.status-indicator {
  padding: 3px 7px;
  border-radius: 4px;
  color: white;
  font-weight: bold;
}
.status-indicator.running {
  background-color: #28a745;
}
.status-indicator.stopped {
  background-color: #dc3545;
}
.proxy-info {
  font-size: 0.95em;
  color: #bbb;
}
.idling-games ul {
  list-style-type: none;
  padding-left: 0;
}
.idling-games li {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 6px;
}
.game-icon {
  width: 28px;
  height: 28px;
  border-radius: 4px;
  background: #eee;
}
.appid-label {
  color: #888;
  font-size: 0.9em;
  margin-left: 6px;
}
.owned-games-chart-section {
  flex: 1;
  min-width: 320px;
  max-width: 500px;
}
.logs-footer {
  background: #f8f9fa;
  padding: 15px 20px;
  border-top: 1px solid #eee;
  margin-top: auto;
}
.logs-footer h3 {
  margin-top: 0;
  color: #2c3e50;
}
.logs-container.console-dark {
  background: #22272e;
  color: #adbac7;
  border: 1px solid #444c56;
  padding: 15px;
  white-space: pre-wrap;
  word-wrap: break-word;
  max-height: 250px;
  overflow-y: auto;
  font-family: 'Fira Mono', 'Consolas', 'Courier New', Courier, monospace;
  font-size: 0.95em;
  border-radius: 4px;
  margin: 0;
}
.log-timestamp { color: #6cb6ff; }
.log-error { color: #f47067; font-weight: bold; }
.log-warn { color: #ffd33d; font-weight: bold; }
.log-success { color: #57ab5a; font-weight: bold; }
.log-info { color: #539bf5; font-weight: bold; }
.log-debug { color: #986ee2; font-weight: bold; }
.remove-btn {
  margin-left: 8px;
  color: #fff;
  background: #dc3545;
  border: none;
  border-radius: 3px;
  padding: 2px 7px;
  cursor: pointer;
  font-size: 1em;
}
.remove-btn:hover {
  background: #b71c1c;
}
.add-idle-game-section {
  margin-top: 25px;
}
.game-search-input {
  width: 100%;
  padding: 6px 10px;
  margin-bottom: 10px;
  border-radius: 4px;
  border: 1px solid #bbb;
  font-size: 1em;
}
.owned-games-list {
  max-height: 200px;
  overflow-y: auto;
  list-style: none;
  padding: 0;
  margin: 0;
  border: 1px solid #eee;
  border-radius: 4px;
  background: #fafafa;
}
.owned-games-list li {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 6px 10px;
  border-bottom: 1px solid #f0f0f0;
  cursor: pointer;
  transition: background 0.15s;
}
.owned-games-list li:last-child {
  border-bottom: none;
}
.owned-games-list li:hover {
  background: #e9f5ff;
}
.owned-games-list li.alreadyIdling {
  background: #e0e0e0;
  color: #888;
  cursor: not-allowed;
}
.already-idling-label {
  margin-left: auto;
  color: #42b983;
  font-size: 0.95em;
}
.edit-btn {
  margin-left: 10px;
  padding: 2px 10px;
  font-size: 0.95em;
  border: none;
  border-radius: 3px;
  background: #36a2eb;
  color: #fff;
  cursor: pointer;
  transition: background 0.15s;
}
.edit-btn:hover {
  background: #1976d2;
}
</style>
