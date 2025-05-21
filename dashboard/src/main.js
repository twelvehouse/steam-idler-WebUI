import { createApp } from 'vue'
import App from './App.vue'
import router from './router' // Import the router

import './assets/main.css' // Assuming you have a main.css or similar for global styles

const app = createApp(App)

app.use(router) // Use the router

app.mount('#app')
