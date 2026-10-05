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

// --------------------------
//        V-model values
// --------------------------

// toggle settings sections
const isGUI = ref(true);
const isServer = ref(true);
const isResetServerDefaults = ref(true);
const isSetServerDefault = ref(true);

// show confrimation window values
const showSetDefaultConfrim = ref(false);

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
      websocket_poll_interval: newWebsocketPollInterval.value,
      update_delay: newUpdateDelay.value,
      camera_err_decrement: newCameraErrorDecrement.value,
      camera_err_increment: newCameraErrorIncrement.value,
      camera_err_threshold: newCameraErrorThreshold.value,
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
            <h2 class="">
                GUI Settings
                <img
                :src="isGUI ? arrowDown : arrowUp"
                alt="toggle button" width="30" height="30" class="toggle-button"
                @click="isGUI = !isGUI"
                >
            </h2>
            <div v-if="isGUI">
                <h3 class="">Theme</h3>
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
                <h2 class="">
                    Sever Settings
                    <img
                    :src="isServer ? arrowDown : arrowUp"
                    alt="toggle button" width="30" height="30" class="toggle-button"
                    @click="isServer = !isServer"
                    >
                </h2>
                <!-- Server Defaults -->
                <div class="server-default-section py-2" v-if="isServer">
                    <!-- Reset defualts -->
                    <h3 class="">
                        Reset To Default
                        <img
                        :src="isResetServerDefaults ? arrowDown : arrowUp"
                        alt="toggle button" width="25" height="25" class="toggle-button"
                        @click="isResetServerDefaults = !isResetServerDefaults"
                        >
                    </h3>
                    <div class="text-center" v-if="isResetServerDefaults">
                        <button class="btn submit-btn">Reset Server Defaults</button>
                    </div>
                    <hr class="line-break">
                        <!-- Set server Defaults -->
                    <h3 class="">
                        Set Server Defaults
                        <img
                        :src="isSetServerDefault ? arrowDown : arrowUp"
                        alt="toggle button" width="25" height="25" class="toggle-button"
                        @click="isSetServerDefault = !isSetServerDefault"
                        >
                    </h3>
                    <div v-if="isSetServerDefault">
                        <div class="text-center">
                            <!-- Server Setting from -->
                            <button class="btn submit-btn">Set Default</button>
                        </div>
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
