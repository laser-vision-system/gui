// this composable is for the configuration short cut function of the web app
// it allows for the transfer of device IDs
import { ref } from 'vue';

// shared singleton at the module level
const sharedMicroComputer = ref(null); // conn_id
const sharedCamera = ref(null);// conn_id, camera_id

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
    clearAllSharedDeviceData,
  }
}
