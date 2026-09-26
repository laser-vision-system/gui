<script setup>
import { ref, onMounted, computed, watch, onUnmounted } from 'vue'
//import cameraFeed from '../components/CameraFeed.vue'
import { useWebSocket } from '../composables/useWebSocket'
// --------------------
//   WebSocket
// --------------------
// Point this at your server's websocket endpoint
const {
  // state
  status,
  // data
  edgeList: wsEdgeList,
  cameraList: wsCameraList,
  imageSrc,
  analysis,
  activeCamera,
  connect,
  disconnect,
  // functions
  listEdges,
  listCameras,
  setpoint,
  viewCamera,
  stopViewingCamera
} = useWebSocket('ws://'+ location.hostname +':8080/gui_ws')

//  Check if the websocket is connected
const isLive = computed(() => status.value === 'CONNECTED')

// --------------------
//        Data
// --------------------
import sampleCameraList from '../assets/data/sampleCameraList.json'
import sampleImageAnalysis from '../assets/data/sampleImageAnalysis.json'
import sampleCameraConfiguration from '../assets/data/sampleCameraConfiguration.json'
import sampleMicroComputerList from '../assets/data/sampleMicroComputerList.json'
const sampleCameras = ref(sampleCameraList.cameras)
const sampleAnalysis = ref(sampleImageAnalysis.GUIImageAnalysis)
const sampleCameraConfigData = ref(sampleCameraConfiguration.configurations)
const sampleMicroComputers = ref(sampleMicroComputerList.microComputers)
//const WebSocketURL = ref('') // API URL for camera stream Data
//const cameraConfigApiURL = ref('/api/configuration') // API URL for camera config Data
//const cameraFeedApiURL = ref('/api/image') // API URL for camera feed Data
//const cameraInfoApiURL = ref('/api/camera_info') // API URL for camera info
//const guiUpdateApiURL = ref('/api/gui_update') // API URL for gui update setpoint and config
/*const cameraFeedsData = ref([{
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
}]) // is replaced by the camera data when read.*/
//const setpointState = ref(false)
const liveFeedSrc = ref(null) // dynamic image source
//let pollInterval = null
const selectedCameraId = ref(null)
const cameraSetpoints = ref({})
const alertsExpanded = ref(true) // alert system variable
// --------------------
//        Computed
// --------------------
const deviationAlerts = computed(() => {
    if (!activeMergedData.value) return []

    return Object.values(activeMergedData.value).flatMap(section => {
        if (!section.activeCameras) return []

        return section.activeCameras.map(analysis => {
                let alertMsg = ''
                let alertType = ''

                // green threshold
                if (analysis.deviation >= analysis.warn_below_threshold && analysis.deviation <= analysis.warn_above_threshold) {
                    alertMsg = `[LOW] ${analysis.name} --- Deviation: ${Math.round(analysis.deviation * 100)}%`
                    alertType = 'success'
                } else if ((analysis.deviation < analysis.warn_below_threshold && analysis.deviation >= analysis.alert_below_threshold) || 
                            (analysis.deviation > analysis.warn_above_threshold && analysis.deviation <= analysis.alert_above_threshold)) {
                                alertMsg = `[MODERATE] ${analysis.name} --- Deviation: ${Math.round(analysis.deviation * 100)}%`
                                alertType = 'warning'
                } else if ((analysis.deviation < analysis.alert_below_threshold) || (analysis.deviation > analysis.alert_above_threshold)) {
                    alertMsg = `[HIGH] ${analysis.name} --- Deviation: ${Math.round(analysis.deviation * 100)}%`
                    alertType = 'danger'
                }
                return {
                    ...analysis,
                    alertMsg,
                    alertType
                }
        })
    })
})
const sortedDeviationAlerts = computed(() => {
    const priority = { danger: 1, warning: 2 }

    return deviationAlerts.value
        .filter(alert => alert.alertType === 'danger' || alert.alertType === 'warning')
        .sort((a, b) => {
            if (priority[a.alertType] !== priority[b.alertType]) {
                return priority[a.alertType] - priority[b.alertType]
            }
            return a.deviation - b.deviation
        })
})
const disconnectionAlerts = computed(() => {
    return mergedCameraData.value
    .filter(connection => connection.microComState === 'Disconnected' || connection.state === 'Disconnected')
    .map(disconnection => {
        let alertMsg = ''
        let alertType = 'info'

        if (disconnection.microComState == 'Disconnected') {
            alertMsg = `[DISCONNECTION] ${disconnection.microComName} has disconnected.`
        } else if (disconnection.state == 'Disconnected') {
            alertMsg = `[DISCONNECTION] ${disconnection.name} has disconnected.`
        }
        return {
            ...disconnection,
            alertMsg,
            alertType
        }
    })
})
// grab microCom list from websocket or sample data
const loadEdgesList = computed(() => {
    const source = isLive.value && wsEdgeList.value.length > 0 ? wsEdgeList.value : sampleMicroComputerList.microComputers
    return source
})
// grab camera list from websocket or sample data
const loadCameraList = computed(() => {
    const source = isLive.value && wsCameraList.value.length > 0 ? wsCameraList.value : sampleCameraList.cameras
    return source
})
// grab image analysis from websocket or sample data
const loadImageAnalysis = computed(() => {
    const source = isLive.value && analysis.value !== null > 0 ? analysis.value : sampleImageAnalysis.GUIImageAnalysis
    return source
})
// merge camera list with microcomputer, image analysis & selection details
const mergedCameraData = computed(() => {
    const camDataList = loadCameraList.value
    const imageAnalysisData = loadImageAnalysis.value
    const edgeDataList = loadEdgesList.value
    const result = []

    for (const camera of camDataList) {
		let matchingData = ref(null)
		if (imageAnalysisData !== null) {
            matchingData = imageAnalysisData.find(
                analysis => analysis.conn_id === camera.conn_id && analysis.camera_id === camera.camera_id
            )
		}
        const matchingComData = edgeDataList.find(
            connection => connection.conn_id === camera.conn_id
        )

        result.push({
            ...camera,
            intensity: matchingData ? matchingData.intensity : 0,
            deviation: matchingData ? matchingData.deviation : 0,
            microComName: matchingComData ? matchingComData.name : null,
            microComState: matchingComData ? matchingComData.state : null,
            isSelected: selectedCameraId.value === `${camera.conn_id}-${camera.camera_id}`
        })
    }
    return result
})
// group by microcomputer & for active cameras
const activeMergedData = computed(() => {
    const sections = {}

    mergedCameraData.value.forEach(camera => {
        const id = camera.conn_id

        // initialise sections if they don't exist yet
        if (!sections[id]) {
            sections[id] = {
                conn_id: id,
                microComName: camera.microComName,
                microComState: camera.microComState,
                activeCameras: [],
            }
        }

        // evaluate for active cameras only if Pi is active
        if (sections[id].microComState === 'Active') {
            if (camera.state === 'Active') {
                sections[id].activeCameras.push(camera)
            }
        }
    })
    return sections
})
// returns camera info based on selected camera
const selectedCameraInfo = computed(() => {
    if (!selectedCameraId.value) return null
    const [conn_id, camera_id] = selectedCameraId.value.split('-')
    return activeMergedData.value[conn_id]?.activeCameras.find(c => c.camera_id == camera_id) || null
})
// checks if a specific camera has a setpoint set
const isSetpointActive = computed(() => {
    return selectedCameraId.value && selectedCameraId.value in cameraSetpoints.value
})
/*const hasSelectedCamera = computed(() => {
    return cameraFeedsData.value.some(feed => feed.isSelected)
})
const hasConnectedCamera = computed(() => {
    return cameraFeedsData.value.some(feed => feed.isConnected)
})
const selectedCamera = computed(() =>
    cameraFeedsData.value.find(feed => feed.isSelected) ?? null
)*/
// alert system
const toggleAlerts = computed(() => {
    alertsExpanded.value = !alertsExpanded.value
})
// --------------------
//        Methods
// --------------------
// Select a camera by ID
function selectCamera(feedId) {
    mergedCameraData.value.forEach(feed => {
        if (feed.camera_id === feedId) {
            feed.isSelected = !feed.isSelected  // toggle the clicked camera
        } else {
            feed.isSelected = false  // deselect all others
        }
    })
}
// select one camera at a time by ID
const toggleCameraSelection = (cameraId) => {
    const [conn_id, camera_id] = cameraId.split('-')
    if (selectedCameraId.value === cameraId) {
        selectedCameraId.value = null
        stopViewingCamera(conn_id, camera_id)
    } else {
        selectedCameraId.value = cameraId
        viewCamera(conn_id, camera_id)
    }
}
// fetch method for Read camera config API call
async function fetchCameraConfig() {
    try {
        const response = await fetch(cameraConfigApiURL.value)

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`)
        }

        const data = await response.json()

        sampleCameras.value.forEach(feed => {
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

        sampleCameras.value.forEach(feed => {
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
const updateSetpoint = () => {
    if (!selectedCameraId.value || !selectedCameraInfo.value) return

    const [conn_id, camera_id] = selectedCameraId.value.split('-')
    const targetSetpoint = selectedCameraInfo.value.intensity
    cameraSetpoints.value[selectedCameraId.value] = targetSetpoint
    setpoint(conn_id, camera_id)

    /*try {
        setpoint(conn_id, camera_id)
        wsSetpointState.value = true
        console.log("Setpoint call executed successfully.")
    } catch (error) {
        console.error("The setpoint() function threw an error:", error)
    }*/
}
// camera card traffic light system (using sample JSON data)
function getCardColour(cam) {
    if (!cam) return 'bg-dark'

    const deviation = cam.deviation
    const warnBelow = cam.warn_below_threshold
    const warnAbove = cam.warn_above_threshold
    const alertBelow = cam.alert_below_threshold
    const alertAbove = cam.alert_above_threshold

    if (deviation >= warnBelow && deviation <= warnAbove) {
        return 'bg-success'
    } else if ((deviation < warnBelow && deviation >= alertBelow) ||
                (deviation > warnAbove && deviation <= alertAbove)) {
                    return 'bg-warning text-dark'
    } else if ((deviation < alertBelow) || (deviation > alertAbove)) {
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
/*watch(
    () => cameraFeedsData.value.map(f => f.isSelected),
    () => {
        if (hasSelectedCamera.value) {
            startPolling()
        } else {
            stopPolling()
        }
    }
)*/
// -------------------------------
//        onMount and unMount
// -------------------------------
onMounted(async () => {
    connect()
    // await fetchCameraConfig()
    // await fetchCameraInfo()
    // if (hasSelectedCamera.value) startPolling()
})

onUnmounted(() => {
    // Clean up on unmount
    // stopPolling()
})
</script>
<template>
    <div class="container">
        <div class="row mt-2 mb-4">
                <h3 class="cam-title">Alerts:
                    <button class="btn submit-btn" @click="toggleAlerts">
                        {{ alertsExpanded ? 'Collapse All' : 'Show All (' + (sortedDeviationAlerts.length + disconnectionAlerts.length) + ')' }}
                    </button>
                </h3>
                <div class="container mt-2">
                    <div v-if="sortedDeviationAlerts.length > 0" class="text-center mt-2">
                        <div v-show="alertsExpanded">
                            <div v-for="alert in sortedDeviationAlerts" :key="alert.camera_id"
                                :class="['alert mb-1', `alert-${alert.alertType}`]" role="alert">
                                {{ alert.alertMsg }}
                            </div>
                        </div>
                    </div>
                    <div v-if="disconnectionAlerts.length > 0" class="text-center mt-0">
                        <div v-show="alertsExpanded">
                            <div v-for="alert in disconnectionAlerts" :key="`${alert.conn_id}-${alert.camera_id}`"
                                :class="['alert mb-1', `alert-${alert.alertType}`]" role="alert">
                                {{ alert.alertMsg }}
                            </div>
                        </div>
                    </div>
                </div>
        </div>
        <div class="row mx-0 mt-2 mb-2 align-items-start">
            <div class="col-lg-8 col-12 ps-0">
                <h3 class="cam-title">Connections:</h3>
                    <div v-for="(section, conn_id) in activeMergedData" :key="conn_id">
                        <div v-if="section.microComState === 'Active'">
                            <h4 class="microCom-title">{{ section.microComName }}
                                <span class="badge bg-secondary">
                                    {{ section.microComState }}
                                </span>
                            </h4>
                            <div class="row d-flex justify-content-start p-2 g-2">
                                <div class="col-3 col-sm-3 col-md-2" v-for="cam in section.activeCameras" :key="`${cam.conn_id}-${cam.camera_id}`">
                                    <div :class="['card', 'camera-tab', getCardColour(cam), { 'selected-camera': selectedCameraId === `${cam.conn_id}-${cam.camera_id}` }]">
                                        <div class="card-body" @click="toggleCameraSelection(`${cam.conn_id}-${cam.camera_id}`)">
                                            <h5 class="card-title">{{ cam.name }}</h5>
                                                <p class="card-text">{{ Math.round(cam.deviation * 100) + '%' }}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
            </div>
            <div class="col-lg-4 col-12 mt-lg-5 pe-0 text-center">
                <table class="table border border-2 hardware-info">
                    <tbody>
                        <tr>
                            <th scope="col" class="table-dark">Disconnected microComputers</th>
                        </tr>
                        <template v-if="sampleMicroComputers.length === 0">
                            <tr>
                                <td>&nbsp</td>
                            </tr>
                        </template>
                        <template v-else>
                            <tr v-for="com in sampleMicroComputers" :key="com.conn_id">
                                <td v-if="com.state === 'Disconnected'">{{ com.name }}</td>
                            </tr>
                        </template>
                        <tr>
                            <th scope="col" class="table-dark">Disconnected Cameras</th>
                        </tr>
                        <tr v-for="cam in mergedCameraData" :key="cam.camera_id">
                            <td v-if="cam.state === 'Disconnected'">{{ cam.name }}</td>
                        </tr>
                    </tbody>
                </table>
                <table class="table border border-2 hardware-info">
                    <tbody>
                        <tr>
                            <th scope="col" class="table-dark">Broken Cameras</th>
                        </tr>
                        <tr v-for="cam in mergedCameraData" :key="cam.camera_id">
                            <td v-if="cam.state === 'Broken'">{{ cam.name }}</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
        <div v-if="selectedCameraId" class="row mx-0 align-items-stretch mb-5 mt-4">
            <div class="col-lg-8 col-12 d-flex ps-0 mt-2">
                <div class="feed-wrapper w-100 h-100">
                    <div v-if="isLive && imageSrc" class="w-100 h-100">
                        <img :src="imageSrc" alt="Live Camera Feed" class="feedbox w-100 h-100">
                    </div>
                    <div v-else-if="hasSelectedCamera" class="w-100 h-100">
                        <img :src="liveFeedSrc" alt="Live Camera Feed" class="feedbox w-100 h-100">
                    </div>
                    <div v-else-if="hasConnectedCamera" class="w-100 h-100">
                        <img src="../assets/images/no-camera-selected.png" alt="No camera selected"
                            class="feedbox w-100 h-100">
                    </div>
                    <div v-else class="w-100 h-100">
                        <img src="../assets/images/no-camera-connected.png" alt="No Cameras Connected"
                            class="feedbox w-100 h-100 ">
                    </div>
                </div>
            </div>
            <div class="col-lg-4 col-12 cam-info d-flex flex-column p-3 pe-0 mt-2">
                <div class="row h-100 mx-0 align-content-between">
                    <div class="col-12 px-0">
                        <h3 class="mb-2">Camera Info</h3>
                        <div class="col-lg-7 col-9">
                            <div v-if="selectedCameraInfo">
                                <p><strong>ID:</strong> {{ selectedCameraInfo.camera_id }}</p>
                                <p><strong>Name:</strong> {{ selectedCameraInfo.name }}</p>
                                <!-- <p><strong>Intensity:</strong> {{ selectedCameraInfo.intensity }}</p> -->
                                <p><strong>Deviation:</strong> {{ Math.round(selectedCameraInfo.deviation * 100) + '%' }}</p>
                                <!-- <p><strong>Active setpoint:</strong> {{ cameraSetpoints[selectedCameraId] ?? 'Not set yet.' }}</p> -->
                                <table class="table border border-2 hardware-info">
                                    <tbody>
                                        <tr>
                                            <th class="bg-danger text-white">Alert below:</th>
                                            <td>{{ Math.round(selectedCameraInfo.alert_below_threshold * 100) + '%' }}</td>
                                        </tr>                                        
                                        <tr>
                                            <th class="bg-warning text-dark">Warn below:</th>
                                            <td>{{ Math.round(selectedCameraInfo.warn_below_threshold * 100) + '%' }}</td>
                                        </tr>
                                        <tr>
                                            <th class="bg-success text-white">No alert:</th>
                                            <td>{{ Math.round(selectedCameraInfo.warn_below_threshold * 100)}}-{{ Math.round(selectedCameraInfo.warn_above_threshold * 100) + '%' }}</td>
                                        </tr>
                                        <tr>
                                            <th class="bg-warning text-dark">Warn above:</th>
                                            <td>{{ Math.round(selectedCameraInfo.warn_above_threshold * 100) + '%' }}</td>
                                        </tr>
                                        <tr>
                                            <th class="bg-danger text-white">Alert above:</th>
                                            <td>{{ Math.round(selectedCameraInfo.alert_above_threshold * 100) + '%' }}</td>
                                        </tr>
                                    </tbody>
                                </table>
                                <div class="col-12 px-0">
                                    <button class="btn submit-btn" :disabled="!selectedCameraId" @click="updateSetpoint">{{ isSetpointActive ? 'Update Setpoint' : 'Set Setpoint' }}</button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>
<style scoped>
.camera-tab {
    min-height: 80px;
    overflow-y: auto;
    container-type: inline-size;
    color: var(--camera-tab-text);
}

.camera-tab .card-title {
    font-size: 15cqw;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.selected-camera {
    border: 0.5rem solid lightsteelblue;
    box-shadow: 0 0 0.2rem steelblue;
    color: var(--camera-tab-text);
}

.feedbox {
    border: 0.5rem solid slateblue;
    border-radius: 1rem;
    box-shadow: 0 0 0.45rem mediumslateblue;
    background-color: var(--cam-bg);
    object-fit: contain;
    max-height: 480px;
}

.feed-wrapper {
    max-width: 640px;
    max-height: 480px;
    margin: 0 auto;
}

.cam-info {
    border: 0.5rem solid slateblue;
    border-radius: 1rem;
    box-shadow: 0 0 0.45rem mediumslateblue;
    background-color: var(--cam-bg);
    color: var(--nav-title);
}

.highlight-row {
    box-shadow: inset 0 0 0 2px #ffeeba;
}

.hardware-info {
    border-radius: 0.75rem;
    overflow: hidden;
    border-collapse: separate;
    border-spacing: 0;
}

.microCom-title {
    margin-top: 1.5rem;
    color: var(--nav-title);
    padding-left: 1rem;
    font-size: medium;
}

.cam-title {
    margin-top: 1.5rem;
    color: var(--nav-title);
}
</style>
