<script setup>
import { ref, onMounted } from 'vue'
// Data
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
                        <input type="text" class="form-control" id="description" v-model="newDescription" required>
                        <label for="brightness" class="config-label">Brightness</label>
                        <input type="number" class="form-control" id="brightness" v-model="newBrightness" required
                            min="0" max="1" step="0.01">
                        <label for="fps" class="config-label">Frame Rate</label>
                        <input type="number" class="form-control" id="fps" v-model="newFPS" required min="1" max="30">
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
}

.submit-btn:hover {
    background-color: mediumslateblue;
    border-color: slateblue;
}

.config-label {
    font-weight: bold;
    font-size: 16pt;
    color: var(--config-title);
    font-family: 'Franklin Gothic Medium', 'Arial Narrow', Arial, sans-serif;
}
</style>
