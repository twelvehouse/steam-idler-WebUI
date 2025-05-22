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

    <main class="container-fluid flex-grow-1 d-flex flex-column py-4 transition-bg main-area">
      <div v-if="currentBot" class="row g-4 flex-grow-1 min-vh-0 main-row">
        <div class="col-md-5 d-flex flex-column min-vh-0 card-col">
          <div class="card shadow-sm theme-card flex-grow-1 d-flex flex-column card-full">
            <div class="card-body d-flex flex-column card-body-full">
              <h2 class="card-title">{{ currentBot.accountName }}</h2>
              <div class="mb-3 d-flex align-items-center gap-3">
                <span :class="['badge', currentBot.isBotRunning ? 'bg-success' : 'bg-danger']">
                  {{ currentBot.isBotRunning ? 'Running' : 'Stopped' }}
                </span>
                <span v-if="currentBot.proxy" class="text-muted small">Proxy: {{ currentBot.proxy }}</span>
              </div>
              <div v-if="currentBot.playedAppIDs?.length">
                <div class="d-flex align-items-center mb-2">
                  <h5 class="mb-0">Idling Games</h5>
                  <button class="btn btn-sm btn-outline-primary ms-2" @click="toggleEditIdlingGames">
                    Edit
                  </button>
                </div>
                <!-- テーブル風表示 -->
                <table class="table table-sm table-hover align-middle mb-3">
                  <thead>
                    <tr>
                      <th style="width:36px;"></th>
                      <th>Game Name</th>
                      <th>AppID</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="appid in currentBot.playedAppIDs" :key="appid">
                      <td>
                        <img v-if="getGameIcon(appid)" :src="getGameIcon(appid)" :alt="getGameName(appid) + ' icon'" class="game-icon" style="width:32px;height:32px;" />
                      </td>
                      <td>{{ getGameName(appid) || 'AppID: ' + appid }}</td>
                      <td>{{ appid }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
        <div class="col-md-7 d-flex flex-column min-vh-0 card-col">
          <div class="card shadow-sm theme-card flex-grow-1 d-flex flex-column card-full">
            <div class="card-body d-flex flex-column card-body-full">
              <h5 class="card-title">Owned Games Playtime (Top 10)</h5>
              <div class="chart-area flex-grow-1 d-flex align-items-stretch justify-content-center">
                <div class="chart-bg flex-grow-1 d-flex justify-content-center align-items-center chart-bg-full">
                  <apexchart
                    type="bar"
                    :height="null"
                    :width="null"
                    style="width: 100%; height: 100%; min-height: 0; min-width: 0; display: block;"
                    :options="barChartOptions"
                    :series="barChartSeries"
                  ></apexchart>
                </div>
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

    <!-- Idling Games編集モーダル -->
    <transition name="modal-fade">
      <div v-if="editIdlingGames" class="modal-backdrop-custom">
        <div class="modal-custom">
          <div class="modal-header modal-header-theme">
            <h4>Edit Idling Games</h4>
            <button class="btn-close" @click="closeEditModal"></button>
          </div>
          <div class="modal-body d-flex flex-row h-100">
            <!-- 左カラム: 現在アイドル中 -->
            <div class="modal-col border-end pe-3">
              <h6>Currently Idling</h6>
              <draggable
                v-model="idlingList"
                item-key="id"
                handle=".drag-handle"
                ghost-class="drag-ghost"
                chosen-class="drag-chosen"
                animation="200"
                @end="onIdlingListReorder"
              >
                <template #item="{ element, index }">
                  <li class="list-group-item d-flex align-items-center">
                    <span class="drag-handle me-2" title="Drag to reorder" style="cursor:grab;">☰</span>
                    <img v-if="getGameIcon(element)" :src="getGameIcon(element)" :alt="getGameName(element) + ' icon'" class="game-icon me-2" style="width:28px;height:28px;" />
                    <span>{{ getGameName(element) || 'AppID: ' + element }}</span>
                    <span class="text-muted ms-2 small">(AppID: {{ element }})</span>
                    <button class="btn btn-sm btn-danger ms-auto" @click="removeIdlingGame(element)">✕</button>
                  </li>
                </template>
              </draggable>
            </div>
            <!-- 中央カラム: Add Game グリッド -->
            <div class="modal-col px-3 flex-grow-1" style="max-width: none;">
              <h6>Add Game</h6>
              <input type="text" v-model="gameSearch" placeholder="Search or add custom game..." class="form-control mb-3" />
              <div class="games-grid">
                <!-- 検索テキストがあればカスタムゲームを先頭に -->
                <div
                  v-if="gameSearch.trim()"
                  class="game-card custom-game-card"
                  @click="addCustomGameFromGrid"
                  :class="{ 'disabled text-muted': isIdling(gameSearch.trim()) }"
                  title="Add custom game"
                >
                  <div class="game-card-header">Custom Game</div>
                  <div class="game-card-title">{{ gameSearch.trim() }}</div>
                  <div class="game-card-appid">AppID: {{ gameSearch.trim() }}</div>
                </div>
                <!-- OwnedGamesグリッド -->
                <div
                  v-for="game in filteredOwnedGames"
                  :key="game.appid"
                  class="game-card"
                  @click="addIdlingGame(game.appid)"
                  :class="{ 'disabled text-muted': isIdling(game.appid) }"
                  :title="isIdling(game.appid) ? 'Already Idling' : 'Add to Idling'"
                >
                  <div class="game-card-header">
                    <img
                      v-if="getGameBanner(game)"
                      :src="getGameBanner(game)"
                      :alt="game.name + ' banner'"
                      class="game-banner"
                    />
                  </div>
                  <div class="game-card-title">{{ game.name }}</div>
                  <div class="game-card-appid">AppID: {{ game.appid }}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </transition>

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
import draggable from 'vuedraggable';

const accountStore = useAccountStore();
const accounts = computed(() => accountStore.accounts.map(acc => ({ value: acc, text: acc })));
const selectedAccount = computed({
  get: () => accountStore.selectedAccount,
  set: val => accountStore.setSelectedAccount(val)
});
const bots = ref([]);
const ownedGames = ref([]);
const logs = ref('');
const logsContainerRef = ref(null);

const gameSearch = ref('');
const editIdlingGames = ref(false);
const customGames = ref([]); // 右カラム用
const customGameName = ref('');
const idlingList = ref([]);

// バナー画像キャッシュ
const bannerUrlCache = ref({});

// バナー画像URL取得（キャッシュ付き）
async function getGameBannerUrl(appid) {
  if (!appid) return null;
  if (bannerUrlCache.value[appid]) return bannerUrlCache.value[appid];
  // まず既知のURLパターンで仮定
  const url = `https://cdn.cloudflare.steamstatic.com/steam/apps/${appid}/library_600x900.jpg`;
  // HEADリクエストはCORSで失敗する場合があるのでAPI経由
  try {
    const res = await api.getGameBannerUrl(appid);
    if (res.data && res.data.url) {
      bannerUrlCache.value[appid] = res.data.url;
      return res.data.url;
    }
  } catch {
    bannerUrlCache.value[appid] = null;
  }
  return null;
}

// ゲームのバナー画像URLを返す（img_logo_urlがなければAPIで取得）
function getGameBanner(game) {
  if (game.img_logo_url) {
    // 旧API互換: img_logo_urlがあればそれを使う
    return game.img_logo_url.startsWith('http')
      ? game.img_logo_url
      : `https://cdn.cloudflare.steamstatic.com/steam/apps/${game.appid}/library_600x900.jpg`;
  }
  // まだキャッシュにない場合はAPIで取得を試みる
  if (bannerUrlCache.value[game.appid]) return bannerUrlCache.value[game.appid];
  // 非同期取得（副作用だがUI更新のため）
  getGameBannerUrl(game.appid);
  return null;
}

// テーマ状態
const theme = ref(getInitialTheme());
const isDark = computed(() =>
  theme.value === 'auto'
    ? window.matchMedia('(prefers-color-scheme: dark)').matches
    : theme.value === 'dark'
);

function getInitialTheme() {
  const stored = localStorage.getItem('theme');
  return ['light', 'dark', 'auto'].includes(stored) ? stored : 'auto';
}
const themeIconHref = computed(() =>
  theme.value === 'light' ? '#sun-fill'
    : theme.value === 'dark' ? '#moon-stars-fill'
    : window.matchMedia('(prefers-color-scheme: dark)').matches ? '#moon-stars-fill' : '#sun-fill'
);
function setTheme(val) {
  theme.value = val;
  localStorage.setItem('theme', val);
  applyTheme();
}
function applyTheme() {
  let t = theme.value;
  if (t === 'auto') t = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  document.documentElement.setAttribute('data-bs-theme', t);
  document.body.style.backgroundColor = getComputedStyle(document.body).getPropertyValue('--bs-body-bg') || '';
  document.body.style.transition = 'background-color 0.3s, color 0.3s';
}
function handleMediaChange() {
  if (theme.value === 'auto') applyTheme();
}
onMounted(() => {
  applyTheme();
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', handleMediaChange);
});
watch(theme, applyTheme);
onUnmounted(() => {
  window.matchMedia('(prefers-color-scheme: dark)').removeEventListener('change', handleMediaChange);

});

const currentBot = computed(() =>
  selectedAccount.value
    ? bots.value.find(b => b.accountName === selectedAccount.value) || null
    : null
);

const getGameName = appid => ownedGames.value.find(g => g.appid === appid)?.name || null;
const getGameIcon = appid => ownedGames.value.find(g => g.appid === appid)?.img_icon_url || null;

const filteredOwnedGames = computed(() => {
  if (!gameSearch.value) return ownedGames.value;
  const q = gameSearch.value.toLowerCase();
  return ownedGames.value.filter(g => g.name?.toLowerCase().includes(q));
});

const isIdling = appid =>
  currentBot.value?.playedAppIDs?.includes(appid);

// idlingListを常にcurrentBot.playedAppIDsと同期
watch(
  [editIdlingGames, () => currentBot.value?.playedAppIDs],
  ([modalOpen, playedAppIDs]) => {
    if (modalOpen && playedAppIDs) {
      idlingList.value = [...playedAppIDs];
    }
  }
);

// ゲーム追加・削除時にもidlingListを即時更新
async function addIdlingGame(appid) {
  if (!currentBot.value || isIdling(appid)) return;
  try {
    const configRes = await api.getGamesConfig();
    let playingGames = configRes.data.playingGames || {};
    if (!Array.isArray(playingGames[selectedAccount.value])) playingGames[selectedAccount.value] = [];
    playingGames[selectedAccount.value].push(appid);
    await api.updateGamesConfig({ playingGames });
    await fetchBots();
    // 追加: 直後にidlingListも更新
    idlingList.value = [...playingGames[selectedAccount.value]];
  } catch {}
}

async function removeIdlingGame(appid) {
  if (!currentBot.value) return;
  try {
    const configRes = await api.getGamesConfig();
    let playingGames = configRes.data.playingGames || {};
    if (!Array.isArray(playingGames[selectedAccount.value])) playingGames[selectedAccount.value] = [];
    playingGames[selectedAccount.value] = playingGames[selectedAccount.value].filter(id => id !== appid);
    await api.updateGamesConfig({ playingGames });
    await fetchBots();
    // 追加: 直後にidlingListも更新
    idlingList.value = [...playingGames[selectedAccount.value]];
  } catch {}
}

function toggleEditIdlingGames() {
  editIdlingGames.value = !editIdlingGames.value;
  if (editIdlingGames.value) fetchOwnedGames();
}

// モーダル表示時にidlingListを同期
watch(editIdlingGames, (val) => {
  if (val && currentBot.value?.playedAppIDs) {
    idlingList.value = [...currentBot.value.playedAppIDs];
  }
});

// 並び替え確定時にconfig.jsonへ反映
async function onIdlingListReorder() {
  if (!currentBot.value) return;
  try {
    const configRes = await api.getGamesConfig();
    let playingGames = configRes.data.playingGames || {};
    playingGames[selectedAccount.value] = [...idlingList.value];
    await api.updateGamesConfig({ playingGames });
    await fetchBots();
  } catch {}
}

// モーダルを閉じるときにアニメーション後に非表示
function closeEditModal() {
  editIdlingGames.value = false;
}

async function fetchOwnedGames() {
  if (!selectedAccount.value) return;
  try {
    const res = await api.getOwnedGames(selectedAccount.value);
    ownedGames.value = Array.isArray(res.data) ? res.data : [];
    await nextTick();
  } catch {
    ownedGames.value = [];
  }
}

function onAccountChange(e) {
  selectedAccount.value = e.target.value;
  editIdlingGames.value = false;
}

async function fetchAccountsAndBots() {
  try {
    const res = await api.getAccounts();
    accountStore.setAccounts(res.data);
    if (res.data.length > 0 && !selectedAccount.value) selectedAccount.value = res.data[0];
    await fetchBots();
  } catch {}
}
async function fetchBots() {
  try {
    const res = await api.getStatus();
    bots.value = res.data;
  } catch {}
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
    const prev = logs.value;
    logs.value = res.data;
    await nextTick();
    if (logsContainerRef.value) {
      const el = logsContainerRef.value;
      if (logs.value.length > prev.length) {
        const start = el.scrollTop;
        const end = el.scrollHeight - el.clientHeight;
        if (Math.abs(end - start) < 4) el.scrollTop = end;
        else if (end > start) smoothScroll(el, start, end, 600);
      }
    }
  } catch {}
}
function smoothScroll(el, from, to, duration) {
  const startTime = performance.now();
  function animate(now) {
    const elapsed = now - startTime;
    const progress = Math.min(elapsed / duration, 1);
    el.scrollTop = from + (to - from) * (progress < 0.5 ? 2 * progress * progress : -1 + (4 - 2 * progress) * progress);
    if (progress < 1) requestAnimationFrame(animate);
  }
  requestAnimationFrame(animate);
}

