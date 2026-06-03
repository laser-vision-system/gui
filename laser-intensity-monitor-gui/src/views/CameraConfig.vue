<script setup>
import { ref, onMounted, watch } from 'vue'
// --------------------
//        Data
// --------------------
const CameraDataApiURL = ref('/api/configuration')
const CameraFeedData = ref([])
const selectedCamera = ref('')
// Api post values
const newFPS = ref(null)
const newBrightness = ref(null)
// for save message e.g. success | error
const saveState = ref('')
// --------------------
//        Computed
// --------------------

// --------------------
//        Methods
// --------------------


//fetch method for read function
async function fetchCameraData() {
    try {
        const response = await fetch(CameraDataApiURL.value)
        if (!response.ok) {
            throw new Error(`HTTP error: ${response.status}`)
        }
        const data = await response.json()
        CameraFeedData.value = data
    } catch (error) {
        console.error('Error fetching camera data:', error)
    }
}


//fetch method for update function
async function postData() {
    saveState.value = '' // reset before each attempt

    const checkBlank = (newValue, currentValue) => {
        if (newValue === '' || newValue === null) {
            return currentValue;
        }
        return Number(newValue);
    };
    const requestOptions = {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            // if the new function are blank or empty use the data got by the read funciton
            brightness: checkBlank(newBrightness.value, CameraFeedData.value?.brightness),
            framerate: checkBlank(newFPS.value, CameraFeedData.value?.framerate)
        })
    };

    try {
        const response = await fetch(CameraDataApiURL.value, requestOptions);
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
    } catch (error) {
        console.error('Error updating camera:', error);
        saveState.value = 'error'
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
        if (val > 1) newBrightness.value = 1
    }
})

// -------------------------------
//        onMount and unMount
// -------------------------------

onMounted(() => {
    fetchCameraData()
});
</script>
<template>
    <div class="container">
        <div class="row">
            <div class="col">
                <form @submit.prevent="postData">
                    <div class="form-group">
                        <label for="cameraSelect" class="config-label">Camera Select</label>
                        <select class="form-control" id="cameraSelect" required v-model="selectedCamera">
                            <option value="" disabled selected>Please select a camera</option>
                            <option>
                                Main Camera
                            </option>
                        </select>
                        <label for="brightness" class="config-label">Brightness</label>
                        <input type="number" class="form-control" id="brightness" v-model="newBrightness" min="0"
                            max="1" step="0.01">
                        <label for="fps" class="config-label">Frame Rate</label>
                        <input type="number" class="form-control" id="fps" v-model="newFPS" min="1" max="30">
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
.submit-btn {
    background-color: slateblue;
    border-color: darkslateblue;
    color: white
}

.submit-btn:hover {
    background-color: mediumslateblue;
    border-color: slateblue;
    color: black;
}

.config-label {
    font-weight: bold;
    font-size: 16pt;
    color: var(--config-title);
    font-family: 'Franklin Gothic Medium', 'Arial Narrow', Arial, sans-serif;
}
</style>
