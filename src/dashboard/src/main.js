import { createApp } from "vue";
import App from "./App.vue";
import { createPinia } from "pinia";
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap/dist/js/bootstrap.bundle.min';
import VueApexCharts from "vue3-apexcharts";

const app = createApp(App);

app.use(createPinia());
app.use(VueApexCharts);

app.mount("#app");
