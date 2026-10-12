<script setup>
import { onMounted } from 'vue'
import { useWebSocket } from '../composables/useWebSocket'

const { status, error, imageSrc, connect, disconnect } =
    useWebSocket('ws://your-server/stream')

onMounted(() => connect())
</script>
<template>
    <div>
        <img :src="imageSrc" alt="Camera Feed" />
    </div>
</template>
