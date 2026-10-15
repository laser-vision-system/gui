<script setup>
import cameraActive from '../assets/images/camera-active.svg'
import cameraInactive from '../assets/images/camera-inactive.svg'
import cameraConfigActive from '../assets/images/camera-config-active.svg'
import cameraConfigInactive from '../assets/images/camera-config-inactive.svg'
import settingsActive from '../assets/images/settings-active.svg'
import settingsInactive from '../assets/images/settings-inactive.svg'
import { useRoute } from 'vue-router';

function isRoute(navElement) {
  if (navElement === useRoute().path) {
  return true;
  }
  return false;
}
</script>
<template>
    <div class="container-fluid  navBar">
        <div class="row d-flex justify-content-center text-center">
            <div class="col-4 d-flex flex-column align-items-center justify-content-center">
                <router-link to="/">
                    <img :src="isRoute('/') ? cameraActive : cameraInactive"
                        alt="Camera Feed Icon" width="64px" height="64px" aria-label="Homepage">
                </router-link>
                <span class="navTitle px-3 pt-1" v-if="activeNavElement === 'Camera Feed'">
                    {{ activeNavElement }}
                </span>

            </div>

            <div class="col-4 d-flex flex-column align-items-center justify-content-center">
                <router-link to="/device-settings">
                    <img :src="isRoute('/device-settings') ? cameraConfigActive : cameraConfigInactive"
                        alt="Device setting Icon" width="64px" height="64px" aria-label="Device Settings">
                </router-link>
                <span class="navTitle px-3 pt-1" v-if="activeNavElement === 'Camera Config'">
                    {{ activeNavElement }}
                </span>
            </div>
            <div class="col-4 d-flex flex-column align-items-center justify-content-center">
                <router-link to="/global-settings">
                    <img :src="isRoute('/global-settings') ? settingsActive : settingsInactive" alt="Global Settings Icon"
                        width="64px" height="64px" aria-label="Global Setting">
                </router-link>
                <span class="navTitle px-3" v-if="activeNavElement === 'Settings'">
                    {{ activeNavElement }}
                </span>
            </div>
        </div>
    </div>
</template>
