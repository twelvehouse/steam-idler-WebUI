<template>
  <div class="app-layout">
    <!-- Bootstrap Navbar -->
    <nav class="navbar navbar-expand-lg shadow-sm bg-body-tertiary transition-bg">
      <div class="container-fluid">
        <span class="navbar-brand mb-0 h1">Steam Idler Dashboard</span>
        <div class="d-flex align-items-center ms-auto">
          <div class="me-3">
            <label class="form-label mb-0 me-2">Account:</label>
            <select v-model="selectedAccount" @change="onAccountChange" class="form-select d-inline-block" style="width:auto; min-width:120px;">
              <option v-for="acc in accounts" :key="acc.value" :value="acc.value">{{ acc.text }}</option>
            </select>
          </div>
        </div>
      </div>
    </nav>

    <main class="container-fluid flex-grow-1 d-flex flex-column py-4 transition-bg" style="min-height:0;">
      <div v-if="currentBot" class="row g-4 flex-grow-1 min-vh-0" style="min-height:0;">
        <div class="col-md-5 d-flex flex-column min-vh-0" style="min-height:0;">
          <div class="card shadow-sm theme-card flex-grow-1 min-vh-0" style="min-height:0;">
            <div class="card-body d-flex flex-column min-vh-0" style="min-height:0;">
              <h2 class="card-title">{{ currentBot.accountName }}</h2>
              <div class="mb-3 d-flex align-items-center gap-3">
                <span :class="['badge', currentBot.isBotRunning ? 'bg-success' : 'bg-danger']">
                  {{ currentBot.isBotRunning ? 'Running' : 'Stopped' }}
                </span>
                <span v-if="currentBot.proxy" class="text-muted small">Proxy: {{ currentBot.proxy }}</span>
              </div>
              <div v-if="currentBot.playedAppIDs && currentBot.playedAppIDs.length">
                <div class="d-flex align-items-center mb-2">
                  <h5 class="mb-0">Idling Games</h5>
                  <button class="btn btn-sm btn-outline-primary ms-2" @click="toggleEditIdlingGames">
                    {{ editIdlingGames ? 'Done' : 'Edit' }}
                  </button>
                </div>
                <ul class="list-group mb-3 theme-list-group">
                  <li v-for="appid in currentBot.playedAppIDs" :key="appid" class="list-group-item d-flex align-items-center">
                    <img
                      v-if="getGameIcon(appid)"
                      :src="getGameIcon(appid)"
                      :alt="getGameName(appid) + ' icon'"
                      class="game-icon me-2"
                    />
                    <span>{{ getGameName(appid) || 'AppID: ' + appid }}</span>
                    <span class="text-muted ms-2 small">(AppID: {{ appid }})</span>
                    <button
                      v-if="editIdlingGames"
                      class="btn btn-sm btn-danger ms-auto"
                      @click="removeIdlingGame(appid)"
                    >✕</button>
                  </li>
                </ul>
              </div>
              <div v-if="editIdlingGames" class="mb-3">
                <h6>Add Game to Idle</h6>
                <input
                  type="text"
                  v-model="gameSearch"
                  placeholder="Search owned games by name..."
                  class="form-control mb-2"
                />
                <ul class="list-group theme-list-group" style="max-height:200px;overflow-y:auto;">
                  <li
                    v-for="game in filteredOwnedGames"
                    :key="game.appid"
                    @click="addIdlingGame(game.appid)"
                    class="list-group-item d-flex align-items-center"
                    :class="{ 'disabled text-muted': isIdling(game.appid) }"
                    style="cursor:pointer;"
                  >
                    <img v-if="game.img_icon_url" :src="game.img_icon_url" :alt="game.name + ' icon'" class="game-icon me-2" />
                    <span>{{ game.name }}</span>
                    <span class="text-muted ms-2 small">(AppID: {{ game.appid }})</span>
                    <span v-if="isIdling(game.appid)" class="badge bg-success ms-auto">Already Idling</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
        <div class="col-md-7 d-flex flex-column min-vh-0" style="min-height:0;">
          <div class="card shadow-sm theme-card flex-grow-1 min-vh-0" style="min-height:0;">
            <div class="card-body d-flex flex-column min-vh-0" style="min-height:0;">
              <h5 class="card-title">Owned Games Playtime (Top 10)</h5>
              <div class="chart-area d-flex flex-row flex-wrap flex-md-nowrap align-items-stretch" style="height:100%;min-height:220px;">
                <div class="chart-legend-area d-none d-md-flex flex-column justify-content-center pe-3" style="min-width:160px;">
                  <ul v-if="pieChartLabels.length" class="list-unstyled mb-0">
                    <li v-for="(label, idx) in pieChartLabels" :key="label" class="d-flex align-items-center mb-2">
                      <span class="legend-color-dot me-2" :style="{background: pieChartColors[idx % pieChartColors.length]}"></span>
                      <span class="legend-label-text">{{ label }}</span>
                    </li>
                  </ul>
                </div>
                <div class="chart-bg p-3 rounded d-flex justify-content-center align-items-center flex-grow-1" style="height:100%;">
                  <canvas ref="pieChartRef" class="responsive-pie-chart"></canvas>
                </div>
              </div>
              <div class="d-md-none mt-3">
                <ul v-if="pieChartLabels.length" class="list-unstyled mb-0 d-flex flex-wrap justify-content-center">
                  <li v-for="(label, idx) in pieChartLabels" :key="label" class="d-flex align-items-center me-3 mb-2">
                    <span class="legend-color-dot me-2" :style="{background: pieChartColors[idx % pieChartColors.length]}"></span>
                    <span class="legend-label-text">{{ label }}</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div v-else class="row flex-grow-1">
        <div class="col">
          <div class="alert alert-info mt-4">Please select an account.</div>
        </div>
      </div>
    </main>

    <footer class="logs-footer py-3 px-4 flex-shrink-0 transition-bg transition-color">
      <pre class="logs-container-terminal" ref="logsContainerRef" v-html="coloredLogs"></pre>
    </footer>

    <!-- テーマ設定のフローティングメニュー -->
    <div class="dropdown position-fixed bottom-0 end-0 mb-3 me-3 bd-mode-toggle theme-float-menu" style="z-index: 1050;">
      <button class="btn btn-bd-primary py-2 dropdown-toggle d-flex align-items-center"
        id="bd-theme"
        type="button"
        aria-expanded="false"
        data-bs-toggle="dropdown"
        aria-label="Toggle theme"
      >
        <svg class="bi my-1 theme-icon-active" width="1em" height="1em">
          <use :href="themeIconHref"></use>
        </svg>
        <span class="visually-hidden" id="bd-theme-text">Toggle theme</span>
      </button>
      <ul class="dropdown-menu dropdown-menu-end shadow theme-float-dropdown show-bg" aria-labelledby="bd-theme-text">
        <li>
          <button type="button" class="dropdown-item d-flex align-items-center"
            :class="{active: theme.value === 'light'}"
            @click="setTheme('light')"
            aria-pressed="theme.value === 'light'"
            data-bs-theme-value="light"
          >
            <svg class="bi me-2 opacity-50 theme-icon" width="1em" height="1em"><use href="#sun-fill"></use></svg>
            Light
            <svg class="bi ms-auto" width="1em" height="1em" v-if="theme.value === 'light'"><use href="#check2"></use></svg>
          </button>
        </li>
        <li>
          <button type="button" class="dropdown-item d-flex align-items-center"
            :class="{active: theme.value === 'dark'}"
            @click="setTheme('dark')"
            aria-pressed="theme.value === 'dark'"
            data-bs-theme-value="dark"
          >
            <svg class="bi me-2 opacity-50 theme-icon" width="1em" height="1em"><use href="#moon-stars-fill"></use></svg>
            Dark
            <svg class="bi ms-auto" width="1em" height="1em" v-if="theme.value === 'dark'"><use href="#check2"></use></svg>
          </button>
        </li>
        <li>
          <button type="button" class="dropdown-item d-flex align-items-center"
            :class="{active: theme.value === 'auto'}"
            @click="setTheme('auto')"
            aria-pressed="theme.value === 'auto'"
            data-bs-theme-value="auto"
          >
            <svg class="bi me-2 opacity-50 theme-icon" width="1em" height="1em"><use href="#circle-half"></use></svg>
            Auto
            <svg class="bi ms-auto" width="1em" height="1em" v-if="theme.value === 'auto'"><use href="#check2"></use></svg>
          </button>
        </li>
      </ul>
    </div>

    <!-- SVGアイコン定義（Bootstrap Icons） -->
    <svg xmlns="http://www.w3.org/2000/svg" style="display:none;">
      <symbol id="sun-fill" viewBox="0 0 16 16" fill="currentColor">
        <path d="M8 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zm0 1a5 5 0 1 1 0-10 5 5 0 0 1 0 10zm0-13a.5.5 0 0 1 .5.5V2a.5.5 0 0 1-1 0V.5A.5.5 0 0 1 8 0zm0 14a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-1 0v-1A.5.5 0 0 1 8 14zm8-6a.5.5 0 0 1-.5.5H14a.5.5 0 0 1 0-1h1.5a.5.5 0 0 1 .5.5zM2 8a.5.5 0 0 1-.5.5H0a.5.5 0 0 1 0-1h1.5A.5.5 0 0 1 2 8zm11.657-5.657a.5.5 0 0 1 .707 0l1.061 1.06a.5.5 0 1 1-.707.708l-1.06-1.06a.5.5 0 0 1 0-.708zm-9.193 9.193a.5.5 0 0 1 .707 0l1.06 1.06a.5.5 0 1 1-.707.708l-1.06-1.06a.5.5 0 0 1 0-.708zm9.193 0a.5.5 0 0 1 0 .707l-1.06 1.06a.5.5 0 1 1-.708-.707l1.06-1.06a.5.5 0 0 1 .708 0zm-9.193-9.193a.5.5 0 0 1 0 .707l-1.06 1.06a.5.5 0 1 1-.708-.707l1.06-1.06a.5.5 0 0 1 .708 0z"/>
      </symbol>
      <symbol id="moon-stars-fill" viewBox="0 0 16 16" fill="currentColor">
        <path d="M6 .278a.768.768 0 0 1 .08.858A7 7 0 1 0 15.864 9.92a.768.768 0 0 1 .858.08.75.75 0 0 1 .07 1.08A8 8 0 1 1 7.16.208a.75.75 0 0 1 1.08.07z"/>
        <path d="M10.5 2a.5.5 0 0 1 .5.5V4a.5.5 0 0 1-1 0V2.5a.5.5 0 0 1 .5-.5zm3.5 3.5a.5.5 0 0 1 .5.5V7a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm-2.5 2.5a.5.5 0 0 1 .5.5V10a.5.5 0 0 1-1 0V8.5a.5.5 0 0 1 .5-.5z"/>
      </symbol>
      <symbol id="circle-half" viewBox="0 0 16 16" fill="currentColor">
        <path d="M8 15A7 7 0 1 1 8 1v14zm0-1V2a6 6 0 1 0 0 12z"/>
      </symbol>
      <symbol id="check2" viewBox="0 0 16 16" fill="currentColor">
        <path d="M13.854 3.646a.5.5 0 0 1 0 .708l-7 7a.5.5 0 0 1-.708 0l-3-3a.5.5 0 1 1 .708-.708L6.5 10.293l6.646-6.647a.5.5 0 0 1 .708 0z"/>
      </symbol>
    </svg>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch, nextTick, onUnmounted } from 'vue';
