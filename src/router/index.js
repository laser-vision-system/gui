import { createRouter, createWebHashHistory, createWebHistory } from "vue-router";
import Homepage from "../views/Homepage.vue";
import DeviceSettings from "../views/DeviceSettings.vue";
import Settings from "../views/Settings.vue";
const routes = [
  { path: "/", component: Homepage },
  { path: "/device-settings", component: DeviceSettings },
  { path: "/settings", component: Settings }
];
const router = createRouter({
  // change back to createWebHistory when deploying on server
  history: createWebHashHistory(import.meta.env.BASE_URL),
  routes,
});
export default router;
