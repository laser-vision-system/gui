<script setup>
import { ref, onMounted, watch, computed } from 'vue'
import { useWebSocket } from '../composables/useWebSocket'

// -------------------------
//   Confrimation pop up
// -------------------------
import ConfirmationBox from '../components/ConfirmationBox.vue'
const showRenameMicroCompConfrim = ref(false)
const showSelectVisionProcessingConfrim = ref(false)
const showRenameCameraConfrim = ref(false)
const showSaveAllControlsConfrim = ref(false)
const showResetAllControlsConfrim = ref(false)
const showSaveFrameRateConfrim = ref(false)
const showResetFrameRateConfrim = ref(false) // probably not needed will get rid of in sprint 6 :]
const showSaveThresholdsConfrim = ref(false)
const showResetThresholdsConfrim = ref(false)
const showSetDefaultThresholdConfrim = ref(false)

// --------------------
//   WebSocket
// --------------------
// Point this at your server's websocket endpoint
const {
  // state
  status,
  // data
  edgeList: wsEdgeList, // renamed so no confusion between sample data and live data.
  cameraList: wsCameraList,
  imageSrc,
  controlConfig,
  defaultThresholds,
  // connections
  connect,
  // Functions
  // Edge (micro computers)
  listEdges,
  setEdgeName,
  setEdgeProcessingType,
  // Cameras
  listCameras,
  viewCamera,
  stopViewingCamera,
  setCameraName,
  viewCameraConfig,
  updateConfiguration,
  setCameraThresholds,
  setDefaultThreshold,
  getDefaultThresholds,
} = useWebSocket('ws://localhost:8080/gui_ws')

//  Check if the websocket is connected
const isLive = computed(() => status.value === 'CONNECTED')

// --------------------
//        Data
// --------------------
//const cameraConfigApiURL = ref('/api/configuration')
//const guiUpdateApiURL = ref('/api/gui_update')


// --------------------
//     Sample Data
// --------------------
// mirrors the output of listcameras in websocket
import sampleCameraList from '../assets/data/sampleCameraList.json'
// mirrors the Configuration or control config value from websocket
import sampleCameraConfiguration from '../assets/data/sampleCameraConfiguration.json'
// list of micro computers
import sampleMicroComputerList from '../assets/data/sampleMicroComputerList.json'
// -------------------------
//     V model vairables
// -------------------------
// User selected variables
const selectedMicroComputer = ref('') // selected m comp
const selectedCamera = ref('') // chosen from camera list
const selectedConfig = ref(null) // matches choice from camera list using the conn_id and camera_id
// Form section toggles
// MicroComputer Configurables Rename
const newMicroComputerName = ref(null)
// MicroComputer Configurables Select vision processing
const newVisionProcessing = ref(null)
// Camera Configuration Rename
const newName = ref(null)
// Diviation configration
const newAlertThreshold = ref(null)
const newWarningThreshold = ref(null)
// FPS (not added yet)
const newFPS = ref(null)
// camera controls
const newBrightness = ref(null)
const newContrast = ref(null)
const newHue = ref(null)
const newSaturation = ref(null)
const newGamma = ref(null)
const newGain = ref(null)
const newExposureAbsolute = ref(null)
const newAutoExposure = ref(null)
// for save message e.g. success | error
const saveState = ref('')

// --------------------
//        Computed
// --------------------
// filter micro Computer list for active computers
const activeMicroComputers = computed(() => {
  const source = isLive.value ? wsEdgeList.value : sampleMicroComputerList.microComputers
  return source.filter((com) => com.state === 'Active')
})
// filter out the cameras that are not active
const activeCameras = computed(() => {
  const source = isLive.value  ? wsCameraList.value : sampleCameraList.cameras
  const active = source.filter((cam) => cam.state === 'Active')
  // if no option is selecetd or the all option is selected.
  if (!selectedMicroComputer.value || selectedMicroComputer.value === 'all') {
    return active
  }
  // else a micro computer is selected filter only the cameras for that computer
  return active.filter((cam) => cam.conn_id === selectedMicroComputer.value.conn_id)
})

// --------------------
//        Methods
// --------------------

// when micro comp is clicked/ selected clear the value for selected camera to aviod errors.
function clearSelectedCamera() {
  if (!selectedCamera.value) return
  // no need to reset if camera is part of the selected option
  const hasCamera = activeCameras.value.some((cam) =>
    cam.conn_id === selectedCamera.value.conn_id && cam.camera_id === selectedCamera.value.camera_id)
  if (hasCamera) return
  // clear the camera value
  selectedCamera.value = ''
}

