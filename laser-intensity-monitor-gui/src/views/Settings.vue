<script setup>
import { ref, reactive, onMounted } from 'vue';
// composables
import { useTheme } from '../composables/useTheme';
const { theme, toggleTheme } = useTheme();
// icons
import arrowUp from '../assets/images/arrow-up.svg';
import arrowDown from '../assets/images/arrow-down.svg';
// conponents
import ConfirmationBox from '../components/ConfirmationBox.vue';
// helper funtions
import {checkBlank, isBlank} from '../utils/helpers'
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

// Data from server
const serverSettingsData = ref(null);

// User input data
const serverSettings = reactive({
  websocket_poll_interval: {
    value: null,
    min: 1,
    max: 1000,
    step: 1,
    name: 'Web-Socket Poll Interval',
    default: 10,
  },
  update_delay: {
    value: null,
    min: 10,
    max: 10000,
    step: 10,
    name: 'Update Delay',
    default: 1000,
  },
  camera_err_decrement: {
    value: null,
    min: 1,
    max: 64,
    step: 1,
    name: 'Camera Error Decrement',
    default: 1,
  },
  camera_err_increment: {
    value: null,
    min: 1,
    max: 64,
    step: 1,
    name: 'Camera Error Increment',
    default: 1,
  },
  camera_err_threshold: {
    value: null,
    min: 1,
    max: 256,
    step: 1,
    name: 'Camera Error Threshold',
    default: 5,
  },
});

// Validation
const validationServerDefaultsErrors = ref([]);

// --------------------------
//       Resful Methods
// --------------------------

// get default settings
// used for fetching the current values for the Server settings page.
async function getDefaultSettings() {
  try {
    const response = await fetch(urlGetServerDefault.value, { cache: 'no-store' });
    if (!response.ok) {
      throw new Error(`HTTP error: ${response.status}`);
    }
    const data = await response.json();
    serverSettingsData.value = data;
  } catch (error){
    console.error('Error fetching camera data:', error);
  }
}

// post new defualt settings
async function postDefaultServerSettingsData() {
  saveState.value = '';

  const requestOptions = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      // add check blank handling
      json: {
        websocket_poll_interval:  msToDuration(checkBlank(serverSettings.websocket_poll_interval.value, durationToMs(serverSettingsData.value?.websocket_poll_interval))),
        update_delay: msToDuration(checkBlank(serverSettings.update_delay.value, durationToMs(serverSettingsData.value?.update_delay))),
        camera_err_decrement: checkBlank(serverSettings.camera_err_decrement.value, serverSettingsData.value?.camera_err_decrement),
        camera_err_increment: checkBlank(serverSettings.camera_err_increment.value, serverSettingsData.value?.camera_err_increment),
        camera_err_threshold: checkBlank(serverSettings.camera_err_threshold.value, serverSettingsData.value?.camera_err_threshold),
        },
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

// function to check if the duration is blank or not

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
  // load the current default values
  serverSettings.websocket_poll_interval.value = durationToMs(serverSettingsData.value.websocket_poll_interval);
  serverSettings.update_delay.value = durationToMs(serverSettingsData.value.update_delay);
  serverSettings.camera_err_decrement.value = serverSettingsData.value.camera_err_decrement;
  serverSettings.camera_err_increment.value= serverSettingsData.value.camera_err_increment;
  serverSettings.camera_err_threshold.value = serverSettingsData.value.camera_err_threshold;
}

// Reset Defualt value
function resetServerDefault(key) {
  serverSettings[key].value = serverSettings[key].default;
}
// Rest all Defualt values
function resetAllServerDefaults() {
  serverSettings.websocket_poll_interval.value = serverSettings.websocket_poll_interval.default;
  serverSettings.update_delay.value = serverSettings.update_delay.default;
  serverSettings.camera_err_decrement.value = serverSettings.camera_err_decrement.default;
  serverSettings.camera_err_increment.value = serverSettings.camera_err_increment.default;
  serverSettings.camera_err_threshold.value = serverSettings.camera_err_threshold.default;
}
// -------------------------------
//        Validation
// -------------------------------

function validateServerSetting(name, min, max, value) {

  if (isBlank(value)) return true;
  // check if the input
  if (!Number.isInteger(value)) {
    validationServerDefaultsErrors.value.push(`Warning: ${name} must be a whole number`);
    return false;
  }
  // check min
  if (value < min) {
    validationServerDefaultsErrors.value.push(`Warning: ${name} at ${value}, is under the minimum value of ${min}`);
    return false;
  }
  // check max
  if (value > max) {
    validationServerDefaultsErrors.value.push(`Warning: ${name} at ${value}, is over the maximum value of ${max}`);
    return false;
  }
  return true;
}


function validateAllServerSettings() {
  // clear the periouse warning messages
  validationServerDefaultsErrors.value = [];
  let result = true;
  for (const setting of Object.values(serverSettings)) {
    if (!validateServerSetting(setting.name, setting.min, setting.max, setting.value)) {
      result = false;
    }
  }
  return result;
}

function requestSaveServerSettingsData() {
  if (validateAllServerSettings()) showSetDefaultConfrim.value = true;
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
                <img
                :src="isGUI ? arrowDown : arrowUp"
                alt="toggle button" width="30" height="30" class="toggle-button"
                @click="isGUI = !isGUI">
                GUI Settings
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
                    <img
                    :src="isServer ? arrowDown : arrowUp"
                    alt="toggle button" width="30" height="30" class="toggle-button"
                    @click="isServer = !isServer">
                    Sever Settings
                </h2>
                <!-- Server Defaults -->
                <div class="server-default-section py-2" v-if="isServer">
                    <!-- Set server Defaults -->
                    <h3 class="config-subtitle">
                        <img
                        :src="isSetServerDefault ? arrowDown : arrowUp"
                        alt="toggle button" width="25" height="25" class="toggle-button"
                        @click="isSetServerDefault = !isSetServerDefault">
                        Set Server Defaults
                    </h3>
                    <div v-if="isSetServerDefault" v-for="setting in serverSettings">
                        <label class="config-label">{{setting.name}}</label>
                        <div class="form-element">
                            <input
                            type="range" class="slider-input"
                            v-model.number="setting.value"
                            :min="setting.min"
                            :max="setting.max"
                            :step="setting.step">
                            <input
                            type="number" class="number-input"
                            v-model.number="setting.value"
                            :min="setting.min"
                            :max="setting.max"
                            :step="setting.step">
                        </div>
                    </div>
                    <!-- validation errors -->
                    <p v-for="e in validationServerDefaultsErrors" class="error">{{e}}</p>
                    <div class="text-center d-flex flex-row justify-content-center gap-3 py-2">
                        <!-- Server Setting from -->
                        <button class="btn submit-btn" @click="requestSaveServerSettingsData">Save Server Defaults</button>
                        <button class="btn submit-btn" @click="showResetDefaultConfrim = !showResetDefaultConfrim">Reset Server Defaults</button>
                    </div>
                    <ConfirmationBox
                        v-model="showSetDefaultConfrim"
                        message="Would you like to save these as the defualt server settings?"
                        :onConfirmFunction="postDefaultServerSettingsData"
                    />
                    <ConfirmationBox
                        v-model="showResetDefaultConfrim"
                        message="Would you like to reset the defualt server settings to it's previous values?"
                        :onConfirmFunction="resetAllServerDefaults"
                    />
                    <!-- Submision Confrimation -->
                    <p v-if="saveState === 'success'" class="success">The default settings have been successfuly updated.</p>
                    <p v-if="saveState === 'error'" class="error">An error has occured when updating the default settings.</p>

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
