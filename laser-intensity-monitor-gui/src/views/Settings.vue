<script setup>
import { ref, onMounted } from 'vue';
// composables
import { useTheme } from '../composables/useTheme';
const { theme, toggleTheme } = useTheme();
// icons
import arrowUp from '../assets/images/arrow-up.svg';
import arrowDown from '../assets/images/arrow-down.svg';
// conponents
import ConfirmationBox from '../components/ConfirmationBox.vue';
// helper funtions
import {checkBlank} from '../utils/helpers'
// --------------------------
//        V-model values
// --------------------------

// toggle settings sections
const isGUI = ref(true);
const isServer = ref(true);
const isSetServerDefault = ref(true);

// show confrimation window values
const showSetDefaultConfrim = ref(false);
const showResetDefaultConfrim = ref(false);

// Restful API routes
const urlGetServerDefault = ref('/api/default_config');
const urlPostServerDefault = ref('/api/write_default_config');

// states
const saveState = ref('');
const isLive = ref(false);

// Data from server
const serverSettings = ref(null);

// User input data
const newWebsocketPollInterval = ref(null);
const newUpdateDelay = ref(null);
const newCameraErrorDecrement = ref(null);
const newCameraErrorIncrement = ref(null);
const newCameraErrorThreshold = ref(null);

// Validation
const validationServerDefaultsErrors = ref([]);

// Hard Coded min max and step values for server default settings
const minMaxStep = {
  websocket_poll_interval: { min: 1000, max: 30000, step: 10,}, // in ms
  update_delay: { min: 10, max: 10000, step: 10,}, // in ms
  camera_err_decrement: { min: 1, max: 64, step: 1,},
  camera_err_increment: { min: 1, max: 64, step: 1,},
  camera_err_threshold: { min: 1, max: 256, step: 1,},
};

// Hard Coded Default vlaues
const serverSettingDefaults = {
  websocket_poll_interval_default: 1500, // in ms
  update_delay_default: 500, // in ms
  camera_err_decrement_default: 1,
  camera_err_increment_default: 1,
  camera_err_threshold_default: 5,
};

// --------------------------
//       Resful Methods
// --------------------------

// get default settings
// used for fetching the current values for the Server settings page.
async function getDefaultSettings() {
  try {
    const response = await fetch(urlGetServerDefault.value);
    if (!response.ok) {
      throw new Error(`HTTP error: ${response.status}`);
    }
    const data = await response.json();
    serverSettings.value = data;
    isLive.value = true;
  } catch (error){
    console.error('Error fetching camera data:', error);
    isLive.value = false;
  }
}

// post new defualt settings
async function postDefaultServerSettings() {
  saveState.value = '';

  const requestOptions = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      // add check blank handling
      websocket_poll_interval:  msToDuration(checkBlank(newWebsocketPollInterval.value, serverSettings.value?.websocket_poserverSettings)),
      update_delay: msToDuration(checkBlank(newUpdateDelay.value, serverSettings.value?.update_delay)),
      camera_err_decrement: checkBlank(newCameraErrorDecrement.value, serverSettings.value?.camera_err_decrement),
      camera_err_increment: checkBlank(newCameraErrorIncrement.value, serverSettings.value?.camera_err_increment),
      camera_err_threshold: checkBlank(newCameraErrorThreshold.value, serverSettings.value?.camera_err_threshold),
    }),
  };

  try {
    const response = await fetch(urlPostServerDefault.value, requestOptions);
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

    saveState.value = 'success';
  } catch (error){
    console.error('Error updating camera:', error);

    saveState.value = 'error';
  }
}

// -------------------------------
//       Helper Methods
// -------------------------------

// Duration rust data type to ms
function durationToMs(duration) {
  return duration.secs * 1000 + duration.nanos / 1_000_000;
}
// ms to Duration rust data type
function msToDuration(ms) {
  const duration = {
    secs: Math.floor(ms / 1000),
    nanos: (ms % 1000) * 1_000_000,
  };
  return duration;
}
// load data
async function loadServerDefaultData() {
  await getDefaultSettings();
  if (!isLive.value) return;
  // load the current default values
  newWebsocketPollInterval.value = durationToMs(serverSettings.value.websocket_poll_interval);
  newUpdateDelay.value = durationToMs(serverSettings.value.update_delay);
  newCameraErrorDecrement.value = serverSettings.value.camera_err_decrement;
  newCameraErrorIncrement.value = serverSettings.value.camera_err_increment;
  newCameraErrorThreshold.value = serverSettings.value.camera_err_threshold;
}

