<script setup>
import { ref, onMounted, watch } from 'vue'
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
const cameraConfigApiURL = ref('/api/configuration')
const guiUpdateApiURL = ref('/api/gui_update')
const cameraFeedData = ref([])
const selectedCamera = ref('')
// --------------------
//     Sample Data
// --------------------
import sampleCameraList from '../assets/data/sampleCameraList.json'
import sampleCameraConfiguration from '../assets/data/sampleCameraConfiguration.json'
// Api post values
const newFPS = ref(null)
const newBrightness = ref(null)
const newContrast = ref(null)
const newHue = ref(null)
const newSaturation = ref(null)
// for save message e.g. success | error
const saveState = ref('')
// --------------------
//        Computed
// --------------------

// --------------------
//        Methods
// --------------------
// check for empty value if empty returns the current value if not returns the newValue from form.
function checkBlank(newValue, currentValue) {
    if (newValue === '' || newValue === null) {
        return currentValue;
    }
    return newValue;
}

//fetch method for read function
async function fetchCameraConfig() {
    try {
        const response = await fetch(cameraConfigApiURL.value)
        if (!response.ok) {
            throw new Error(`HTTP error: ${response.status}`)
        }
        const data = await response.json()
        cameraFeedData.value = data
    } catch (error) {
        console.error('Error fetching camera data:', error)
    }
}
// fetch method for update for config
async function postConfigData() {
    saveState.value = '' // reset before each attempt
    const requestOptions = {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            // if the new function are blank or empty use the data got by the read funciton
            brightness: parseInt(checkBlank(newBrightness.value, cameraFeedData.value?.brightness)),
            framerate: parseFloat(checkBlank(newFPS.value, cameraFeedData.value?.framerate)),
            hue: parseInt(checkBlank(newHue.value, cameraFeedData.value?.hue)),
            saturation: parseInt(checkBlank(newSaturation.value, cameraFeedData.value?.saturation))
        })
    };
    try {
        const response = await fetch(cameraConfigApiURL.value, requestOptions);
        if (!response.ok) {
            throw new Error(`HTTP error: ${response.status}`);
        }

        const contentType = response.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
            const data = await response.json();
            console.log('Success:', data);
        } else {
            console.log('Success: Saved successfully (No JSON returned)');
        }
        saveState.value = 'success'
        // update gui after successfull post
        postConfigTrue()
    } catch (error) {
        console.error('Error updating camera:', error);
        saveState.value = 'error'
    }
}

// post gui_update Config bool to true
async function postConfigTrue() {
    const requestOptions = {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            setpoint: false,
            config: true
        })
    };
    try {
        const response = await fetch(guiUpdateApiURL.value, requestOptions)
        if (!response.ok) {
            throw new Error(`HTTP error: ${response.status}`)
        }
        const data = await response.json()
    } catch (error) {
        console.error('Error fetching camera data:', error)
    }
}
// control filter function for selected camera
function controlFilter(controlName) {
  return selectedCamera.value?.controls?.find(c => c.control === controlName) ?? null
}

// set all control values to the defualt settings
function setDefault(controlName) {
  selectedCamera.value.controls.controlName.value = selectedCamera.value.controls.controlName.default
}
// --------------------
//        Watchers
// --------------------
// watch(newFPS, (val) => {
//     if (val < 1) newFPS.value = 1;
//     if (val > 30) newFPS.value = 30;
// });
// -------------------------------
//        onMount and unMount
// -------------------------------
onMounted(() => {
    fetchCameraConfig()
});
</script>
<template>
    <div class="container">
        <div class="row">
            <div class="col">
                <form @submit.prevent="postConfigData">
                    <div class="form">
                        <label for="cameraSelect" class="config-label">Camera Select</label>
                        <select class="" id="cameraSelect" required v-model="selectedCamera">
                            <option value="" disabled selected>Please select a camera</option>
                            <option v-for="cam in sampleCameraData.cameras" :key="cam.id" :value="cam">
                                {{cam.name}}
                            </option>
                        </select>
                        <div v-if="controlFilter('Brightness')">
                            <label for="brightness" class="config-label">Brightness</label>
                            <div class="form-element">
                                <input type="range" class="slider-input" id="brightness" v-model="newBrightness" min="-64"
                                max="64" step="1" :placeholder="selectedCamera.controls">
                                <input type="number" class="number-input" id="brightness" v-model="newBrightness" min="-64"
                                max="64" step="1" placeholder="0">
                            </div>
                        </div>
                        <div v-if="controlFilter('Contrast')">
                            <label for="contrast" class="config-label">Contrast</label>
                            <div class="form-element">
                                <input type="range" class="slider-input" id="contast" v-model="newContrast" min="0"
                                max="64" step="1" placeholder="32">
                                <input type="number" class="number-input" id="contrast" v-model="newContrast" min="0" max="64" step="1" placeholder="32">
                            </div>
                        </div>
                        <div v-if="controlFilter('Hue')">
                            <label for="hue" class="config-label">Hue</label>
                            <div class="form-element">
                                <input type="range" class="slider-input" id="hue" v-model="newHue" min="-40"
                                max="40" step="1" placeholder="0">
                                <input type="number" class="number-input" id="hue" v-model="newHue" min="-40" max="40" step="1" placeholder="0">
                            </div>
                        </div>
                        <div v-if="controlFilter('Saturation')">
                            <label for="saturation" class="config-label">Saturation</label>
                            <div class="form-element">
                                <input type="range" class="slider-input" id="saturation" v-model="newSaturation" min="0"
                                max="128" step="1" placeholder="64">
                                <input type="number" class="number-input" id="saturation" v-model="newSaturation" min="0"
                                    max="128" step="1" placeholder="64">
                            </div>
                        </div>
                        <div v-if="selectedCamera.fps">
                            <label for="fps" class="config-label">Frame Rate</label>
                            <div class="form-element">
                                <input type="range" class="slider-input" id="fps" v-model="newFPS" min="1.0"
                                max="30.00" step="1.0" placeholder="1.0">
                                <input type="number" class="number-input" id="fps" v-model="newFPS" min="1.0" max="30.00"
                                    step="1.0" placeholder="1.0">
                            </div>
                        </div>

                        <div class="mt-2 text-center">
                            <button class="btn submit-btn">Save Changes</button>
                        </div>
                        <div v-if="saveState === 'success'" class="text-center p-1">
                            <p>Settings saved successfully.</p>
                        </div>
                        <div v-if="saveState === 'error'" class="text-center p-1">
                            <p>Failed to save settings. Please try again.</p>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    </div>
</template>
<style scoped>
.config-label {
    font-weight: bold;
    font-size: 16pt;
    color: var(--config-title);
    font-family: 'Franklin Gothic Medium', 'Arial Narrow', Arial, sans-serif;
}
.submit-btn {
    background-color: var(--nav-bg);
    border-color: darkslateblue;
    color: white
}

.submit-btn:hover {
    background-color: var(--button-hover);
    border-color: slateblue;
    color: black;
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
.form-element{
    display: flex;
    flex-direction: row;
    align-items: center;
    gap: 1em;
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
</style>
