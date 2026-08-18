<script setup>
import { ref, onMounted, computed, watch, onUnmounted } from 'vue'
//import cameraFeed from '../components/CameraFeed.vue'
import { useWebSocket } from '../composables/useWebSocket'
// --------------------
//   WebSocket
// --------------------
// Point this at your server's websocket endpoint
const {
  status,
  error,
  cameras,
  imageSrc,
  analysis,
  connect,
  disconnect,
  viewCamera,
  stopViewingCamera,
} = useWebSocket('ws://localhost:8080/ws')
// --------------------
//        Data
// --------------------
import sampleImageAnalysis from '../assets/data/sampleImageAnalysis.json'
import sampleCameraList from '../assets/data/sampleCameraList.json'
import sampleCameraConfiguration from '../assets/data/sampleCameraConfiguration.json'
const sampleData = ref(sampleCameraList.cameras)
//const WebSocketURL = ref('') // API URL for camera stream Data
const cameraConfigApiURL = ref('/api/configuration') // API URL for camera config Data
const cameraFeedApiURL = ref('/api/image') // API URL for camera feed Data
const cameraInfoApiURL = ref('/api/camera_info') // API URL for camera info
const guiUpdateApiURL = ref('/api/gui_update') // API URL for gui update setpoint and config
const cameraFeedsData = ref([{
    id: '00',
    name: 'cam00',
    description: 'Primary Camera',
    fps: null,
    brightness: null,
    hue: null,
    saturation: null,
    intensity: null,
    deviation: null,
    isConnected: false,
    isSelected: false
}]) // is replaced by the camera data when read.
const setpointState = ref(false)
const liveFeedSrc = ref(null) // dynamic image source
let pollInterval = null
// alert system variables
const alerts = ref([
    { id: 1, message: '[MODERATE] Camera 1 --- Deviation of 0.49', type: 'warning' },
    { id: 2, message: '[MODERATE] Camera 2 --- Deviation of 0.49', type: 'warning' },
    { id: 3, message: '[MODERATE] Camera 3 --- Deviation of 0.49', type: 'warning' },
    { id: 5, message: '[HIGH] Camera 4 --- Deviation of 0.49', type: 'danger' },
    { id: 5, message: '[MODERATE] Camera 5 --- Deviation of 0.49', type: 'warning' },
    { id: 6, message: '[HIGH] Camera 6 --- Deviation of 0.49', type: 'danger' }
])
const alertsExpanded = ref(true)
// --------------------
//        Computed
// --------------------
const hasSelectedCamera = computed(() => {
    return cameraFeedsData.value.some(feed => feed.isSelected)
})
const hasConnectedCamera = computed(() => {
    return cameraFeedsData.value.some(feed => feed.isConnected)
})
const selectedCamera = computed(() =>
    cameraFeedsData.value.find(feed => feed.isSelected) ?? null
)
// alert system
const toggleAlerts = computed(() => {
    alertsExpanded.value = !alertsExpanded.value
})
// --------------------
//        Methods
// --------------------
// Select a camera by ID
function selectCamera(feedId) {
    sampleData.value.forEach(feed => {
        if (feed.id === feedId) {
            feed.isSelected = !feed.isSelected  // toggle the clicked camera
        } else {
            feed.isSelected = false  // deselect all others
        }
    })
}
// fetch method for Read camera config API call
async function fetchCameraConfig() {
    try {
        const response = await fetch(cameraConfigApiURL.value)

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`)
        }

        const data = await response.json()

        cameraFeedsData.value.forEach(feed => {
            feed.fps = data.framerate
            feed.brightness = data.brightness
            feed.hue = data.hue
            feed.saturation = data.saturation
            feed.isConnected = true
        })
    } catch (error) {
        console.error('Failed to fetch camera configuration:', error)

        cameraFeedsData.value.forEach(feed => {
            feed.isConnected = false
        })
    }
}
// fetch method for camera info
async function fetchCameraInfo() {
    try {
        const response = await fetch(cameraInfoApiURL.value)

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`)
        }

        const data = await response.json()

        sampleCameraData.value.forEach(feed => {
            feed.intensity = data.intensity
            feed.deviation = data.deviation
        })
    } catch (error) {
        console.error('Failed to fetch camera configuration:', error)

        sampleCameraData.value.forEach(feed => {
            feed.isConnected = false
        })
    }
}
// post gui_update Set setpoint bool to true
async function postSetpointTrue() {
    const requestOptions = {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            setpoint: true,
            config: false
        })
    };
    try {
        const response = await fetch(guiUpdateApiURL.value, requestOptions)
        if (!response.ok) {
            throw new Error(`HTTP error: ${response.status}`)
        }
        const data = await response.text()
        setpointState.value = true
        setTimeout(() => {
            setpointState.value = false;
        }, 5000);
    } catch (error) {
        console.error('Error fetching camera data:', error)
    }
}
// camera card traffic light system (using sample JSON data)
function getCardColour(deviation) {
    if (deviation >= 0 && deviation <= 0.3) {
        return 'bg-success'
    } else if (deviation > 0.3 && deviation <= 0.7) {
        return 'bg-warning text-dark'
    } else if (deviation > 0.7 && deviation <= 1) {
        return 'bg-danger'
    } else {
        return 'bg-dark'
    }
}
// requests camera feed
async function fetchCameraFeed() {
    if (!hasSelectedCamera.value) return
    // Append timestamp to bust browser image cache on each poll
    liveFeedSrc.value = `${cameraFeedApiURL.value}?t=${Date.now()}`
}