let logInterval = null;
function startLogAutoRefresh() {
  fetchLogs();
  if (logInterval) clearInterval(logInterval);
  logInterval = setInterval(fetchLogs, 5000);
}

// チャート用データ
const barChartSeries = computed(() => {
  const topGames = [...ownedGames.value].sort((a, b) => b.playtime_forever - a.playtime_forever).slice(0, 10);
  return [{ data: topGames.map(g => g.playtime_forever) }];
});
const barChartOptions = computed(() => {
  const topGames = [...ownedGames.value].sort((a, b) => b.playtime_forever - a.playtime_forever).slice(0, 10);
  const dark = isDark.value;
  const labelColor = dark ? '#f8f9fa' : '#212529';
  const gridColor = dark ? '#444' : '#e9ecef';
  const chartBg = dark ? '#222' : '#fff';

  return {
    chart: {
      type: 'bar',
      height: '100%',
      width: '100%',
      toolbar: { show: false },
      background: chartBg,
      foreColor: labelColor,
      animations: { enabled: false },
      fontFamily: 'inherit',
      parentHeightOffset: 0
    },
    theme: { mode: dark ? 'dark' : 'light' },
    plotOptions: {
      bar: {
        barHeight: '80%',
        distributed: true,
        horizontal: true,
        dataLabels: { position: 'bottom' }
      }
    },
    legend: { show: false },
    colors: [
      '#33b2df', '#546E7A', '#d4526e', '#13d8aa', '#A5978B',
      '#2b908f', '#f9a3a4', '#90ee7e', '#f48024', '#69d2e7'
    ],
    dataLabels: {
      enabled: true,
      textAnchor: 'start',
      style: { colors: [labelColor] },
      formatter: (val, opt) => (topGames[opt.dataPointIndex]?.name || '') + ":  " + (val / 60).toFixed(1) + "h",
      offsetX: 0,
      dropShadow: { enabled: true, color: dark ? '#000' : '#fff' }
    },
    stroke: { width: 1, colors: [chartBg] },
    grid: {
      borderColor: gridColor,
      xaxis: { lines: { show: false } },
      yaxis: { lines: { show: false } },
      padding: { left: 0, right: 0, top: 0, bottom: 0 }
    },
    xaxis: {
      categories: topGames.map(g => g.name),
      labels: { style: { colors: Array(topGames.length).fill(labelColor) } }
    },
    yaxis: { labels: { show: false } },
    tooltip: {
      theme: dark ? 'dark' : 'light',
      custom: function({ series, seriesIndex, dataPointIndex, w }) {
        const game = topGames[dataPointIndex];
        if (!game) return '';
        // アイコン画像のみ表示
        const iconUrl =
          game.img_icon_url
            ? (game.img_icon_url.startsWith('http')
                ? game.img_icon_url
                : `http://media.steampowered.com/steamcommunity/public/images/apps/${game.appid}/${game.img_icon_url}.jpg`)
            : '';
        const hours = (game.playtime_forever / 60).toFixed(1);
        return `<div style="display:flex;align-items:center;gap:8px;">
          ${iconUrl ? `<img src="${iconUrl}" alt="${game.name}" style="width:32px;height:32px;vertical-align:middle;margin-right:8px;border-radius:4px;">` : ''}
          <div>
            <div style="font-weight:bold;">${game.name}</div>
            <div style="font-size:0.95em;">${hours}h</div>
            <div style="color:#888;font-size:0.85em;">AppID: ${game.appid}</div>
          </div>
        </div>`;
      }
    }
  };
});

