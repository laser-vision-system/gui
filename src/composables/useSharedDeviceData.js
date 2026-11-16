// this composable is for the configuration short cut function of the web app
// it allows for the transfer of device IDs
import { ref, watch } from 'vue';

const STORAGE_KEY = 'sharedDeviceData';

// loads the save data from local storage
function loadSavedSelection() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return saved && typeof saved === 'object' ? saved : {};
  } catch (e) {
    console.warn('Could not read the saved device selection:', e);
    return {};
  }
}


const saved = loadSavedSelection();

// shared singleton at the module level
const sharedMicroComputer = ref(saved.microComputer ?? null); // conn_id
const sharedCamera = ref(saved.camera ?? null); // conn_id, camera_id

// auto saves on camera and edge device select
watch([sharedMicroComputer, sharedCamera], () => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      microComputer: sharedMicroComputer.value,
      camera: sharedCamera.value,
    }));
  } catch (e) {
    console.warn('Could not save the device selection:', e);
  }
}, { flush: 'sync' });



export function useSharedDeviceData() {
  // set micro computer
  function setSharedMicroComputer(connId) {
    // clear the camera value
    sharedCamera.value = null;
    sharedMicroComputer.value = { conn_id: connId };
  }

  // set camera
  function setSharedCamera(connId, cameraId) {
    sharedMicroComputer.value = { conn_id: connId };
    sharedCamera.value = { conn_id: connId, camera_id: cameraId };
  }

  // clear only the cameras shared data
  function clearSharedCamera() {
    sharedCamera.value = null;
  }

  // clear all shared data
  function clearAllSharedDeviceData() {
    sharedCamera.value = null;
    sharedMicroComputer.value = null;
  }

  return {
    sharedMicroComputer,
    sharedCamera,
    setSharedMicroComputer,
    setSharedCamera,
    clearSharedCamera,
    clearAllSharedDeviceData,
  }
}
