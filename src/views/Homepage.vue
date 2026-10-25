<script setup>
import { ref, onMounted, computed, watch, onUnmounted } from 'vue'
import { isEmpty } from '../utils/helpers'

// --------------------
//   Config Shortcut
// --------------------
// import router and useSharedDeviceData.js for shortcuts
import { useRouter } from 'vue-router'
import { useSharedDeviceData } from '../composables/useSharedDeviceData'
const router = useRouter()
const { setSharedMicroComputer, setSharedCamera, clearAllSharedDeviceData } = useSharedDeviceData()

// --------------------
//   Component Imports
// --------------------
import CameraFeed from '../components/CameraFeed.vue'
import DeviationBar from '../components/DeviationBar.vue'
import { usePersistentGlobalData } from '../composables/usePersistentGlobalData'
const { globalCameraFeedBoolean } = usePersistentGlobalData()

// -----------------------------
//   Confirmation pop up window
// -----------------------------
// This section imports and defines the references for the confirmation window / box
import ConfirmationBox from '../components/ConfirmationBox.vue'
// Show Booleans
const showForgetCameraConfirm = ref(false)
const showForgetEdgeConfirm = ref(false)
const showForceRetryCameraConfirm = ref(false)
const confirmationMessage = ref('')

// --------------------
//   WebSocket
// --------------------
import { useWebSocket } from '../composables/useWebSocket'
// Point this at your server's websocket endpoint
const {
  // state
  status,
  // data
  edgeList: wsEdgeList,
  disconnectedEdgeList: wsDisconnectedEdgeList,
  cameraList: wsCameraList,
  imageSrc,
  connect,
  // functions
  setpoint,
  viewCamera,
  stopViewingCamera,
  forceRetryCamera,
  forgetCameraRequest,
  forgetEdge
} = useWebSocket('ws://'+ location.hostname +':8080/gui_ws')

//  Check if the websocket is connected
const isLive = computed(() => status.value === 'CONNECTED')

// --------------------
//     Sample Data
// --------------------
import sampleCameraList from '../assets/data/sampleCameraList.json'
import sampleMicroComputerList from '../assets/data/sampleMicroComputerList.json'
import sampleDisconnectedEdgeList from '../assets/data/sampleDisconnectedEdgeList.json'
// uncomment for deployment :)
// sampleDisconnectedEdgeList.microComputers = null;
// --------------------
//      ref Values
// --------------------
//const setpointState = ref(false)
const activeTab = ref('conns') // tracks active tab state (defaults to connections tab)
const selectedEdgeId = ref(null)
const selectedCameraId = ref(null)
const cameraSetpoints = ref({})
const alertsExpanded = ref(true) // alert system variable
const activeFeeds = ref({})

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
const disconnectedMicroComs = computed(() => {
    if (!loadDisconnectedEdgesList.value) return []

    return loadDisconnectedEdgesList.value
    .map(disconnection => ({
        ...disconnection,
        alertMsg: `[DISCONNECTION] ${disconnection.name} has disconnected.`,
        alertType: 'info'
    }))
})
const disconnectedCameras = computed(() => {
    if (!mergedCameraData.value) return []

    return mergedCameraData.value
    .filter(connection => connection.state === 'Disconnected')
    .map(disconnection => {
        let alertMsg = ''
        let alertType = 'info'

        if (disconnection.state === 'Disconnected') {
            alertMsg = `[DISCONNECTION] ${disconnection.name} has disconnected.`
        }
        return {
            ...disconnection,
            alertMsg,
            alertType
        }
    })
})
const disconnectionAlerts = computed(() => {
    if (!disconnectedMicroComs.value && !disconnectedCameras.value) return []

    return [...disconnectedMicroComs.value, ...disconnectedCameras.value]
})
// grab active microCom list from websocket or sample data
const loadActiveEdgesList = computed(() => {
    const source = isLive.value && wsEdgeList.value.length > 0 ? wsEdgeList.value : sampleMicroComputerList.microComputers // WILL CHANGE TO NULL
    return source
})
// grab disconnected microCom list from websocket or sample data
const loadDisconnectedEdgesList = computed(() => {
    const source = isLive.value && wsDisconnectedEdgeList.value.length > 0 ? wsDisconnectedEdgeList.value : sampleDisconnectedEdgeList.microComputers // WILL CHANGE TO NULL
    return source
})
// grab camera list from websocket or sample data
const loadCameraList = computed(() => {
    const source = isLive.value && wsCameraList.value.length > 0 ? wsCameraList.value : sampleCameraList.cameras // WILL CHANGE TO NULL
    return source
})
// merge camera list with microcomputer, image analysis & selection details
const mergedCameraData = computed(() => {
    if (!loadActiveEdgesList.value || !loadCameraList.value) { // catches undefined (empty values)
        return []
    }

    return loadCameraList.value.map(camera => {
        const matchingEdgeData = loadActiveEdgesList.value.find(
          connection => connection.conn_id === camera.conn_id)
        const hasDeviation = camera.deviation !== null
        && camera.deviation !== undefined && !isNaN(Number(camera.deviation))
        return {
        ...camera,
        deviation: hasDeviation ? Number(camera.deviation) : '--',
        microComName: matchingEdgeData ? matchingEdgeData.name : null,
        microComState: matchingEdgeData ? matchingEdgeData.state : null,
        isSelected: selectedCameraId.value === `${camera.conn_id}-${camera.camera_id}`
        }
    })
})
// group by microcomputer & for active cameras
const activeMergedData = computed(() => {
    if (!mergedCameraData.value) {
        return []
    }
    else {
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
    }
})
// returns camera info based on selected camera
const selectedCameraInfo = computed(() => {
    if (!selectedCameraId.value) return null
    const [conn_id, camera_id] = selectedCameraId.value.split('-')
    return activeMergedData.value[conn_id]?.activeCameras.find(c => c.camera_id === camera_id) || null
})
// checks if a specific camera has a setpoint set
const isSetpointActive = computed(() => {
    return selectedCameraId.value && selectedCameraId.value in cameraSetpoints.value
})
// alert system
const toggleAlerts = computed(() => {
    alertsExpanded.value = !alertsExpanded.value
})