// カスタムゲーム追加（直接アイドルゲームリストに追加、config.jsonにも反映）
async function addCustomGame() {
  const name = customGameName.value.trim();
  if (!name || isIdling(name)) return;
  try {
    const configRes = await api.getGamesConfig();
    let playingGames = configRes.data.playingGames || {};
    if (!Array.isArray(playingGames[selectedAccount.value])) playingGames[selectedAccount.value] = [];
    playingGames[selectedAccount.value].push(name);
    await api.updateGamesConfig({ playingGames });
    await fetchBots();
    customGameName.value = '';
  } catch {}
}

// カスタムゲーム追加（グリッド先頭から）
async function addCustomGameFromGrid() {
  const name = gameSearch.value.trim();
  if (!name || isIdling(name)) return;
  try {
    const configRes = await api.getGamesConfig();
    let playingGames = configRes.data.playingGames || {};
    if (!Array.isArray(playingGames[selectedAccount.value])) playingGames[selectedAccount.value] = [];
    playingGames[selectedAccount.value].push(name);
    await api.updateGamesConfig({ playingGames });
    await fetchBots();
    gameSearch.value = '';
    // 追加: 直後にidlingListも更新
    idlingList.value = [...playingGames[selectedAccount.value]];
  } catch {}
}

// カスタムゲーム削除
function removeCustomGame(idx) {
  customGames.value.splice(idx, 1);
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
.main-area {
  flex: 1 1 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: var(--bs-body-bg, #fff);
  color: var(--bs-body-color, #212529);
  transition: background-color 0.3s, color 0.3s;
  padding: 1.5rem 0.5rem 0.5rem 0.5rem;
}
.main-row {
  flex: 1 1 0;
  min-height: 0;
  display: flex;
  flex-wrap: nowrap;
  overflow: hidden;
  gap: 1.5rem;
  /* 修正: 横スクロールを防ぐ */
  width: 100%;
  margin-right: 0;
}
.card-col {
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
  /* 修正: カードの横幅が親を超えないように */
  max-width: 100%;
}
.col-md-7.card-col {
  max-width: 100%;
  flex-basis: 0;
  flex-grow: 1;
  /* 横幅いっぱいに広げる */
  width: 100%;
}
.card-full {
  flex: 1 1 0;
  min-height: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  margin-bottom: 0;
  max-width: 100%;
  width: 100%;
}
.card-body-full {
  flex: 1 1 0;
  min-height: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  padding: 1.25rem 1.25rem 1.25rem 1.25rem;
  width: 100%;
}
.chart-area {
  flex: 1 1 0;
  min-height: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  margin: 0;
  padding: 0;
  position: relative;
  width: 100%;
  max-width: 100%;
  height: 100%;
}
.chart-bg,
.chart-bg-full {
  background: var(--bs-card-bg, #fff);
  transition: background 0.2s;
  display: flex;
  justify-content: center;
  align-items: stretch;
  min-height: 220px;
  height: 100%;
  min-width: 0;
  overflow: hidden;
  flex: 1 1 0;
  padding: 0.5rem;
  border-radius: 0.5rem;
  position: relative;
  width: 100%;
  max-width: 100%;
}
.chart-bg-full {
  /* 追加: カード内で横幅・高さともに最大化 */
  width: 100% !important;
  height: 100% !important;
  min-height: 0 !important;
  min-width: 0 !important;
  flex: 1 1 0 !important;
  align-items: stretch !important;
}
.apexcharts-canvas {
  position: relative !important;
  height: 100% !important;
  width: 100% !important;
  min-height: 0 !important;
  min-width: 0 !important;
  background: transparent !important;
  z-index: 1;
  max-width: 100% !important;
  max-height: 100% !important;
  aspect-ratio: unset !important;
  display: block !important;
}
[data-bs-theme="dark"] .chart-bg,
[data-bs-theme="dark"] .chart-bg-full {
  background: #222 !important;
}
[data-bs-theme="dark"] .apexcharts-canvas {
  background: transparent !important;
}
@media (max-width: 991.98px) {
  .main-row {
    flex-direction: column;
    gap: 1rem;
    width: 100%;
  }
  .card-col {
    min-height: 220px;
    max-width: 100%;
  }
  .col-md-7.card-col {
    max-width: 100%;
  }
}
@media (max-width: 767.98px) {
  .main-area {
    padding: 0.5rem 0.25rem 0.25rem 0.25rem;
  }
  .card-body-full {
    padding: 0.75rem 0.5rem 0.75rem 0.5rem;
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
.table th, .table td {
  vertical-align: middle;
}
.modal-backdrop-custom {
  position: fixed;
  z-index: 2000;
  inset: 0;
  background: rgba(0,0,0,0.45);
  display: flex;
  align-items: center;
  justify-content: center;
}
.modal-custom {
  background: var(--bs-card-bg, #fff);
  color: var(--bs-body-color, #212529);
  border-radius: 12px;
  box-shadow: 0 0 32px rgba(0,0,0,0.25);
  width: 90vw;
  max-width: 1100px;
  min-height: 60vh;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1.2rem 1.5rem 1rem 1.5rem;
  border-bottom: 1px solid var(--bs-border-color, #eee);
  background: var(--bs-card-bg, #fff);
  color: var(--bs-body-color, #212529);
  transition: background 0.3s, color 0.3s;
}
[data-bs-theme="dark"] .modal-header,
[data-bs-theme="dark"] .modal-header-theme {
  background: #222 !important;
  color: #f8f9fa !important;
  border-bottom: 1px solid #444 !important;
}
.modal-header-theme {
  background: var(--bs-card-bg, #fff);
  color: var(--bs-body-color, #212529);
  transition: background 0.3s, color 0.3s;
}
.modal-body {
  flex: 1 1 0;
  display: flex;
  flex-direction: row;
  gap: 1.5rem;
  padding: 1.5rem;
  overflow: auto;
  background: var(--bs-body-bg, #f8f9fa);
}
.modal-col {
  display: flex;
  flex-direction: column;
  min-width: 200px;
  max-width: 340px;
  flex: 1 1 0;
}
.modal-col.px-3.flex-grow-1 {
  max-width: none !important;
}
.games-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  width: 100%;
}
.game-card {
  background: var(--bs-card-bg, #fff);
  border: 1px solid var(--bs-border-color, #eee);
  border-radius: 8px;
  box-shadow: 0 1px 4px rgba(0,0,0,0.04);
  width: 160px;
  min-height: 120px;
  padding: 0.75rem 0.5rem 0.5rem 0.5rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  cursor: pointer;
  transition: box-shadow 0.2s, border-color 0.2s, background 0.2s;
  position: relative;
}
.game-card:hover:not(.disabled) {
  box-shadow: 0 2px 12px rgba(0,0,0,0.10);
  border-color: #339af0;
  background: var(--bs-tertiary-bg, #f8f9fa);
}
.game-card.disabled,
.game-card.text-muted {
  opacity: 0.5;
  pointer-events: none;
}
.game-card-header {
  font-size: 0.95em;
  font-weight: 600;
  margin-bottom: 0.25em;
  text-align: center;
  min-height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.game-banner {
  width: 120px;
  height: 45px;
  object-fit: cover;
  border-radius: 4px;
  background: #eee;
  margin-bottom: 0.25em;
}
@media (max-width: 991.98px) {
  .game-banner {
    width: 90px;
    height: 34px;
  }
}
.custom-game-card {
  border: 2px dashed #339af0;
  background: #eaf4fb;
}
[data-bs-theme="dark"] .game-card {
  background: #222 !important;
  border-color: #444 !important;
  color: #f8f9fa !important;
}
[data-bs-theme="dark"] .custom-game-card {
  background: #232c3a !important;
  border-color: #339af0 !important;
}
[data-bs-theme="dark"] .game-card-appid {
  color: #aaa !important;
}
@media (max-width: 991.98px) {
  .modal-custom {
    flex-direction: column;
    width: 98vw;
    min-width: 0;
    max-width: 99vw;
    padding: 0;
  }
  .modal-body {
    flex-direction: column;
    gap: 1rem;
    padding: 1rem;
  }
  .modal-col {
    max-width: 100%;
    min-width: 0;
  }
}
/* モーダルアニメーション */
.modal-fade-enter-active, .modal-fade-leave-active {
  transition: opacity 0.25s cubic-bezier(.4,0,.2,1);
}
.modal-fade-enter-from, .modal-fade-leave-to {
  opacity: 0;
}
.modal-fade-enter-to, .modal-fade-leave-from {
  opacity: 1;
}
/* ドラッグハンドル */
.drag-handle {
  cursor: grab;
  font-size: 1.2em;
  color: #888;
  user-select: none;
}
.drag-ghost {
  opacity: 0.5;
}
.drag-chosen {
  background: #e9ecef !important;
}
[data-bs-theme="dark"] .drag-chosen {
  background: #333 !important;
}
</style>
