<script setup>
import { ref, onMounted, computed } from 'vue'
import VideoFeed from '../components/CameraFeed.vue'
import { useWebSocket } from '../composables/useWebSocket'

const CameraDataApiURL = ref('') // API URL for camera config Data
const WebSocketURL = ref('') // API URL for camera stream Data

const cameraFeeds = ref([
    { name: "cam00 ", id: '00', description: 'Camera 1 Description', fps: 2, brightness: 0.99, isConnected: true, isSelected: false },
    { name: "cam01 ", id: '01', description: 'Camera 2 Description', fps: null, brightness: 0.99, isConnected: false, isSelected: false }
])

const hasSelectedCamera = computed(() => {
    return cameraFeeds.value.some(feed => feed.isSelected)
})
const hasConnectedCamera = computed(() => {
    return cameraFeeds.value.some(feed => feed.isConnected)
})

// save camera data to local storage
function saveCameraFeeds() {
    localStorage.setItem('cameraFeeds', JSON.stringify(cameraFeeds.value))
}

// fetch method for Read API call
async function fetchCameraData() {
    try {
        const response = await fetch(CameraDataApiURL.value, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        })

        if (!response.ok) {
            throw new Error(`HTTP error: ${response.status}`)
        }

        const data = await response.json()

        // Map API response fields to your camera feed structure
        cameraFeeds.value = data.map(camera => ({
            name: camera.name,
            id: camera.camera_id,
            description: camera.description,
            fps: camera.fps,
            brightness: camera.brightness,
            isConnected: camera.isConnected ?? false,
            isSelected: false
        }))

        saveCameraFeeds()

    } catch (error) {
        console.error('Failed to fetch camera data, using defaults:', error)
        // Falls back to the hardcoded cameraFeeds defined above
        saveCameraFeeds()
    }
}

onMounted(() => {
    fetchCameraData()
})
</script>

<template>
    <div class="container">
        <div class="row align-items-stretch g-0">
            <div class="col-xl-9 col-12 d-flex  mt-2 feed-row">
                <div v-if="hasSelectedCamera" class="w-100">
                    <img src="../assets/images/fake-feed.png" alt="Live Camera Feed" class="feedbox w-100 h-100">
                </div>
                <div v-else-if="hasConnectedCamera" class="w-100">
                    <img src="../assets/images/no-camera-selected.png" alt="No camera selected"
                        class="feedbox w-100 h-100">
                </div>
                <div v-else class="w-100">
                    <img src="../assets/images/no-camera-connected.png" alt="No Cameras Connected"
                        class="feedbox w-100 h-100 ">
                </div>
            </div>
            <div class="col-xl-3 col-12 cam-info d-flex flex-column d-flex flex-column p-2 mt-2 feed-row">
                <h3>Camera Info</h3>
                <div v-for="feed in cameraFeeds" :key="feed.id">
                    <div v-if="feed.isSelected">
                        <p>Camera: {{ feed.name }}</p>
                        <p>Description: {{ feed.description }}</p>
                        <p>fps: {{ feed.fps }}</p>
                        <p>Brightness: {{ feed.brightness }}</p>
                    </div>
                </div>
                <div v-if="!hasSelectedCamera">
                    <p><strong>No camera selected</strong></p>
                </div>
            </div>
        </div>
        <div class="row p-2 mt-2">
            <div class="col-lg-9 col-12">
                <h3 class="cam-title">Cameras Connected</h3>
                <div class="row d-flex justify-content-start p-3">
                    <div class="col-3" v-for="(feed, fi) in cameraFeeds" :key="feed.id">
                        <div v-if="feed.isConnected">
                            <div :class="['card', 'camera-tab', 'bg-success', { 'selected-camera': feed.isSelected }]">
                                <div class="card-body" @click="feed.isSelected = !feed.isSelected">
                                    <h5 class="card-title">Camera: {{ feed.name }}</h5>
                                    <p class="card-text">Brightness: {{ feed.brightness }}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <div class="col-lg-3 col-12 text-center">
                <table class="table border border-2 hardware-info">
                    <thead>
                        <tr>
                            <th scope="col">Connected microComputers</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td>Rasberry pie 5 8Gb: ID-00</td>
                        </tr>
                        <tr>
                            <th scope="col">Disconected microComputers</th>
                        </tr>
                        <tr>
                            <td>N/a</td>
                        </tr>
                        <tr>
                            <th scope="col">Disconected Cameras</th>
                        </tr>
                        <tr v-for="feed in cameraFeeds" :key="feed.id">
                            <td v-if="!feed.isConnected">{{ feed.name }}
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>

        </div>
    </div>

</template>
<style scoped>
.camera-tab {
    width: 200px;
    color: var(--nav-title);
}

.selected-camera {
    border: 0.5rem solid lightsteelblue;
    box-shadow: 0 0 0.2rem steelblue;
    color: var(--nav-title);
}

.feedbox {
    border: 0.5rem solid slateblue;
    border-radius: 1rem;
    box-shadow: 0 0 0.45rem mediumslateblue;
    background-color: var(--cam-bg);
    object-fit: contain;
    max-height: 500px;
}

.cam-info {
    border: 0.5rem solid slateblue;
    border-radius: 1rem;
    box-shadow: 0 0 0.45rem mediumslateblue;
    background-color: var(--cam-bg);
    color: var(--nav-title);
}

.feed-row {
    max-width: 640px;
    margin: 0 auto;
}

.hardware-info {
    border-radius: 0.75rem;
    overflow: hidden;
    border-collapse: separate;
    border-spacing: 0;
}

.cam-title {
    color: var(--nav-title);
}
</style>