function startPolling() {
    stopPolling() // clear any existing interval first
    fetchCameraFeed() // fetch immediately, then start interval
    pollInterval = setInterval(() => {
        fetchCameraFeed()
        fetchCameraInfo()
    }, 1000 / (cameraFeedsData.value.find(f => f.isSelected)?.fps ?? 2))
}

function stopPolling() {
    if (pollInterval) {
        clearInterval(pollInterval)
        pollInterval = null
    }

    liveFeedSrc.value = null
}
// --------------------
//        Watchers
// --------------------
// Start/stop polling whenever the selected camera changes
watch(
    () => cameraFeedsData.value.map(f => f.isSelected),
    () => {
        if (hasSelectedCamera.value) {
            startPolling()
        } else {
            stopPolling()
        }
    }
)
// -------------------------------
//        onMount and unMount
// -------------------------------
onMounted(async () => {
    connect('ws://localhost:8080/ws')
    await fetchCameraConfig()
    await fetchCameraInfo()
    if (hasSelectedCamera.value) startPolling()
})

onUnmounted(() => {
    // Clean up on unmount
    stopPolling()
})
</script>
<template>
    <div class="container">
        <div class="row p-2 mt-2 mb-4">
                <h3 class="cam-title">Alerts:
                    <button class="btn submit-btn" @click="toggleAlerts">
                        {{ alertsExpanded ? 'Collapse All' : 'Show All (' + alerts.length + ')' }}
                    </button>
                </h3>
                <div class="container mt-2">
                    <div v-if="alerts.length > 0" class="text-center mt-2">
                        <div v-show="alertsExpanded">
                            <div v-for="alert in alerts" :key="alert.id"
                                :class="['alert', `alert-${alert.type}`, 'fade', 'show']" role="alert">
                                {{ alert.message }}
                            </div>
                        </div>
                    </div>
                </div>
        </div>
        <div class="row p-2 mt-2">
            <div class="col-lg-9 col-12">
                <h3 class="cam-title">Connected Cameras & Deviation:</h3>
                <div class="row d-flex justify-content-start p-3">
                    <div class="col-3 pb-1" v-for="feed in sampleData" :key="feed.id">
                            <div :class="['card', 'camera-tab', getCardColour(feed.deviation), { 'selected-camera': feed.isSelected }]">
                                <div v-if="feed.isConnected">
                                    <div class="card-body" @click="selectCamera(feed.id)">
                                        <h5 class="card-title">{{ feed.id }}</h5>
                                        <p class="card-text">{{ (feed.deviation ?? 0).toFixed(4) }}</p>
                                    </div>
                                </div>
                            </div>
                    </div>
                </div>
            </div>
            <div class="col-lg-3 col-12 mt-5 text-center">
                <table class="table border border-2 hardware-info">
                    <thead>
                        <tr>
                            <th scope="col">Connected microComputers</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td>Raspberry pie 5 8Gb: ID-00</td>
                        </tr>
                        <tr>
                            <th scope="col">Disconnected microComputers</th>
                        </tr>
                        <tr>
                            <td>N/a</td>
                        </tr>
                        <tr>
                            <th scope="col">Disconnected Cameras</th>
                        </tr>
                        <tr v-for="feed in sampleData" :key="feed.id">
                            <td v-if="!feed.isConnected">{{ feed.name }}
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
        <div class="row align-items-stretch g-0">
            <div class="col-xl-9 col-12 d-flex  mt-2 feed-row">
                <div v-if="hasSelectedCamera" class="w-100">
                    <img :src="liveFeedSrc" alt="Live Camera Feed" class="feedbox w-100 h-100">
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
            <div class="col-xl-3 col-12 cam-info d-flex flex-column p-2 mt-2 feed-row">
                <div class="row">
                    <h3>Camera Info</h3>
                    <div class="col-lg-7 col-9 ">
                        <div v-for="feed in sampleData" :key="feed.id">
                            <div v-if="feed.isSelected">
                                <p>Camera: {{ feed.id }}</p>
                                <p>Description: {{ feed.name }}</p>
                                <p>Intensity: {{ (feed.intensity ?? 0).toFixed(4) }}</p>
                                <p>Deviation: {{ (feed.deviation ?? 0).toFixed(4) }}</p>
                                <p>fps: {{ feed.fps }}</p>
                                <p>Brightness: {{ feed.brightness }}</p>
                                <p>Hue: {{ feed.hue }}</p>
                                <p>Saturation: {{ feed.saturation }}</p>

                            </div>
                        </div>
                        <div v-if="!hasSelectedCamera">
                            <p><strong>No camera selected</strong></p>
                        </div>
                    </div>
                    <div class="col-lg-5 col-3">
                        <button class="btn submit-btn" @click="postSetpointTrue">Set Setpoint</button>
                        <p v-if="setpointState">Setpoint Successful</p>
                    </div>
                </div>
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
    margin-top: 1.5rem;
    color: var(--nav-title);
}
</style>
