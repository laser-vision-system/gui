<script setup>
import cameraActive from '../assets/images/camera-active.svg'
import cameraInactive from '../assets/images/camera-inactive.svg'
import cameraConfigActive from '../assets/images/camera-config-active.svg'
import cameraConfigInactive from '../assets/images/camera-config-inactive.svg'
import settingsActive from '../assets/images/settings-active.svg'
import settingsInactive from '../assets/images/settings-inactive.svg'
</script>
<template>
    <div class="container-fluid  navBarLight">
        <div class="row d-flex justify-content-center text-center">
            <div class="col-4">
                <router-link to="/" @click="setNavElement('Camera Feed')">
                    <img :src="activeNavElement === 'Camera Feed' ? cameraActive : cameraInactive"
                        alt="Camera Feed Icon" width="90px" height="90px">
                </router-link>
            </div>
            <div class="col-4">
                <router-link to="/camera-config" @click="setNavElement('Camera Configuration')">
                    <img :src="activeNavElement === 'Camera Configuration' ? cameraConfigActive : cameraConfigInactive"
                        alt="Camera Configuration Icon" width="90px" height="90px">
                </router-link>
            </div>
            <div class="col-4">
                <router-link to="/settings" @click="setNavElement('Settings')">
                    <img :src="activeNavElement === 'Settings' ? settingsActive : settingsInactive" alt="Settings Icon"
                        width="90px" height="90px">
                </router-link>
            </div>
        </div>
        <div class="row">
            <div class="col text-center">
                <p class="navTitle">{{ activeNavElement }}</p>
            </div>
        </div>
    </div>
</template>
<script>

export default {
    data() { return { activeNavElement: 'Camera Feed' } },
    methods: {
        setNavElement(navElement) { this.activeNavElement = navElement; },
    },
}
</script>