// rename Selected micro computer
function renameMicroComputer() {
  if (!selectedMicroComputer.value || !newMicroComputerName.value) return
  if (isLive.value) {
    // set micro computer name fucntion
    setEdgeName(selectedMicroComputer.value.conn_id, newMicroComputerName.value)
    // refresh micro comp / edge list
    listEdges()
  } else {
    selectedMicroComputer.value.name = newMicroComputerName.value
  }
}

// Select Vision processing method.
//  the method for saving/ submiting the selected vision processing method
function submitVisionProcessing() {
  if (!selectedMicroComputer.value || newVisionProcessing.value == null) return
  if (isLive.value) {
    // API function for submiting the chosen vision processing
    setEdgeProcessingType(selectedMicroComputer.value.conn_id, newVisionProcessing.value)
    listEdges()
  } else {
    selectedMicroComputer.value.Menu.value.ConValueMenu = newVisionProcessing.value
  }
}

// Rename Selected camera
function renameCamera() {
  if (!selectedCamera.value || !newName.value) return
  if (isLive.value) {
    setCameraName(selectedCamera.value.conn_id, selectedCamera.value.camera_id, newName.value)
    listCameras() // refresh camera list
  } else {
    selectedCamera.value.name = newName.value
  }
}

// check for empty value if empty return the current value if not return the newValue from form.
function checkBlank(newValue, currentValue) {
    if (newValue === '' || newValue === null || newValue === undefined || Number.isNaN(newValue)) {
        return currentValue;
    }
    return newValue;
}

// build camera control payload does not include the fps (we will figure that out later)
function buildControlsPayload() {
  if (!selectedConfig.value) return null
  const original = selectedConfig.value.configuration
  const payload = {}

  const integerControls = {
    Brightness: newBrightness, Contrast: newContrast, Hue: newHue,
    Saturation: newSaturation, Gamma: newGamma, Gain: newGain,
    ExposureAbsolute: newExposureAbsolute,
  }
  for (const [name, valueRef] of Object.entries(integerControls)) {
    if (!original?.[name]) continue // camera doesn't support this control
    const current = original[name].IntegerRange?.value?.ConValueInteger
    const resolved = checkBlank(valueRef.value, current)
    if (resolved === null || resolved === undefined) continue
    payload[name] = {
      IntegerRange: {...original[name].IntegerRange, value: { ConValueInteger: resolved },},
    }
  }

  if (original?.AutoExposure) {
    const current = original.AutoExposure.Menu?.value?.ConValueMenu
    payload.AutoExposure = {
      Menu: {...original.AutoExposure.Menu, value: { ConValueMenu: checkBlank(newAutoExposure.value, current) },},
    }
  }
  return payload
}

// Save the changes made to the camera controls
function saveChanges() {
  if (!selectedCamera.value || !selectedConfig.value) return
  saveState.value = ''
  try {
    const controlsPayload = buildControlsPayload()
    if (isLive.value) {
      updateConfiguration(selectedCamera.value.conn_id, selectedCamera.value.camera_id, controlsPayload)
      listCameras()
    } else {
      //  the sample data does model fps
      selectedConfig.value = {
        ...selectedConfig.value, fps: checkBlank(newFPS.value, selectedConfig.value.fps),
        configuration: { ...selectedConfig.value.configuration, ...controlsPayload },
      }
    }
  } catch (e) {
    console.error('Error updating camera:', e)
    saveState.value = 'error'
  }
}
//------------------------------------------------------------------------------------------------
// All REST-ful api methods and variables have been commented out but not deleted as a redundancy
//------------------------------------------------------------------------------------------------
//fetch method for read function
// async function fetchCameraConfig() {
//     try {
//         const response = await fetch(cameraConfigApiURL.value)
//         if (!response.ok) {
//             throw new Error(`HTTP error: ${response.status}`)
//         }
//         const data = await response.json()
//         cameraFeedData.value = data
//     } catch (error) {
//         console.error('Error fetching camera data:', error)
//     }
// }
// fetch method for update for config
// async function postConfigData() {
//     saveState.value = '' // reset before each attempt
//     const requestOptions = {
//         method: 'POST',
//         headers: {
//             'Content-Type': 'application/json'
//         },
//         body: JSON.stringify({
//             // if the new function are blank or empty use the data got by the read funciton
//             brightness: parseInt(checkBlank(newBrightness.value, cameraFeedData.value?.brightness)),
//             framerate: parseFloat(checkBlank(newFPS.value, cameraFeedData.value?.framerate)),
//             hue: parseInt(checkBlank(newHue.value, cameraFeedData.value?.hue)),
//             saturation: parseInt(checkBlank(newSaturation.value, cameraFeedData.value?.saturation))
//         })
//     };
//     try {
//         const response = await fetch(cameraConfigApiURL.value, requestOptions);
//         if (!response.ok) {
//             throw new Error(`HTTP error: ${response.status}`);
//         }

