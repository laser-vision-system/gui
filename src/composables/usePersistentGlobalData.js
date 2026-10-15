import { ref } from 'vue';


// Global Camera feed toggle

const GLOBAL_CAMERA_FEED_TOGGLE_KEY = 'global-camera-feed-toggle';

function loadGlobalCameraFeedToggle() {
  try {
    const saved = JSON.parse(localStorage.getItem(GLOBAL_CAMERA_FEED_TOGGLE_KEY));
    if (saved) {
      return saved;
    }
  } catch (e) {
    console.warn("Could not load saved global camera feed toggle", e);
  }
  return false;
}
// -------------------------------
//    module level singltons
// -------------------------------
const globalCameraFeedToggle = ref(loadGlobalCameraFeedToggle()); // true || false

export function usePersistentGlobalData() {
  const saveGlobalCameraFeedToggle = () => {
    try {
      localStorage.setItem(GLOBAL_CAMERA_FEED_TOGGLE_KEY, JSON.stringify(showGlobalCameraFeed.value));
      return true;
    } catch (e) {
      console.warn("Could not save global camera feed toggle", e);
      return false;
    }
  }
  return { globalCameraFeedToggle, saveGlobalCameraFeedToggle };
}
