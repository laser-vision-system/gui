<!-- This is the camera feed component which provides an easy way to implement the camera feed
    through out the entire application, and provides basic code reuse
-->
<script setup>
// --------------------
//   Props
// --------------------
// Variables that are passed down from parent component
const props = defineProps({
  imageSrc: { type: String, required: true },
  isLive: { type: Boolean, default: true },
  isSelected: { type: Boolean, default: true }
});


</script>
<template>
<!-- Local Toggle Icon -->
<div>
    <!-- Global and Local Toggle -->
    <div v-if="isSelected" class="feed-wrapper w-100 h-100 d-flex ps-0">
        <div v-if="imageSrc && isLive" class="w-100 h-100">
            <img :src="imageSrc" alt="Live Camera Feed" class="feedbox w-100 h-100">
        </div>
        <div v-else-if="isLive" class="w-100">
            <img src="../assets/images/camera-feed-loading.gif" alt="Loading Camera Feed" class="feedbox" width="640" height="480">
        </div>
        <div v-else class="w-100">
            <img src="../assets/images/fake-feed.png" alt="Sample Camera Feed" class="feedbox w-100 h-100">
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
}

.feed-wrapper {
    max-width: 640px;
    max-height: 480px;
    margin: 0 auto;
    padding-top: 1rem;
}
</style>