// --------------------
//        Methods
// --------------------
// select one camera at a time by ID
const toggleCameraSelection = (cameraId) => {
    if (selectedCameraId.value === cameraId) {
        selectedCameraId.value = null
    } else {
        selectedCameraId.value = cameraId
    }
}
const updateSetpoint = () => {
    if (!selectedCameraId.value || !selectedCameraInfo.value) return

    const [conn_id, camera_id] = selectedCameraId.value.split('-')
    // const targetSetpoint = selectedCameraInfo.value.intensity
  cameraSetpoints.value[selectedCameraId.value] = true;
    setpoint(conn_id, camera_id)

    /*try {
        setpoint(conn_id, camera_id)
        wsSetpointState.value = true
        console.log("Setpoint call executed successfully.")
    } catch (error) {
        console.error("The setpoint() function threw an error:", error)
    }*/
}
const isFeedActive = (cameraId) => {
    // returns bool for active feed (true) or no active feed (false)
    return !!activeFeeds.value[cameraId]
}
const liveFeedBtn = (connId, cameraId) => {
    activeFeeds.value[`${connId}-${cameraId}`] = !activeFeeds.value[`${connId}-${cameraId}`]

    if (activeFeeds.value[`${connId}-${cameraId}`]) {
        viewCamera(connId, cameraId)
    } else {
        stopViewingCamera(connId, cameraId)
    }
}
// updates ConfirmationBox values for force retry button
function forceRetryCameraBtn(cameraId, cameraName) {
    selectedCameraId.value = cameraId
    console.log(cameraId)
    confirmationMessage.value = `Force retry the broken camera: ${cameraName}?`
    showForgetCameraConfirm.value = true
}
// sends force retry camera command to server (broken cameras only)
function handleForceRetryCamera() {
    if (selectedCameraId.value) {
        const [conn_id, camera_id] = selectedCameraId.value.split('-')
        forceRetryCamera(conn_id, camera_id)
    }
    // resets states
    showForceRetryCameraConfirm.value = false
    selectedCameraId.value = null
}
// updates ConfirmationBox values for forget camera buttons
function forgetCameraBtn(cameraId, cameraName, camState) {
    selectedCameraId.value = cameraId
    console.log(cameraId)

    if (camState === 'Disconnected') {
        confirmationMessage.value = `Forget the disconnected camera: ${cameraName}?`
    } else if (camState === 'Broken') {
        confirmationMessage.value = `Forget the broken camera: ${cameraName}?`
    } else {
        confirmationMessage.value = `Forget the selected camera: ${cameraName}?`
    }

    showForgetCameraConfirm.value = true
}
// sends forget camera command to server
function handleForgetCamera() {
    if (selectedCameraId.value) {
        const [conn_id, camera_id] = selectedCameraId.value.split('-')
        forgetCameraRequest(conn_id, camera_id)
    }
    // resets states
    showForgetCameraConfirm.value = false
    selectedCameraId.value = null
}
// updates ConfirmationBox values for forget edge button
function forgetEdgeBtn(connId, edgeName) {
    selectedEdgeId.value = connId
    console.log(connId)
    showForgetEdgeConfirm.value = true
    confirmationMessage.value = `Forget the disconnected µ-computer: ${edgeName}?`
}
// sends forget edge command to server
function handleForgetEdge() {
    if (selectedEdgeId.value) {
        forgetEdge(selectedEdgeId)
    }
    // resets states
    showForgetCameraConfirm.value = false
    selectedEdgeId.value = null
}
// camera card traffic light system
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

