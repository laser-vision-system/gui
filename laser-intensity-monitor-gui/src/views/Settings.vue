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
import {isBlank, checkBlank} from '../utils/helpers'
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
const saveState = ref(null);

// Data from server
const serverSettings = ref(null);

// User input data
const newWebsocketPollInterval = ref(null);
const newUpdateDelay = ref(null);
const newCameraErrorDecrement = ref(null);
const newCameraErrorIncrement = ref(null);
const newCameraErrorThreshold = ref(null);
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
  } catch (error){
    console.error('Error fetching camera data:', error)
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
      websocket_poll_interval:  parseInt(checkBlank(newWebsocketPollInterval.value, serverSettings.value?.websocket_poll_interval)),
      update_delay: parseInt(checkBlank(newUpdateDelay.value, serverSettings.value?.update_delay)),
      camera_err_decrement: parseInt(checkBlank(newCameraErrorDecrement.value, serverSettings.value?.camera_err_decrement)),
      camera_err_increment: parseInt(checkBlank(newCameraErrorIncrement.value, serverSettings.value?.camera_err_increment)),
      camera_err_threshold: parseInt(checkBlank(newCameraErrorThreshold.value, serverSettings.value?.camera_err_threshold)),
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

// load data
async function loadServerDefaultData() {
  await getDefaultSettings();
  // load the current default values
  newWebsocketPollInterval.value = serverSettings.value.websocket_poll_interval;
  newUpdateDelay.value = serverSettings.value.update_delay;
  newCameraErrorDecrement.value = serverSettings.value.camera_err_decrement;
  newCameraErrorIncrement.value = serverSettings.value.camera_err_increment;
  newCameraErrorThreshold.value = serverSettings.value.camera_err_threshold;

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
                    <h5 class="" v-if="theme === 'dark'">Dark Mode</h5>
                    <h5 class="" v-if="theme === 'light'">Light Mode</h5>
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
                        <label for="poll-interval-range" class="config-label">Web-Socket Poll Interval</label>
                        <div class="form-element">
                            <input type="range" class="slider-input" id="poll-interval-range" v-model.number="newWebsocketPollInterval" min="1" max="5" step="1">
                            <input type="number" class="number-input" id="poll-interval-number" v-model.number="newWebsocketPollInterval" min="1" max="5" step="1">
                        </div>
                        <label for="update-delay-range" class="config-label">Update Delay</label>
                        <div class="form-element">
                            <input
                            type="range" class="slider-input" id="update-delay-range"
                            v-model.number="newUpdateDelay" min="1" max="5" step="1">
                            <input
                            type="number" class="number-input" id="update-delay-number"
                            v-model.number="newUpdateDelay" min="1" max="5" step="1">
                        </div>
                        <label for="camera-err-decrement-range" class="config-label">Camera Error Decrement</label>
                        <div class="form-element">
                            <input
                            type="range" class="slider-input" id="camera-err-decrement-range"
                            v-model.number="newCameraErrorDecrement" min="1" max="5" step="1">
                            <input
                            type="number" class="number-input" id="camera-err-decrement-number"
                            v-model.number="newCameraErrorDecrement" min="1" max="5" step="1">
                        </div>
                        <label for="camera-increment-range" class="config-label">Camera Error Increment</label>
                        <div class="form-element">
                            <input
                            type="range" class="slider-input" id="camera-increment-range"
                            v-model.number="newCameraErrorIncrement" min="1" max="5" step="1">
                            <input
                            type="number" class="number-input" id="camera-increment-number"
                            v-model.number="newCameraErrorIncrement" min="1" max="5" step="1">
                        </div>
                        <label for="camera-error-threshold-range" class="config-label">Camera Error Threshold</label>
                        <div class="form-element">
                            <input
                            type="range" class="slider-input" id="camera-error-threshold-range"
                            v-model.number="newCameraErrorThreshold" min="1" max="5" step="1">
                            <input
                            type="number" class="number-input" id="camera-error-threshold-number"
                            v-model.number="newCameraErrorThreshold" min="1" max="5" step="1">
                        </div>
                        <div class="text-center d-flex flex-row justify-content-center gap-3 py-2">
                            <!-- Server Setting from -->
                            <button class="btn submit-btn" @click="requestSaveServerSettings">Set Default</button>
                            <button class="btn submit-btn">Reset Server Defaults</button>
                        </div>
                        <ConfirmationBox
                            v-model="showSetDefaultConfrim"
                            message="Would you like to save these as the defualt server settings?"
                            :onConfirmFunction="postDefaultServerSettings"
                        />
                    </div>
                    <hr class="line-break">
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

.server-default-section{

}
</style>