import { useAccountStore } from '@/stores/accountStore';
import api from '@/services/api';
import Chart from 'chart.js/auto';

const accountStore = useAccountStore();
const accounts = computed(() => accountStore.accounts.map(acc => ({ value: acc, text: acc })));
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

// テーマ状態
const theme = ref(getInitialTheme());
function getInitialTheme() {
  const stored = localStorage.getItem('theme');
  if (stored === 'light' || stored === 'dark' || stored === 'auto') return stored;
  return 'auto';
}
const themeIconHref = computed(() => {
  if (theme.value === 'light') return '#sun-fill';
  if (theme.value === 'dark') return '#moon-stars-fill';
  // auto
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? '#moon-stars-fill' : '#sun-fill';
});
function setTheme(val) {
  theme.value = val;
  localStorage.setItem('theme', val);
  applyTheme();
}
function getPreferredTheme() {
  const stored = localStorage.getItem('theme');
  if (stored === 'light' || stored === 'dark' || stored === 'auto') return stored;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}
function applyTheme() {
  let t = theme.value;
  if (t === 'auto') {
    t = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  document.documentElement.setAttribute('data-bs-theme', t);
  // ページ全体の背景色もBootstrapのbody色に合わせて変更
  const bsBg = getComputedStyle(document.body).getPropertyValue('--bs-body-bg');
  document.body.style.backgroundColor = bsBg || '';
  document.body.style.transition = 'background-color 0.3s, color 0.3s';
}
function handleMediaChange() {
  if (theme.value === 'auto') {
    applyTheme();
  }
}
onMounted(() => {
  applyTheme();
  window.addEventListener('resize', handleResize);
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', handleMediaChange);
});
watch(theme, applyTheme);
onUnmounted(() => {
  window.removeEventListener('resize', handleResize);
  window.matchMedia('(prefers-color-scheme: dark)').removeEventListener('change', handleMediaChange);
});

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

// チャート再描画をEditボタンで抑制
let chartDrawnForAccount = ref('');
function toggleEditIdlingGames() {
  editIdlingGames.value = !editIdlingGames.value;
  if (editIdlingGames.value) {
    fetchOwnedGames();
    // チャート再描画を抑制
    chartDrawnForAccount.value = selectedAccount.value;
  }
}

// fetchOwnedGamesで409エラー時も例外を握りつぶしてVue警告やUncaughtを出さないように
async function fetchOwnedGames() {
  if (!selectedAccount.value) return;
  try {
    const res = await api.getOwnedGames(selectedAccount.value);
    ownedGames.value = Array.isArray(res.data) ? res.data : [];
    await nextTick();
    // チャート再描画はEdit時以外のみ
    if (!editIdlingGames.value || chartDrawnForAccount.value !== selectedAccount.value) {
      drawPieChart();
      chartDrawnForAccount.value = '';
    }
  } catch (err) {
    // 409エラーやその他のエラー時はownedGamesを空にしてチャートもクリア
    ownedGames.value = [];
    pieChartLabels.value = [];
    if (pieChartInstance) {
      pieChartInstance.destroy();
      pieChartInstance = null;
    }
    // 必要ならエラー内容をログ出力
    // console.warn('fetchOwnedGames error:', err);
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

// スクロールアニメーション用の状態
let lastScrollHeight = 0;

// ログ取得・アニメーションスクロール
async function fetchLogs() {
  try {
    const res = await api.getLogs();
    const prev = logs.value;
    logs.value = res.data;
    await nextTick();
    if (logsContainerRef.value) {
      const el = logsContainerRef.value;
      // 新着がある場合のみアニメーション
      if (logs.value.length > prev.length) {
        const start = el.scrollTop;
        const end = el.scrollHeight - el.clientHeight;
        // すでに一番下なら即座に追従
        if (Math.abs(end - start) < 4) {
          el.scrollTop = end;
        } else if (end > start) {
          smoothScroll(el, start, end, 600);
        }
      }
      lastScrollHeight = el.scrollHeight;
    }
  } catch {}
}

// なめらかスクロール
function smoothScroll(el, from, to, duration) {
  const startTime = performance.now();
  function animate(now) {
    const elapsed = now - startTime;
    const progress = Math.min(elapsed / duration, 1);
    el.scrollTop = from + (to - from) * easeInOutQuad(progress);
    if (progress < 1) {
      requestAnimationFrame(animate);
    }
  }
  requestAnimationFrame(animate);
}
function easeInOutQuad(t) {
  return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
}

let logInterval = null;
function startLogAutoRefresh() {
  fetchLogs();
  if (logInterval) clearInterval(logInterval);
  logInterval = setInterval(fetchLogs, 5000);
}

// チャートラベル・カラーをreactiveで保持
const pieChartLabels = ref([]);
const pieChartColors = [
  '#42b983', '#36a2eb', '#ff6384', '#ffcd56', '#4bc0c0',
  '#9966ff', '#ff9f40', '#c9cbcf', '#e7e9ed', '#b2dfdb'
];

// チャートのサイズを1.5倍にし、ラベルも取得
function drawPieChart() {
  if (!pieChartRef.value) return;
  if (pieChartInstance) {
    pieChartInstance.destroy();
    pieChartInstance = null;
  }
  const parent = pieChartRef.value.parentElement;
  let size = 300;
  if (parent) {
    const parentRect = parent.getBoundingClientRect();
    size = Math.max(180, Math.min(parentRect.width, parentRect.height || 999, 480));
  }
  pieChartRef.value.width = size;
  pieChartRef.value.height = size;

  const topGames = [...ownedGames.value]
    .sort((a, b) => b.playtime_forever - a.playtime_forever)
    .slice(0, 10);
  pieChartLabels.value = topGames.map(g => g.name);
  if (topGames.length === 0) return;
  const ctx = pieChartRef.value.getContext('2d');
  pieChartInstance = new Chart(ctx, {
    type: 'pie',
    data: {
      labels: pieChartLabels.value,
      datasets: [{
        data: topGames.map(g => g.playtime_forever),
        backgroundColor: pieChartColors
      }]
    },
    options: {
      responsive: false,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false // Bootstrap側でラベル表示するので非表示
        }
      }
    }
  });
}

// ウィンドウリサイズ時にもチャートをリサイズ
function handleResize() {
  drawPieChart();
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
  min-height: 100vh;
  min-height: 100dvh;
  display: flex;
  flex-direction: column;
  height: 100vh;
  height: 100dvh;
  overflow: hidden;
  background: var(--bs-body-bg, #fff);
  color: var(--bs-body-color, #212529);
  transition: background-color 0.3s, color 0.3s;
}
nav.navbar {
  /* Bootstrap shadow-sm + bg-body-tertiary で明確な境界線 */
  transition: background-color 0.3s, color 0.3s, box-shadow 0.3s;
}
.transition-bg {
  transition: background-color 0.3s, color 0.3s;
}
.transition-color {
  transition: color 0.3s;
}
main.container-fluid {
  flex: 1 1 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: var(--bs-body-bg, #fff);
  color: var(--bs-body-color, #212529);
  transition: background-color 0.3s, color 0.3s;
}
.row.g-4 {
  flex: 1 1 0;
  min-height: 0;
  display: flex;
  flex-wrap: nowrap;
  overflow: hidden;
}
.col-md-5, .col-md-7 {
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
}
.card.theme-card {
  flex: 1 1 0;
  min-height: 0;
  overflow: hidden;
}
.card-body {
  flex: 1 1 0;
  min-height: 0;
  overflow: hidden;
}
.chart-area {
  flex: 1 1 0;
  min-height: 0;
  overflow: hidden;
}
.chart-bg {
  background: var(--chart-bg);
  transition: background 0.2s;
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 220px;
  height: 100%;
  min-width: 0;
  overflow: hidden;
}
.responsive-pie-chart {
  display: block;
  max-width: 100%;
  max-height: 480px;
  width: 100%;
  height: auto;
}
.chart-legend-area {
  min-width: 160px;
  max-width: 220px;
  word-break: break-all;
}
.legend-color-dot {
  display: inline-block;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  border: 1px solid #888;
  flex-shrink: 0;
}
.legend-label-text {
  font-size: 0.98em;
  word-break: break-all;
}
@media (max-width: 991.98px) {
  .row.g-4 {
    flex-wrap: wrap;
    overflow: visible;
  }
  .chart-area {
    flex-direction: column !important;
  }
  .chart-legend-area {
    display: none !important;
  }
}
.logs-footer {
  background: var(--bs-body-bg, #f8f9fa);
  color: var(--bs-body-color, #212529);
  border-top: 1px solid var(--bs-border-color, #eee);
  margin-top: auto;
  flex-shrink: 0;
  transition: background-color 0.3s, color 0.3s, border-color 0.3s;
}
.logs-container-terminal {
  background: #181c20 !important;
  color: #e0e6ed !important;
  border: 1px solid #444c56 !important;
  padding: 15px;
  white-space: pre-wrap;
  word-wrap: break-word;
  max-height: 250px;
  overflow-y: auto;
  font-family: 'Fira Mono', 'Consolas', 'Courier New', Courier, monospace;
  font-size: 0.95em;
  border-radius: 4px;
  margin: 0;
  transition: background 0.2s, color 0.2s, border-color 0.2s;
}
.log-timestamp { color: #6cb6ff; }
.log-error { color: #f47067; font-weight: bold; }
.log-warn { color: #ffd33d; font-weight: bold; }
.log-success { color: #57ab5a; font-weight: bold; }
.log-info { color: #539bf5; font-weight: bold; }
.log-debug { color: #986ee2; font-weight: bold; }
/* テーマフローティングメニューの背景修正（重複・競合を排除し、最小限に整理） */
.theme-float-menu .dropdown-menu.theme-float-dropdown,
.theme-float-menu .dropdown-menu.theme-float-dropdown.show-bg {
  background: #fff !important;
  color: #212529 !important;
  border: 1px solid #dee2e6 !important;
  box-shadow: 0 0.5rem 1rem rgba(0,0,0,.15) !important;
  min-width: 180px;
  z-index: 1051;
  opacity: 1 !important;
  backdrop-filter: none !important;
  -webkit-backdrop-filter: none !important;
  filter: none !important;
  padding: 0.5rem 0;
}
[data-bs-theme="dark"] .theme-float-menu .dropdown-menu.theme-float-dropdown,
[data-bs-theme="dark"] .theme-float-menu .dropdown-menu.theme-float-dropdown.show-bg {
  background: #222 !important;
  color: #f8f9fa !important;
  border: 1px solid #444 !important;
}

/* ドロップダウンアイテム */
.theme-float-menu .dropdown-menu.theme-float-dropdown .dropdown-item {
  color: #212529 !important;
  background: transparent !important;
  transition: background-color 0.3s, color 0.3s;
}
[data-bs-theme="dark"] .theme-float-menu .dropdown-menu.theme-float-dropdown .dropdown-item {
  color: #f8f9fa !important;
}
.theme-float-menu .dropdown-menu.theme-float-dropdown .dropdown-item.active,
.theme-float-menu .dropdown-menu.theme-float-dropdown .dropdown-item:active {
  background-color: #e9ecef !important;
  color: #212529 !important;
}
[data-bs-theme="dark"] .theme-float-menu .dropdown-menu.theme-float-dropdown .dropdown-item.active,
[data-bs-theme="dark"] .theme-float-menu .dropdown-menu.theme-float-dropdown .dropdown-item:active {
  background-color: #333 !important;
  color: #f8f9fa !important;
}

/* 必要なら display: block を残す */
.theme-float-menu .dropdown-menu[data-bs-popper] {
  display: block !important;
}
</style>
