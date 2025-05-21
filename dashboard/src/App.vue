<template>
  <div id="app-layout">
    <div v-if="isLoading" class="global-loading-indicator">
      Loading...
    </div>
    <GlobalErrorHandler /> <!-- Add the GlobalErrorHandler component -->
    <header>
      <nav>
        <router-link to="/">Dashboard</router-link> |
        <router-link to="/logs">Logs</router-link> |
        <router-link to="/manage-games">Manage Games</router-link>
      </nav>
    </header>
    <main>
      <router-view />
    </main>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { activeRequests } from '@/services/api'; // Import the reactive counter
import GlobalErrorHandler from '@/components/GlobalErrorHandler.vue'; // Import the component

const isLoading = computed(() => activeRequests.value > 0);
</script>

<style scoped>
#app-layout {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  color: #2c3e50;
  position: relative; /* For positioning the loading indicator */
}

.global-loading-indicator {
  position: fixed; /* Or absolute if #app-layout is the main scroll container */
  top: 0;
  left: 0;
  width: 100%;
  background-color: rgba(76, 175, 80, 0.8); /* Greenish, semi-transparent */
  color: white;
  text-align: center;
  padding: 5px 0;
  font-size: 0.9em;
  z-index: 9999; /* Ensure it's on top */
  box-shadow: 0 2px 4px rgba(0,0,0,0.2);
}

header {
  background-color: #f8f9fa;
  padding: 15px;
  box-shadow: 0 2px 4px rgba(0,0,0,.1);
  /* Adjust margin if both global indicators are fixed and could overlap */
  margin-top: 30px; /* Height of global-loading-indicator */
}

nav {
  text-align: center;
}

nav a {
  font-weight: bold;
  color: #2c3e50;
  margin: 0 10px;
  text-decoration: none;
}

nav a.router-link-exact-active {
  color: #42b983;
}

main {
  padding: 20px;
}
</style>
<style>
/* Global styles if needed, or ensure main.css is imported in main.js */
body {
  margin: 0; /* Reset default margin */
}
</style>
