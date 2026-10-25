// This composable is for the persistent toggling of the global camera feed toggle
import { ref, watch } from 'vue';
// Global Camera feed toggle
const GLOBAL_CAMERA_FEED_TOGGLE_KEY = 'global-camera-feed-boolean';

function loadGlobalCameraFeedBoolean() {
  try {
    const saved = localStorage.getItem(GLOBAL_CAMERA_FEED_TOGGLE_KEY);
    if (saved !== null) {
      return saved === 'true';
    }
  } catch (e) {
    console.warn("Could not load saved global camera feed toggle", e);
  }
  // default value
  return false;
}
// -------------------------------
//    module level singleton
// -------------------------------
const globalCameraFeedBoolean = ref(loadGlobalCameraFeedBoolean()); // true || false

// Auto-persist on every change and save (auto saves on change)
watch(globalCameraFeedBoolean, (val) => {
  try {
    localStorage.setItem(GLOBAL_CAMERA_FEED_TOGGLE_KEY, String(val));
  } catch (e) {
    console.warn('Could not save global camera feed toggle', e);
  }
});

export function usePersistentGlobalData() {
  const toggleGlobalCameraFeed = () => {
    globalCameraFeedBoolean.value = !globalCameraFeedBoolean.value;
  };

  const setGlobalCameraFeed = (val) => {
    globalCameraFeedBoolean.value = !!val;
  };
  return {
    globalCameraFeedBoolean, // ref (bool)
    toggleGlobalCameraFeed, // toggle function
    setGlobalCameraFeed, // this function takes a boolean
  };
}
