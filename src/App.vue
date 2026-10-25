<script setup>
import navbar from "./components/NavigationMenu.vue";
import manual from "./components/Manual.vue";
</script>
<template>
    <navbar />
    <router-view />
    <manual />
</template>