//         const contentType = response.headers.get("content-type");
//         if (contentType && contentType.includes("application/json")) {
//             const data = await response.json();
//             console.log('Success:', data);
//         } else {
//             console.log('Success: Saved successfully (No JSON returned)');
//         }
//         saveState.value = 'success'
//         // update gui after successfull post
//         postConfigTrue()
//     } catch (error) {
//         console.error('Error updating camera:', error);
//         saveState.value = 'error'
//     }
// }

// post gui_update Config bool to true
// async function postConfigTrue() {
//     const requestOptions = {
//         method: 'POST',
//         headers: {
//             'Content-Type': 'application/json'
//         },
//         body: JSON.stringify({
//             setpoint: false,
//             config: true
//         })
//     };
//     try {
//         const response = await fetch(guiUpdateApiURL.value, requestOptions)
//         if (!response.ok) {
//             throw new Error(`HTTP error: ${response.status}`)
//         }
//         const data = await response.json()
//     } catch (error) {
//         console.error('Error fetching camera data:', error)
//     }
// }
//------------------------------------------------------------------------------------------------
// All REST-ful api methods and variables have been commented out but not deleted as a redundancy
//------------------------------------------------------------------------------------------------

// ------------------------------
//        Sample data Methods
// ------------------------------

// function to find the configuration that matches the selected cameras conn_id and camera_id
function findConfig(conn_id, camera_id) {
  return (
    sampleCameraConfiguration.configurations.find(
      (c) => c.conn_id === conn_id && c.camera_id === camera_id
    ) ?? null
  )
}

// control filter function for selected camera
function controlFilter(controlName) {
  return selectedConfig.value?.configuration?.[controlName] ?? null
}
// ------------------------------
//          Methods
// ------------------------------
// Load current values from the matched config. must be used after select config is set
function loadCameraValues() {
  if (!selectedConfig.value) {
    newFPS.value = null
    newBrightness.value = null
    newContrast.value = null
    newHue.value = null
    newSaturation.value = null
    newGamma.value = null
    newGain.value = null
    newExposureAbsolute.value = null
    newAutoExposure.value = null
    return
  }
  const config = selectedConfig.value.configuration

  newFPS.value = selectedConfig.value.fps ?? null
  newBrightness.value = config.Brightness?.IntegerRange?.value?.ConValueInteger ?? null
  newContrast.value = config.Contrast?.IntegerRange?.value?.ConValueInteger ?? null
  newHue.value = config.Hue?.IntegerRange?.value?.ConValueInteger ?? null
  newSaturation.value = config.Saturation?.IntegerRange?.value?.ConValueInteger ?? null
  newGamma.value = config.Gamma?.IntegerRange?.value?.ConValueInteger ?? null
  newGain.value = config.Gain?.IntegerRange?.value?.ConValueInteger ?? null
  newExposureAbsolute.value = config.ExposureAbsolute?.IntegerRange?.value?.ConValueInteger ?? null
  newAutoExposure.value = config.AutoExposure?.Menu?.value?.ConValueMenu ?? null
}
// set selected control values to the defualt settings
function setDefault(controlName) {
  const control = controlFilter(controlName)
  if (!control) return

  const defualtValue = control.IntegerRange?.default ?? control.Menu?.default
  if (defualtValue === undefined) return

  switch (controlName) {
    case 'Brightness': newBrightness.value = defualtValue; break
    case 'Contrast': newContrast.value = defualtValue; break
    case 'Hue': newHue.value = defualtValue; break
    case 'Saturation': newSaturation.value = defualtValue; break
    case 'Gamma': newGamma.value = defualtValue; break
    case 'Gain': newGain.value = defualtValue; break
    case 'ExposureAbsolute': newExposureAbsolute.value = defualtValue; break
    case 'AutoExposure': newAutoExposure.value = defualtValue; break
  }
}

// set frame rate to default
function setDefaultFPS() {
  if (isLive.value) {
    // Add when API route becomes avaible
  } else {
    newFPS.value = 1
  }
}
function saveFrameRate() {
  if (!selectedCamera.value || !selectedConfig.value) return
  saveState.value = ''
  if (isLive.value) {
    // TODO: there's currently no websocket path for fram rate
    console.warn('Saving frame rate against a live camera is not supported yet.')
  } else {
    selectedConfig.value = {
      ...selectedConfig.value,
      fps: checkBlank(newFPS.value, selectedConfig.value.fps),
    }
    saveState.value = 'success'
  }
}

