import { createRouter, createWebHashHistory, createWebHistory } from "vue-router";
import Homepage from "../views/Homepage.vue";
import CameraConfig from "../views/CameraConfig.vue";
import Settings from "../views/Settings.vue";
const routes = [
  { path: "/", component: Homepage },
  { path: "/camera-config", component: CameraConfig },
  { path: "/settings", component: Settings }
];
const router = createRouter({
  // change back to createWebHistory when deploying on server
  history: createWebHashHistory(import.meta.env.BASE_URL),
  routes,
});
export default router;