// Reset Defualt value
function resetServerDefault() {

}
// Rest all Defualt values
function resetAllServerDefaults() {
  newWebsocketPollInterval.value = serverSettingDefaults.websocket_poll_interval_default;
  newUpdateDelay.value = serverSettingDefaults.update_delay_default;
  newCameraErrorDecrement.value = serverSettingDefaults.camera_err_decrement_default;
  newCameraErrorIncrement.value = serverSettingDefaults.camera_err_increment_default;
  newCameraErrorThreshold.value = serverSettingDefaults.camera_err_threshold_default;
}
// -------------------------------
//        Validation
// -------------------------------

function validateServerSettings() {
  return true;
}

function requestSaveServerSettings() {
  if (validateServerSettings()) showSetDefaultConfrim.value = true;
}

// -------------------------------
//        onMount
// -------------------------------
onMounted(() => {
  loadServerDefaultData();
});
</script>
<template>
    <div class="container">
        <!-- for testing remove in final product -->
        <div class="text-center mb-2 p-1">
            <span v-if="isLive" class="badge bg-success">Live: Connected to server</span>
            <span v-else class="badge bg-secondary">Offline: Showing sample data for local testing</span>
        </div>
        <!-- for testing remove in final product -->
        <div class="row p-3">
            <!-- GUI Settings -->
            <h2 class="config-title">
                GUI Settings
                <img
                :src="isGUI ? arrowDown : arrowUp"
                alt="toggle button" width="30" height="30" class="toggle-button"
                @click="isGUI = !isGUI"
                >
            </h2>
            <div v-if="isGUI">
                <h3 class="config-subtitle">Theme</h3>
                <div class="col-12 text-center py-2">
                    <h5 class="config-label" v-if="theme === 'dark'">Dark Mode</h5>
                    <h5 class="config-label" v-if="theme === 'light'">Light Mode</h5>
                    <label class="switch">
                        <input type="checkbox" class="switch-input" :checked="theme === 'dark'" @change="toggleTheme">
                        <span class="slider round"></span>
                    </label>
                </div>
            </div>

            <hr class="line-break">
            <!-- SERVER SETTINGS -->
            <div class="col-12 py-2">
                <h2 class="config-title">
                    Sever Settings
                    <img
                    :src="isServer ? arrowDown : arrowUp"
                    alt="toggle button" width="30" height="30" class="toggle-button"
                    @click="isServer = !isServer"
                    >
                </h2>
                <!-- Server Defaults -->
                <div class="server-default-section py-2" v-if="isServer">
                    <!-- Set server Defaults -->
                    <h3 class="config-subtitle">
                        Set Server Defaults
                        <img
                        :src="isSetServerDefault ? arrowDown : arrowUp"
                        alt="toggle button" width="25" height="25" class="toggle-button"
                        @click="isSetServerDefault = !isSetServerDefault"
                        >
                    </h3>
                    <div v-if="isSetServerDefault">
                        <label for="poll-interval-range" class="config-label">Web-Socket Poll Interval (in ms)</label>
                        <div class="form-element">
                            <input
                            type="range" class="slider-input" id="poll-interval-range"
                            v-model.number="newWebsocketPollInterval"
                            :min="minMaxStep.websocket_poll_interval.min"
                            :max="minMaxStep.websocket_poll_interval.max"
                            :step="minMaxStep.websocket_poll_interval.step">
                            <input
                            type="number" class="number-input" id="poll-interval-number"
                            v-model.number="newWebsocketPollInterval"
                            :min="minMaxStep.websocket_poll_interval.min"
                            :max="minMaxStep.websocket_poll_interval.max"
                            :step="minMaxStep.websocket_poll_interval.step">
                        </div>
                        <label for="update-delay-range" class="config-label">Update Delay (in ms)</label>
                        <div class="form-element">
                            <input
                            type="range" class="slider-input" id="update-delay-range"
                            v-model.number="newUpdateDelay"
                            :min="minMaxStep.update_delay.min"
                            :max="minMaxStep.update_delay.max"
                            :step="minMaxStep.update_delay.step">
                            <input
                            type="number" class="number-input" id="update-delay-number"
                            v-model.number="newUpdateDelay"
                            :min="minMaxStep.update_delay.min"
                            :max="minMaxStep.update_delay.max"
                            :step="minMaxStep.update_delay.step">
                        </div>
                        <label for="camera-err-decrement-range" class="config-label">Camera Error Decrement</label>
                        <div class="form-element">
                            <input
                            type="range" class="slider-input" id="camera-err-decrement-range"
                            v-model.number="newCameraErrorDecrement"
                            :min="minMaxStep.camera_err_decrement.min"
                            :max="minMaxStep.camera_err_decrement.max"
                            :step="minMaxStep.camera_err_decrement.step">
                            <input
                            type="number" class="number-input" id="camera-err-decrement-number"
                            v-model.number="newCameraErrorDecrement"
                            :min="minMaxStep.camera_err_decrement.min"
                            :max="minMaxStep.camera_err_decrement.max"
                            :step="minMaxStep.camera_err_decrement.step">
                        </div>
                        <label for="camera-increment-range" class="config-label">Camera Error Increment</label>
                        <div class="form-element">
                            <input
                            type="range" class="slider-input" id="camera-increment-range"
                            v-model.number="newCameraErrorIncrement"
                            :min="minMaxStep.camera_err_increment.min"
                            :max="minMaxStep.camera_err_increment.max"
                            :step="minMaxStep.camera_err_increment.step">
                            <input
                            type="number" class="number-input" id="camera-increment-number"
                            v-model.number="newCameraErrorIncrement"
                            :min="minMaxStep.camera_err_increment.min"
                            :max="minMaxStep.camera_err_increment.max"
                            :step="minMaxStep.camera_err_increment.step">
                        </div>
                        <label for="camera-error-threshold-range" class="config-label">Camera Error Threshold</label>
                        <div class="form-element">
                            <input
                            type="range" class="slider-input" id="camera-error-threshold-range"
                            v-model.number="newCameraErrorThreshold"
                            :min="minMaxStep.camera_err_threshold.min"
                            :max="minMaxStep.camera_err_threshold.max"
                            :step="minMaxStep.camera_err_threshold.step">
                            <input
                            type="number" class="number-input" id="camera-error-threshold-number"
                            v-model.number="newCameraErrorThreshold"
                            :min="minMaxStep.camera_err_threshold.min"
                            :max="minMaxStep.camera_err_threshold.max"
                            :step="minMaxStep.camera_err_threshold.step">
                        </div>
                        <div class="text-center d-flex flex-row justify-content-center gap-3 py-2">
                            <!-- Server Setting from -->
                            <button class="btn submit-btn" @click="requestSaveServerSettings">Save Server Defaults</button>
                            <button class="btn submit-btn" @click="showResetDefaultConfrim = !showResetDefaultConfrim">Reset Server Defaults</button>
                        </div>
                        <ConfirmationBox
                            v-model="showSetDefaultConfrim"
                            message="Would you like to save these as the defualt server settings?"
                            :onConfirmFunction="postDefaultServerSettings"
                        />
                        <ConfirmationBox
                            v-model="showResetDefaultConfrim"
                            message="Would you like to reset the defualt server settings to it's previous values?"
                            :onConfirmFunction="resetAllServerDefaults"
                        />
                    </div>
                    <!-- Submision Confrimation -->
                    <p v-if="saveState === 'success'" class="success">The default settings have been successfuly updated.</p>
                    <p v-if="saveState === 'error'" class="error">An error has occured when updating the default settings.</p>
                    <!-- validation errors -->
                    <p v-for="e in validationServerDefaultsErrors" class="error">{{e}}</p>
                </div>
            </div>
            <hr class="line-break">
        </div>
    </div>
</template>
<style scoped>
.switch {
    position: relative;
    display: inline-block;
    width: 60px;
    height: 34px;
}

.switch input {
    opacity: 0;
    width: 0;
    height: 0;
}

.slider {
    position: absolute;
    cursor: pointer;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: #ccc;
    -webkit-transition: .4s;
    transition: .4s;
}

.slider:before {
    position: absolute;
    content: "";
    height: 26px;
    width: 26px;
    left: 4px;
    bottom: 4px;
    background-color: white;
    -webkit-transition: .4s;
    transition: .4s;
}

input:checked+.slider {
    background-color: darkslateblue;
}

input:focus+.slider {
    box-shadow: 0 0 1px mediumslateblue;
}

input:checked+.slider:before {
    -webkit-transform: translateX(26px);
    -ms-transform: translateX(26px);
    transform: translateX(26px);
}

/* Rounded sliders */
.slider.round {
    border-radius: 34px;
}

.slider.round:before {
    border-radius: 50%;
}
.number-input {
    width: 5rem;
}


</style>