// set all values to default
function resetControlConfig() {
  if (!selectedConfig.value) return

  const config = selectedConfig.value.configuration

  // Map of control name -> the ref that holds its form value
  const controlRefs = {
    Brightness: newBrightness,
    Contrast: newContrast,
    Saturation: newSaturation,
    Hue: newHue,
    Gamma: newGamma,
    Gain: newGain,
    ExposureAbsolute: newExposureAbsolute,
    AutoExposure: newAutoExposure,
  }

  // loop through the name
  for (const [controlName, targetRef] of Object.entries(controlRefs)) {
    const control = config[controlName]
    if (!control) continue // camera doesn't have this control

    const def = control.IntegerRange?.default ?? control.Menu?.default
    if (def === undefined) continue

    targetRef.value = def
  }
}

// set the threashold values to defualt (alert_below_threshold)
function resetAlertThreshold() {
  if (!selectedCamera.value) return
  if (isLive.value) {
    // add APi function when avaible
    if (!defaultThresholds.value) {
      console.warn('Default thresholds have not loaded from the server yet.')
      return
    }
    newAlertThreshold.value = defaultThresholds.value.alert_below_threshold * 100
  } else {
    newAlertThreshold.value = 80
  }

}

// rest the warn threshold (warn_below_threshold)
function resetWarningThreshold() {
  if (!selectedCamera.value) return
  if (isLive.value) {
    if (!defaultThresholds.value) {
      console.warn('Default thresholds have not loaded from the server yet.')
      return
    }
    newWarningThreshold.value = defaultThresholds.value.warn_below_threshold * 100
  } else {
    newWarningThreshold.value = 95
  }
}

// sets the default threshold for all deviation thresholds
function resetAllThresholds() {
  if (isLive.value) {
    if (!defaultThresholds.value) {
      console.warn('Default thresholds have not loaded from the server yet.')
      return
    }
    newWarningThreshold.value = defaultThresholds.value.warn_below_threshold * 100
    newAlertThreshold.value = defaultThresholds.value.alert_below_threshold * 100
  } else {
    resetAlertThreshold()
    resetWarningThreshold()
  }
}

// save thresholds
function saveThresholds() {
  if (!selectedCamera.value) return
  saveState.value = ''

  const warning = newWarningThreshold.value / 100
  const alert = newAlertThreshold.value / 100

  if (isLive.value) {
    try {
      setCameraThresholds(selectedCamera.value.conn_id, selectedCamera.value.camera_id, warning, alert)
      listCameras() // refresh camera list
    } catch (e) {
      console.error('Error updating thresholds:', e)
    }
  } else {
    selectedCamera.value.warn_below_threshold = warning
    selectedCamera.value.alert_below_threshold = alert
    saveState.value = 'success'
  }
}

// set global defualt threshold on server
function setServerDefaultThreshold() {
  if (!selectedCamera.value) return

  const warning = newWarningThreshold.value / 100
  const alert = newAlertThreshold.value / 100

  if (isLive.value) {
    try {
      setDefaultThreshold(warning, alert)
      // update the default values
      getDefaultThresholds()
    } catch(e) {
      console.error('Error setting default thresholds:', e)
    }
  }
}

// --------------------
//        Watchers
// --------------------

// watch the seleceted camera to load it's values when it changes
watch(selectedCamera, (cam, oldCam) => {
  saveState.value = ''
  selectedConfig.value = null

  if (!cam) {
    if (isLive.value && oldCam) {
      stopViewingCamera(oldCam.conn_id, oldCam.camera_id)
    }
    loadCameraValues()
    return
  }
  // load camera list values
  newName.value = cam.name
  newAlertThreshold.value = cam.alert_below_threshold * 100
  newWarningThreshold.value = cam.warn_below_threshold * 100

  if (isLive.value) {
    viewCamera(cam.conn_id, cam.camera_id)
    viewCameraConfig(cam.conn_id, cam.camera_id)
    // selectedConfig gets filled in by the controlConfig watcher below once the server replies
  } else {
    selectedConfig.value = findConfig(cam.conn_id, cam.camera_id)
    loadCameraValues()
  }
})

// watch to apply the server's Configuration reply once it matches the currently selected camera
watch(controlConfig, (config) => {
  if (!isLive.value || !config || !selectedCamera.value) return
  if (config.conn_id === selectedCamera.value.conn_id
    && config.camera_id === selectedCamera.value.camera_id) {
    selectedConfig.value = config
    loadCameraValues()
  }
})

// watch the camera list to keep track of the connected and disconeted cameras to keep the camera feed fresh
watch(wsCameraList, () => {
  if (!isLive.value || !selectedCamera.value) return

  const freshCam = wsCameraList.value.find(
    (cam) => cam.conn_id === selectedCamera.value.conn_id
      && cam.camera_id === selectedCamera.value.camera_id
  )
  if (!freshCam || freshCam.state !== 'Active') {
    selectedCamera.value = ''
    return
  }
  Object.assign(selectedCamera.value, freshCam)
})

