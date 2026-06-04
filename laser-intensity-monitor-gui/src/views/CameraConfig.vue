<script setup>
import { ref, onMounted, watch } from 'vue'
// --------------------
//        Data
// --------------------
const cameraConfigApiURL = ref('/api/configuration')
const guiUpdateApiURL = ref('/api/gui_update')
const cameraFeedData = ref([])
const selectedCamera = ref('')
// Api post values
const newFPS = ref(null)
const newBrightness = ref(null)
const newContrast = ref(null)
const newSaturation = ref(null)
// for save message e.g. success | error
const saveState = ref('')
// --------------------
//        Computed
// --------------------

// --------------------
//        Methods
// --------------------
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

    const checkBlank = (newValue, currentValue) => {
        if (newValue === '' || newValue === null || newValue === 0) {
            return parseFloat(currentValue);
        }
        return parseFloat(newValue);
    };
    const requestOptions = {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            // if the new function are blank or empty use the data got by the read funciton
            brightness: checkBlank(newBrightness.value, cameraFeedData.value?.brightness),
            framerate: checkBlank(newFPS.value, cameraFeedData.value?.framerate),
            contrast: checkBlank(newContrast.value, cameraFeedData.value?.contrast),
            saturation: checkBlank(newSaturation.value, cameraFeedData.value?.saturation)
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
// --------------------
//        Watchers
// --------------------
watch(newFPS, (val) => {
    if (val < 1) newFPS.value = 1;
    if (val > 30) newFPS.value = 30;
});
watch(newBrightness, (val) => {
    if (val !== null) {
        if (val < 0) newBrightness.value = 0
        if (val > 256) newBrightness.value = 255
    }
})
watch(newContrast, (val) => {
    if (val !== null) {
        if (val < 0) newBrightness.value = 0
        if (val > 256) newBrightness.value = 255
    }
})
watch(newSaturation, (val) => {
    if (val !== null) {
        if (val < 0) newBrightness.value = 0
        if (val > 256) newBrightness.value = 255
    }
})
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
                    <div class="form-group">
                        <label for="cameraSelect" class="config-label">Camera Select</label>
                        <select class="form-control" id="cameraSelect" required v-model="selectedCamera">
                            <option value="" disabled selected>Please select a camera</option>
                            <option>
                                Main Camera
                            </option>
                        </select>
                        <label for="brightness" class="config-label">Brightness</label>
                        <input type="number" class="form-control" id="brightness" v-model="newBrightness" min="0.0"
                            max="255.0" step="1.00">
                        <label for="contrast" class="config-label">Contrast</label>
                        <input type="number" class="form-control" id="contrast" v-model="newContrast" min="0.0"
                            max="255.0" step="1.00">
                        <label for="brightness" class="config-label">Saturation</label>
                        <input type="number" class="form-control" id="brightness" v-model="newSaturation" min="0.0"
                            max="255.0" step="1.00">
                        <label for="fps" class="config-label">Frame Rate</label>
                        <input type="number" class="form-control" id="fps" v-model="newFPS" min="1.0" max="30.00"
                            step="1.0">
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
</style>
