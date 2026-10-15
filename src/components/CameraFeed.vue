<script setup>
// import the gobal variable for camera feed toggle from local storage
import { usePersistentGlobalData } from '../composables/usePersistentGlobalData';
const { globalCameraFeedBoolean } = usePersistentGlobalData();
// toggle arrows
import arrowUp from '../assets/images/arrow-up.svg'
import arrowDown from '../assets/images/arrow-down.svg'
const showCameraFeed = ref(false);
// --------------------
//   Props
// --------------------
// Variables that are passed down from parent component
const props = defineProps({
  imageSrc: { type: String, required: true },
  isLive: { type: Boolean, default: true },
  isSelected: { type: Boolean, default: true }
});
// --------------------
//   Image Toggle
// --------------------
</script>
<template>
<!-- Local Toggle Icon -->
<div>
    <img src="" alt="">
    <!-- Global and Local Toggle -->
    <div v-if="globalCameraFeedBoolean || showCameraFeed">
        <div class="feed-wrapper w-100 h-100 d-flex ps-0" v-if="isSelected">
            <div v-if="isLive && imageSrc" class="w-100 h-100">
                <img :src="imageSrc" alt="Live Camera Feed" class="feedbox w-100 h-100">
            </div>
            <div v-else-if="isSelected" class="w-100">
                <img src="../assets/images/fake-feed.png" alt="Sample Camera Feed" class="feedbox w-100 h-100">
            </div>
            <div v-else-if="!isSelected" class="w-100">
                <img src="../assets/images/no-camera-selected.png" alt="No camera selected" class="feedbox w-100 h-100">
            </div>
            <div v-else class="w-100">
                <img src="../assets/images/no-camera-connected.png" alt="No Cameras Connected" class="feedbox w-100 h-100 ">
            </div>
        </div>
    </div>
</div>
</template>
<style scoped>

.feedbox {
    border: 0.5rem solid var(--nav-bg);
    border-radius: 1rem;
    box-shadow: 0 0 0.45rem var(--button-hover);
    background-color: var(--cam-bg);
    object-fit: contain;
    max-height: 480px;
}


.feed-wrapper {
    max-width: 640px;
    max-height: 480px;
    margin: 0 auto;
}
</style>