watch(selectedMicroComputer, () => {
  clearSelectedCamera()
  if (selectedMicroComputer.value && selectedMicroComputer.value !== 'all') {
    newMicroComputerName.value = selectedMicroComputer.value.name
    if (isLive.value) {
      // add vision processing when api has a path for its value
    } else {
      newVisionProcessing.value = selectedMicroComputer.value.Menu.value.ConValueMenu
    }
  }
})

watch(newWarningThreshold, (newValue) => {
  if (newValue <= newAlertThreshold.value) {
    newAlertThreshold.value = newValue - 1
  }
})

watch(newAlertThreshold, (newValue) => {
  if (newValue >= newWarningThreshold.value) {
    newWarningThreshold.value = newValue + 2
  }
})

// -------------------------------
//        onMount and unMount
// -------------------------------
onMounted(() => {
    //fetchCameraConfig()
    connect() // gets the edge list and camera list in its function
    getDefaultThresholds()
});
</script>
<template>
    <div class="container">
        <div class="row">
            <div class="col">
            <!-- for testing remove in final product -->
                <div class="text-center mb-2 p-1">
                    <span v-if="isLive" class="badge bg-success">Live: Connected to server</span>
                    <span v-else class="badge bg-secondary">Offline: Showing sample data for local testing</span>
                </div>
            <!-- for testing remove in final product -->
                <form @submit.prevent="">
                    <div class="form">
                        <div class="pb-3">
                            <h2 class="config-title">µ-Computer Configuration</h2>
                            <label for="microCompSelect" class="config-label"><h3 class="config-label">Select µ-Computer</h3></label>
                            <div class="form-element">
                                <select class="w-100" id="microCompSelect" required v-model="selectedMicroComputer">
                                    <option value="" disabled selected>Please select a µ-computer</option>
                                    <option value="all">Select All µ-computers</option>
                                    <option v-for="(com, index) in activeMicroComputers" :key="`${com.conn_id}`" :value="com">
                                        [ {{index + 1}} ] : {{com.name}}
                                    </option>
                                </select>
                            </div>

                            <div v-if="selectedMicroComputer && selectedMicroComputer !== 'all'">
                                <label for="rename" class="config-label">Rename µ-Computer</label>
                                <div class="form-element">
                                    <input type="text" id="rename" class="w-100" v-model="newMicroComputerName">
                                    <button type="button" class="btn submit-btn" @click="showRenameMicroCompConfrim = true">Rename</button>
                                    <ConfirmationBox v-model="showRenameMicroCompConfrim" :message="'Rename the selected micro-computer to ' + newMicroComputerName + '?'" :onConfirmFunction="renameMicroComputer"/>
                                </div>
                            </div>
                            <div v-if="selectedMicroComputer && selectedMicroComputer !== 'all'">
                                <label for="vision-process" class="config-label">Select Vision Processing Method</label>
                                <div class="form-element">
                                    <select class="menu-input" id="vision-process" v-model.number="newVisionProcessing">
                                        <!-- TODO: this needs to be fixed to match the data that is sent thorugh -->
                                        <option v-for="item in selectedMicroComputer.Menu.items" :key="item.id" :value="item.id">
                                            {{item.item.Name}}
                                        </option>
                                    </select>
                                    <button type="button" class="btn submit-btn" @click="showSelectVisionProcessingConfrim = true">Select</button>
                                    <ConfirmationBox v-model="showSelectVisionProcessingConfrim" message="Please click Confrim to chanage the Vision Processing Method" :onConfirmFunction="submitVisionProcessing"/>
                                </div>
                            </div>
                            <hr class="line-break">
                        </div>
                        <h2 class="config-title">Camera Configuration</h2>
                        <label for="cameraSelect" class="config-label"><h3 class="config-label">Select Camera</h3></label>
                        <div class="form-element">
                            <select class="w-100" id="cameraSelect" required v-model="selectedCamera">
                                <option value="" disabled selected>Please select a camera</option>
                                <option v-for="(cam, index) in activeCameras" :key="`${cam.conn_id}-${cam.camera_id}`" :value="cam">
                                    [ {{selectedMicroComputer.name}} - {{index + 1}} ] : {{cam.name}}
                                </option>
                            </select>
                        </div>
                        <div v-if="selectedConfig">
                            <label for="rename" class="config-label">Rename Camera</label>
                            <div class="form-element">
                                <input type="text" id="rename" class="w-100" v-model="newName">
                                <button type="button" class="btn submit-btn" @click="showRenameCameraConfrim = true">Rename</button>
                                <ConfirmationBox v-model="showRenameCameraConfrim" :message="'Rename the selected camera to ' + newName + '?'" :onConfirmFunction="renameCamera"/>
                            </div>
                        </div>
                        <hr class="line-break" v-if="selectedCamera">
                        <h4 class="pt-3 pb-2 config-subtitle" v-if="selectedCamera">Camera Controls</h4>
                        <div v-if="controlFilter('Brightness')">
                            <label for="brightness-range" class="config-label">Brightness</label>
                            <div class="form-element">
                                <input type="range" class="slider-input" id="brightness-range" v-model.number="newBrightness"
                                    :min="controlFilter('Brightness').IntegerRange.min"
                                    :max="controlFilter('Brightness').IntegerRange.max"
                                    :step="controlFilter('Brightness').IntegerRange.step">
                                <input type="number" class="number-input" id="brightness-number" v-model.number="newBrightness"
                                    :min="controlFilter('Brightness').IntegerRange.min"
                                    :max="controlFilter('Brightness').IntegerRange.max"
                                    :step="controlFilter('Brightness').IntegerRange.step">
                                <button type="button" class="btn submit-btn" @click="setDefault('Brightness')">Reset</button>
                            </div>
                        </div>
                        <div v-if="controlFilter('Contrast')">
                            <label for="contrast-range" class="config-label">Contrast</label>
                            <div class="form-element">
                                <input type="range" class="slider-input" id="contrast-range" v-model.number="newContrast"
                                    :min="controlFilter('Contrast').IntegerRange.min"
                                    :max="controlFilter('Contrast').IntegerRange.max"
                                    :step="controlFilter('Contrast').IntegerRange.step">
                                <input type="number" class="number-input" id="contrast-number" v-model.number="newContrast"
                                    :min="controlFilter('Contrast').IntegerRange.min"
                                    :max="controlFilter('Contrast').IntegerRange.max"
                                    :step="controlFilter('Contrast').IntegerRange.step">
                                <button type="button" class="btn submit-btn" @click="setDefault('Contrast')">Reset</button>
                            </div>
                        </div>
                        <div v-if="controlFilter('Hue')">
                            <label for="hue-range" class="config-label">Hue</label>
                            <div class="form-element">
                                <input type="range" class="slider-input" id="hue-range" v-model.number="newHue"
                                    :min="controlFilter('Hue').IntegerRange.min"
                                    :max="controlFilter('Hue').IntegerRange.max"
                                    :step="controlFilter('Hue').IntegerRange.step">
                                <input type="number" class="number-input" id="hue-number" v-model.number="newHue"
                                    :min="controlFilter('Hue').IntegerRange.min"
                                    :max="controlFilter('Hue').IntegerRange.max"
                                    :step="controlFilter('Hue').IntegerRange.step">
                                <button type="button" class="btn submit-btn" @click="setDefault('Hue')">Reset</button>
                            </div>
                        </div>
                        <div v-if="controlFilter('Saturation')">
                            <label for="saturation-range" class="config-label">Saturation</label>
                            <div class="form-element">
                                <input type="range" class="slider-input" id="saturation-range" v-model.number="newSaturation"
                                    :min="controlFilter('Saturation').IntegerRange.min"
                                    :max="controlFilter('Saturation').IntegerRange.max"
                                    :step="controlFilter('Saturation').IntegerRange.step">
                                <input type="number" class="number-input" id="saturation-number" v-model.number="newSaturation"
                                    :min="controlFilter('Saturation').IntegerRange.min"
                                    :max="controlFilter('Saturation').IntegerRange.max"
                                    :step="controlFilter('Saturation').IntegerRange.step">
                                <button type="button" class="btn submit-btn" @click="setDefault('Saturation')">Reset</button>
                            </div>
                        </div>
                        <div v-if="controlFilter('Gamma')">
                            <label for="gamma-range" class="config-label">Gamma</label>
                            <div class="form-element">
                                <input type="range" class="slider-input" id="gamma-range" v-model.number="newGamma"
                                    :min="controlFilter('Gamma').IntegerRange.min"
                                    :max="controlFilter('Gamma').IntegerRange.max"
                                    :step="controlFilter('Gamma').IntegerRange.step">
                                <input type="number" class="number-input" id="gamma-number" v-model.number="newGamma"
                                    :min="controlFilter('Gamma').IntegerRange.min"
                                    :max="controlFilter('Gamma').IntegerRange.max"
                                    :step="controlFilter('Gamma').IntegerRange.step">
                                <button type="button" class="btn submit-btn" @click="setDefault('Gamma')">Reset</button>
                            </div>
                        </div>
                        <div v-if="controlFilter('Gain')">
                            <label for="gain-range" class="config-label">Gain</label>
                            <div class="form-element">
                                <input type="range" class="slider-input" id="gain-range" v-model.number="newGain"
                                    :min="controlFilter('Gain').IntegerRange.min"
                                    :max="controlFilter('Gain').IntegerRange.max"
                                    :step="controlFilter('Gain').IntegerRange.step">
                                <input type="number" class="number-input" id="gain-number" v-model.number="newGain"
                                    :min="controlFilter('Gain').IntegerRange.min"
                                    :max="controlFilter('Gain').IntegerRange.max"
                                    :step="controlFilter('Gain').IntegerRange.step">
                                <button type="button" class="btn submit-btn" @click="setDefault('Gain')">Reset</button>
                            </div>
                        </div>
                        <div v-if="controlFilter('AutoExposure')">
                            <label for="autoExposure" class="config-label">Auto Exposure</label>
                            <div class="form-element">
                                <select class="menu-input" id="autoExposure" v-model.number="newAutoExposure">
                                    <option v-for="item in controlFilter('AutoExposure').Menu.items" :key="item.id" :value="item.id">
                                        {{ item.item.Name }}
                                    </option>
                                </select>
                                <button type="button" class="btn submit-btn" @click="setDefault('AutoExposure')">Reset</button>
                            </div>
                        </div>
                        <div v-if="controlFilter('ExposureAbsolute')">
                            <label for="exposure-range" class="config-label">Exposure (Absolute)</label>
                            <div class="form-element">
                                <input type="range" class="slider-input" id="exposure-range" v-model.number="newExposureAbsolute"
                                :min="controlFilter('ExposureAbsolute').IntegerRange.min"
                                    :max="controlFilter('ExposureAbsolute').IntegerRange.max"
                                    :step="controlFilter('ExposureAbsolute').IntegerRange.step">
                                <input type="number" class="number-input" id="exposure-number" v-model.number="newExposureAbsolute"
                                    :min="controlFilter('ExposureAbsolute').IntegerRange.min"
                                    :max="controlFilter('ExposureAbsolute').IntegerRange.max"
                                    :step="controlFilter('ExposureAbsolute').IntegerRange.step">
                                <button type="button" class="btn submit-btn" @click="setDefault('ExposureAbsolute')">Reset</button>
                            </div>
                        </div>
                        <div class="mt-1 text-center d-flex flex-row justify-content-center gap-3" v-if="selectedCamera">
                            <button class="btn submit-btn" @click="showSaveAllControlsConfrim = true">Save Camera Controls</button>
                            <ConfirmationBox v-model="showSaveAllControlsConfrim" message="Would you like to save all camera controls?" :onConfirmFunction="saveChanges"/>
                            <button class="btn submit-btn" @click="showResetAllControlsConfrim = true">Reset Camera Controls</button>
                            <ConfirmationBox v-model="showResetAllControlsConfrim" message="Would you like to reset all camera controls?" :onConfirmFunction="resetControlConfig"/>
                        </div>
                        <!-- added a success response needs extra logic as the websocket is a send a forget unlike restful -->
                        <!-- <div v-if="saveState === 'success'" class="text-center p-1">
                            <p>Settings saved successfully.</p>
                        </div>
                        <div v-if="saveState === 'error'" class="text-center p-1">
                            <p>Failed to save settings. Please try again.</p>
                        </div> -->
                        <!-- fps probs be handled by a another route and not with the control filters -->
                        <hr class="line-break" v-if="controlFilter('fps')">
                        <h4 class="pt-3 pb-2 config-subtitle" v-if="controlFilter('fps')">Refresh Rate</h4>
                        <div v-if="controlFilter('fps')">
                            <label for="fps-range" class="config-label">Frame Rate</label>
                            <div class="form-element">
                                <input type="range" class="slider-input" id="fps-range" v-model.number="newFPS" min="1" max="5" step="1">
                                <input type="number" class="number-input" id="fps-number" v-model.number="newFPS" min="1" max="5" step="1">
                            </div>
                            <div class="mt-1 text-center d-flex flex-row justify-content-center gap-3" v-if="selectedCamera">
                                <button class="btn submit-btn" @click="showSaveFrameRateConfrim = true">Save Frame Rate</button>
                                <ConfirmationBox v-model="showSaveFrameRateConfrim" message="Would you like to save the frame rate?" />
                                <button type="button" class="btn submit-btn" @click="showResetFrameRateConfrim = true">Reset Frame Rate</button>
                                <ConfirmationBox v-model="showResetFrameRateConfrim" message="Would you like to reset the frame rate?" :onConfirmFunction="setDefaultFPS"/>
                            </div>
                        </div>
                        <hr class="line-break" v-if="selectedCamera">
                        <h4 class="pt-3 pb-2 config-subtitle" v-if="selectedCamera">Deviation Thresholds</h4>
                        <div v-if="selectedConfig">
                            <label for="fps-range" class="config-label">Warning Threshold</label>
                            <div class="form-element">
                                <input type="range" class="slider-input" id="warning-range" v-model.number="newWarningThreshold" min="2" max="100" step="1">
                                <input type="number" class="number-input" id= "warning-number" v-model.number="newWarningThreshold" min="2" max="100" step="1">
                            </div>
                        </div>
                        <div v-if="selectedConfig">
                            <label for="fps-range" class="config-label">Alert Threshold</label>
                            <div class="form-element">
                                <input type="range" class="slider-input" id="critical-range" v-model.number="newAlertThreshold" min="1" max="99" step="1">
                                <input type="number" class="number-input" id= "critical-number" v-model.number="newAlertThreshold" min="1" max="99" step="1">
                            </div>
                        </div>
                        <div class="mt-1 text-center d-flex flex-row justify-content-center gap-3" v-if="selectedCamera">
                            <button class="btn submit-btn" @click="showSaveThresholdsConfrim = true">Save Thresholds</button>
                            <ConfirmationBox v-model="showSaveThresholdsConfrim" message="Would you like to save the Deviation Thresholds?" :onConfirmFunction="saveThresholds" />
                            <button type="button" class="btn submit-btn" @click="showResetThresholdsConfrim = true">Reset to Default</button>
                            <ConfirmationBox v-model="showResetThresholdsConfrim" message="Would you like to reset all Devation Thresholds to default?" :onConfirmFunction="resetAllThresholds"/>
                            <button type="button" class="btn submit-btn" @click="showSetDefaultThresholdConfrim = true">Set Global Default Thresholds</button>
                            <ConfirmationBox v-model="showSetDefaultThresholdConfrim" message="Would you like to set the defualt value for the thresholds?" :onConfirmFunction="setServerDefaultThreshold"/>
                        </div>
                    </div>
                    <hr class="line-break" v-if="selectedCamera">
                </form>
            </div>
            <div class="col-12">
                <div class=" col-12 d-flex mt-2 feed-row" v-if="selectedCamera">
                    <div v-if="isLive && imageSrc" class="w-100">
                        <img :src="imageSrc" alt="Live Camera Feed" class="feedbox w-100 h-100">
                    </div>
                    <div v-else-if="selectedConfig" class="w-100">
                        <img src="../assets/images/fake-feed.png" alt="Sample Camera Feed" class="feedbox w-100 h-100">
                    </div>
                    <div v-else-if="!selectedCamera" class="w-100">
                        <img src="../assets/images/no-camera-selected.png" alt="No camera selected" class="feedbox w-100 h-100">
                    </div>
                    <div v-else class="w-100">
                        <img src="../assets/images/no-camera-connected.png" alt="No Cameras Connected" class="feedbox w-100 h-100 ">
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>
<style scoped>
.config-label {
    font-weight: 500;
    font-size: 16pt;
    color: var(--config-title);
    font-family: 'Franklin Gothic Medium', 'Arial Narrow', Arial, sans-serif;
}
.config-title {
    font-weight: 600;
    font-size: 20pt;
    color: var(--config-title);
    font-family: 'Franklin Gothic Medium', 'Arial Narrow', Arial, sans-serif;
}
.config-subtitle {
    font-weight: 600;
    font-size: 18pt;
    color: var(--config-title);
    font-family: 'Franklin Gothic Medium', 'Arial Narrow', Arial, sans-serif;
}
.number-input{
    flex: 0 0 4em;
    width: 4em;
    padding: 0.25em;
    border-radius: 0.5em;
    border: 3px solid var(--nav-bg);
    background-color: var(--bs-body-bg);
    color: var(--bs-body-color);
}
.slider-input{
    flex: 1 1 auto;
    width: 100%;
    accent-color: var(--nav-bg);
    border-radius: 2em;
}
.slider-input:hover{
    accent-color: var(--button-hover);
}
.menu-input{
    width: 100%;
}
.form-element{
    display: flex;
    flex-direction: row;
    align-items: center;
    gap: 1em;
    padding: 0.20em;
}
select {
    padding: 0.5em;
}
option:hover{
    background-color: var(--button-hover);
}
.form{
    display: flex;
    flex-direction: column;
    padding: 0.5em;
}
.feed-row {
    max-width: 640px;
    margin: 0 auto;
}
.feedbox {
    border: 0.5rem solid var(--nav-bg);
    border-radius: 1rem;
    box-shadow: 0 0 0.45rem var(--button-hover);
    background-color: var(--cam-bg);
    object-fit: contain;
    max-height: 500px;
}
.line-break {
    border: none;
    height: 3px;
    color: var(--config-title);
    background-color: var(--line-break-color);
}
</style>