// --------------------
//    Config Shortcut
// --------------------
function configureCamera(connID, cameraID) {
  setSharedCamera(connID, cameraID);
  router.push('/device-settings');
}

function configureMicroComputer(connID) {
  setSharedMicroComputer(connID);
  router.push('/device-settings');
}

// --------------------
//        Watchers
// --------------------

// -------------------------------
//        onMount and unMount
// -------------------------------
onMounted(async () => {
  connect();
  clearAllSharedDeviceData();
})

onUnmounted(() => {
    // Clean up on unmount
})
</script>
<template>
    <div class="container">
    <!-- ALERTS -->
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
        <!-- Device / Disconnected List -->
        <div class="row mx-0 mt-2 mb-4 align-items-start">
            <ul class="nav nav-tabs custom-tabs border-bottom-0">
                <li class="nav-item">
                    <button class="nav-link" :class="{ active: activeTab === 'conns' }" @click="activeTab = 'conns'">
                        Connections
                    </button>
                </li>
                <li class="nav-item">
                    <button class="nav-link" :class="{ active: activeTab === 'disconns' }" @click="activeTab = 'disconns'">
                        Disconnections
                    </button>
                </li>
            </ul>
            <div class="tab-content p-3 border rounded-top-0 rounded-bottom-3 rounded-end-3">
                <div v-if="activeTab === 'conns'" class="tab-pane active">
                    <div class="col-lg-8 col-12 ps-0">
                        <div v-if="activeMergedData">
                            <div v-for="(section, conn_id) in activeMergedData" :key="conn_id">
                                <div v-if="section.microComState === 'Active'">
                                    <h4 class="microCom-title d-flex flex-row gap-2">{{ section.microComName }}
                                        <span class="badge bg-secondary">
                                            {{ section.microComState }}
                                        </span>
                                        <button type="button" class="badge submit-btn border-0"
                                                @click="configureMicroComputer(section.conn_id)">Configure</button>
                                    </h4>
                                    <div class="row d-flex justify-content-start p-2 g-2">
                                        <div class="col-6 col-sm-4 col-md-3" v-for="cam in section.activeCameras" :key="`${cam.conn_id}-${cam.camera_id}`">
                                            <div :class="['card', 'camera-tab', getCardColour(cam), { 'selected-camera': selectedCameraId === `${cam.conn_id}-${cam.camera_id}` }]">
                                                <div class="card-body" @click="toggleCameraSelection(`${cam.conn_id}-${cam.camera_id}`)">
                                                    <h5 class="card-title">{{ cam.name }}</h5>
                                                        <p v-if="Number(cam.deviation)" class="card-text fs-3">{{ Math.round(cam.deviation * 100) }}%</p>
                                                        <p v-else class="card-text fs-3">{{ cam.deviation }}</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div v-else>
                            &nbsp
                        </div>
                    </div>
                    <div v-if="selectedCameraId" class="row mx-0 align-items-stretch mb-4 mt-4">
                        <div class="cam-info p-3 mt-2">
                            <div class="row h-100 mx-0 align-content-between">
                                <div class="col-12 px-0">
                                    <h3 class="mb-2">Camera Info</h3>
                                        <div v-if="selectedCameraInfo">
                                            <p><strong>ID:</strong> {{ selectedCameraInfo.camera_id }}</p>
                                            <p><strong>Name:</strong> {{ selectedCameraInfo.name }}</p>
                                            <!-- <p><strong>Intensity:</strong> {{ selectedCameraInfo.intensity }}</p> -->
                                            <p v-if="Number(selectedCameraInfo.deviation)"><strong>Deviation:</strong> {{ Math.round(selectedCameraInfo.deviation * 100) }}%</p>
                                            <p v-else><strong>Deviation:</strong> --</p>
                                            <!-- <p><strong>Active setpoint:</strong> {{ cameraSetpoints[selectedCameraId] ?? 'Not set yet.' }}</p> -->
                                            <div class="table-responsive">
                                                <table class="table table-bordered border-2 text-center hardware-info table-squash">
                                                    <thead>
                                                        <tr>
                                                            <th><span class="badge bg-danger">Alert below:</span></th>
                                                            <th><span class="badge bg-warning text-dark">Warn below:</span></th>
                                                            <th><span class="badge bg-success">No alert:</span></th>
                                                            <th><span class="badge bg-warning text-dark">Warn above:</span></th>
                                                            <th><span class="badge bg-danger">Alert above:</span></th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        <tr>
                                                            <td>{{ Math.round(selectedCameraInfo.alert_below_threshold * 100) }}%</td>
                                                            <td>{{ Math.round(selectedCameraInfo.warn_below_threshold * 100) }}%</td>
                                                            <td>{{ Math.round(selectedCameraInfo.warn_below_threshold * 100)}}-{{ Math.round(selectedCameraInfo.warn_above_threshold * 100) }}%</td>
                                                            <td>{{ Math.round(selectedCameraInfo.warn_above_threshold * 100) }}%</td>
                                                            <td>{{ Math.round(selectedCameraInfo.alert_above_threshold * 100) }}%</td>
                                                        </tr>
                                                    </tbody>
                                                </table>
                                            </div>
                                            <div class="col-12 deviation-wrapper text-center">
                                                <h4>Deviation Scale</h4>
                                                <!-- Deviation Bar -->
                                                 <DeviationBar
                                                :alertBelow="selectedCameraInfo.alert_below_threshold * 100"
                                                :warnBelow="selectedCameraInfo.warn_below_threshold * 100"
                                                :warnAbove="selectedCameraInfo.warn_above_threshold * 100"
                                                :alertAbove="selectedCameraInfo.alert_above_threshold * 100"
                                                :deviation="selectedCameraInfo.deviation * 100"
                                                />
                                            </div>
                                            <div class="button-group">
                                                <button class="btn submit-btn" :disabled="!selectedCameraId" @click="updateSetpoint">
                                                    {{ isSetpointActive ? 'Recalibrate' : 'Calibrate' }}
                                                </button>
                                                <button class="btn submit-btn" @click="configureCamera(selectedCameraInfo.conn_id,selectedCameraInfo.camera_id)">
                                                    Configure
                                                </button>
                                                <button v-if="globalCameraFeedBoolean" class="btn submit-btn" :class="isFeedActive(`${selectedCameraInfo.conn_id}-${selectedCameraInfo.camera_id}`)" @click="liveFeedBtn(selectedCameraInfo.conn_id, selectedCameraInfo.camera_id)">
                                                    {{ isFeedActive(`${selectedCameraInfo.conn_id}-${selectedCameraInfo.camera_id}`) ? 'Hide Live Feed' : 'View Live Feed' }}
                                                </button>
                                            </div>
                                        </div>
                                </div>
                            </div>
                        </div>
                        <div v-if="isFeedActive(`${selectedCameraInfo.conn_id}-${selectedCameraInfo.camera_id}`)">
                            <CameraFeed :imageSrc="imageSrc" :isLive="isLive" :isSelected="!isEmpty(selectedCameraInfo)"/>
                        </div>
                    </div>
                </div>
                <div v-if="activeTab === 'disconns'" class="tab-pane active">
                    <div class="container mt-4 text-center">
                        <div class="row">
                            <div class="col-md-4">
                                <table class="table border border-2 hardware-info">
                                    <tbody>
                                        <tr>
                                            <th scope="col" class="table-dark">Disconnected µ-Computers</th>
                                        </tr>
                                        <tr v-for="com in disconnectedMicroComs" :key="com.conn_id">
                                            <td>{{ com.name }}
                                                <div class="button-group">
                                                    <button class="btn submit-btn" @click="forgetEdgeBtn(com.conn_id, com.name)">Forget</button>
                                                    <ConfirmationBox
                                                    v-model="showForgetEdgeConfirm"
                                                    :message="confirmationMessage"
                                                    :onConfirmFunction="handleForgetEdge"/>
                                                </div>
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                            <div class="col-md-4">
                                <table class="table border border-2 hardware-info">
                                    <tbody>
                                        <tr>
                                            <th scope="col" class="table-dark">Disconnected Cameras</th>
                                        </tr>
                                        <tr v-for="cam in mergedCameraData" :key="cam.camera_id">
                                            <td v-if="cam.state === 'Disconnected'">{{ cam.name }}
                                                <div class="button-group">
                                                    <button class="btn submit-btn" @click="forgetCameraBtn(`${cam.conn_id}-${cam.camera_id}`, cam.name, cam.state)">Forget</button>
                                                    <ConfirmationBox
                                                    v-model="showForgetCameraConfirm"
                                                    :message="confirmationMessage"
                                                    :onConfirmFunction="handleForgetCamera"/>
                                                </div>
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                            <div class="col-md-4">
                                <table class="table border border-2 hardware-info">
                                    <tbody>
                                        <tr>
                                            <th scope="col" class="table-dark">Broken Cameras</th>
                                        </tr>
                                        <tr v-for="cam in mergedCameraData" :key="cam.camera_id">
                                            <td v-if="cam.state === 'Broken'">{{ cam.name }}
                                                <div class="row mb-1 button-group">
                                                    <div class="col-auto">
                                                        <button class="btn submit-btn" @click="forceRetryCameraBtn(`${cam.conn_id}-${cam.camera_id}`, cam.name)">Force Retry</button>
                                                        <ConfirmationBox
                                                        v-model="showForceRetryCameraConfirm"
                                                        :message="confirmationMessage"
                                                        :onConfirmFunction="handleForceRetryCamera"/>
                                                    </div>
                                                    <div class="col-auto">
                                                        <button class="btn submit-btn" @click="forgetCameraBtn(`${cam.conn_id}-${cam.camera_id}`, cam.name, cam.state)">Forget</button>
                                                        <ConfirmationBox
                                                        v-model="showForgetCameraConfirm"
                                                        :message="confirmationMessage"
                                                        :onConfirmFunction="handleForgetCamera"/>
                                                    </div>
                                                </div>
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>
<style scoped>
.custom-tabs .nav-link {
    color: var(--nav-title);
    background-color: transparent;
    border: 1px solid transparent;
    border-bottom: none;
    border-top-left-radius: 0.5rem;
    border-top-right-radius: 0.5rem;
    /* this matches Bootstrap 5's responsive h3 size */
    font-size: calc(1.3rem + .6vw);
    font-weight: 500;
}

.custom-tabs .nav-link:hover {
    color: var(--button-hover);
}

.custom-tabs .nav-link.active {
    color: var(--nav-title);
    background-color: var(--bs-body-bg);
    border-color: var(--bs-border-color) var(--bs-border-color) transparent;
    margin-bottom: -1px;
    position: relative;
    z-index: 2;
}

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

.cam-info {
    border: 0.5rem solid var(--nav-bg);
    border-radius: 1rem;
    box-shadow: 0 0 0.45rem var(--button-hover);
    background-color: var(--cam-bg);
    color: var(--nav-title);
}

/* target mobile screens */
@media (max-width: 768px) {
  .table-squash th,
  .table-squash td {
    padding: 0.2rem 0.3rem;
    font-size: 0.8rem;
    white-space: nowrap;
  }
}

.hardware-info {
    border-radius: 0.75rem;
    overflow: hidden;
    border-collapse: separate;
    border-spacing: 0;
}

.button-group {
    display: flex;
    justify-content: center;
    gap: 10px;
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

.deviation-wrapper {
    padding: 1rem;
}

</style>
