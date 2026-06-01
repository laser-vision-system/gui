<script setup>
import { ref, onMounted } from 'vue'
// Data
const CameraDataApiURL = ref('')
const localCameraFeeds = ref([])
const selectedCameraId = ref('')
const newDescription = ref('')
const newFPS = ref(null)
const newBrightness = ref(null)
// Methods
function loadCameraFeeds() {
    const storedCameraFeeds = localStorage.getItem('cameraFeeds');
    if (storedCameraFeeds) {
        localCameraFeeds.value = JSON.parse(storedCameraFeeds);
    } else {
        localCameraFeeds.value = [];
    }
}
// mounted

//fetch method for update function
async function putData() {
    const SQLApiURL = CameraDataApiURL.value;

    const requestOptions = {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            camera_id: selectedCameraId.value,
            description: newDescription.value,
            brightness: newBrightness.value,
            fps: newFPS.value
        })
    };

    try {
        const response = await fetch(SQLApiURL, requestOptions);
        if (!response.ok) {
            throw new Error(`HTTP error: ${response.status}`);
        }
        const data = await response.json();
        console.log('Success:', data);
    } catch (error) {
        console.error('Error updating camera:', error);
    }
}
onMounted(() => {
    loadCameraFeeds();
});
</script>
<template>
    <div class="container">
        <div class="row">
            <div class="col">
                <form>
                    <div class="form-group">
                        <label for="cameraSelect" class="config-label">Camera Select</label>
                        <select class="form-control" id="cameraSelect" required v-model="selectedCameraId">
                            <option value="" disabled selected>Please select a camera</option>
                            <option v-for="feed in localCameraFeeds" :key="feed.id" :value="feed.id">
                                {{ feed.name }}: {{ feed.description }}
                            </option>
                        </select>
                        <label for="description" class="config-label"
                            placeholder="Enter a description for the camera">Description</label>
                        <input type="text" class="form-control" id="description" v-model="newDescription">
                        <label for="brightness" class="config-label">Brightness</label>
                        <input type="number" class="form-control" id="brightness" v-model="newBrightness" min="0"
                            max="1" step="0.01">
                        <label for="fps" class="config-label">Frame Rate</label>
                        <input type="number" class="form-control" id="fps" v-model="newFPS" min="1" max="30">
                        <div class="mt-2 text-center">
                            <button class="btn submit-btn">Save Changes</button>
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
