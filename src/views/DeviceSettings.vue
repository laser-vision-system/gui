<script setup>
import { ref, onMounted, onUnmounted, watch, computed, reactive } from 'vue';
import { isBlank, checkBlank, isEmpty } from '../utils/helpers'

// -------------------------
//   Toggle section
// -------------------------
// This section imports the icons and declares the ref values used in the
// toggle sections feature of the device settings view.

// Toggle Icons
import arrowUp from '../assets/images/arrow-up.svg'
import arrowDown from '../assets/images/arrow-down.svg'

// Toggle Values
const isMicroComputerSection = ref(true);
const isRenameMicroComputerSection = ref(true);
const isCameraSection = ref(true);
const isRenameCameraSection = ref(true);
const isControlsSection = ref(true);
const isDeviationSection = ref(true);
const isDeviationMinMaxConfigure = ref(false);
const isCameraFeed = ref(true);


// -----------------------------
//   Imported Components
// -----------------------------
// Components which have been imported for code reuse
// Camera Feed Component: For displaying the Image feed of the selected camera
import CameraFeed from '../components/CameraFeed.vue'
// Hint Popup: to show descriptions of the more complicated sections in the device settings page.
import Hints from '../components/HintPopup.vue'

// -----------------------------
//   Config Shortcut
// -----------------------------
// This section is for the importing of the short cut feature for devices on the homepage view to the device settings view
import { useSharedDeviceData } from '../composables/useSharedDeviceData';
const { sharedMicroComputer, sharedCamera } = useSharedDeviceData();

// -----------------------------
//   Multi Thumb range slider
// -----------------------------
// This section imports the components and composables for the multi thumb range slider
import MultiThumbSlider from '../components/MultiThumbRangeSlider.vue';
// persistent data for the deviation threshold range
import {usePersistentSliderRange} from '../composables/usePersistentSliderRange';
const {
  // data
  sliderRange,
  // functions
  saveDeviationSliderRange, revertDeviationSliderRange, resetDeviationSliderRange
} = usePersistentSliderRange();
// Deviation configuration values
const newAlertBelow = ref(null);
const newWarnBelow = ref(null);
const newWarnAbove = ref(null);
const newAlertAbove = ref(null);

// -----------------------------
//   Confirmation pop up window
// -----------------------------
// This section imports and defines the references for the confirmation window / box
import ConfirmationBox from '../components/ConfirmationBox.vue';
// Show Booleans
const showRenameMicroCompConfirm = ref(false);
const showSelectVisionProcessingConfirm = ref(false);
const showRenameCameraConfirm = ref(false);
const showSaveAllControlsConfirm = ref(false);
const showResetAllControlsConfirm = ref(false);
const showSaveThresholdsConfirm = ref(false);
const showResetThresholdsConfirm = ref(false);
const showSetDefaultThresholdConfirm = ref(false);
const showSetThresholdRange = ref(false);

// --------------------
//   WebSocket
// --------------------
// Functions and values imported and defined from the GUI's WebSocket composable
import { useWebSocket } from '../composables/useWebSocket';
const {
  // state
  status,
  // data
  // some data is renamed so no confusion between sample data and live data.
  edgeList: wsEdgeList, settingsCameraList: wsCameraList,
  imageSrc, controlConfig, defaultThresholds, visionProcessingTechniques,
  // connection function
  connect,
  // Functions
  // Edge (micro computers)
  listEdges, setEdgeName, setEdgeProcessingType,
  // Cameras
  listCameras, viewCamera, stopViewingCamera, setCameraName,
  viewCameraConfig, updateConfiguration,
  setCameraThresholds, setDefaultThreshold, getDefaultThresholds,
} = useWebSocket('ws://' + location.hostname + ':8080/gui_ws');

//  Check if the websocket is connected
const isLive = computed(() => status.value === 'CONNECTED');

// --------------------
//     Sample Data
// --------------------
// mirrors the output of list cameras in websocket
import sampleCameraList from '../assets/data/sampleCameraList.json';
// mirrors the Configuration or control config value from websocket
import sampleCameraConfiguration from '../assets/data/sampleCameraConfiguration.json';
// list of micro computers
import sampleMicroComputerList from '../assets/data/sampleMicroComputerList.json';

// -------------------------
//     Selected values
// -------------------------
// Values which are selected by the user
const selectedMicroComputer = ref(''); // selected m comp
const selectedCamera = ref(''); // chosen from camera list
const selectedConfig = ref(null); // matches choice from camera list using the conn_id and camera_id

// -------------------------
//     Rename Values
// -------------------------

// MicroComputer config rename
const newMicroComputerName = ref(null);
// MicroComputer config select vision processing
const newVisionProcessing = ref(null);
// Camera Configuration Rename
const newCameraName = ref(null); // needs validation

// -------------------------
//      Camera Controls
// -------------------------
// Each control will have its own reactive entry with respect to the selected camera's controls
// Controls are keyed by their control name
// All controls are dynamic and use Vue's template v-for to display to the browser screen
const controls = reactive({});
// dynamic boolean
const hasControls = computed(() => Object.keys(controls).length > 0);

// -----GLOBAL CONSTANTS-----
// Display order of controls
// If their is a control that is sent by the camera that isn't listed will be appended alphabetically
const CONTROL_ORDER = [
  'AutoExposure', 'ExposureAbsolute', 'ExposureAutoPriority',
  'AutoWhiteBalance', 'WhiteBalance',
  'Brightness', 'Contrast', 'Saturation', 'Hue', 'Gamma', 'Gain', 'Sharpness',
  'PowerLineFrequency',
];

// Manual change for the label names for the camera controls
const NICER_LABELS = {
  ExposureAbsolute: 'Exposure (Absolute)',
};

// Some camera controls are dependent of others and need to accounted for
// e.g. AutoExposer when set to auto blocks ExposureAbsolute
// This is based on the UVC convention
const CONTROL_DEPENDENCIES = {
  ExposureAbsolute: (cam) => !cam.AutoExposure || cam.AutoExposure.value === 1,
  WhiteBalance: (cam) => !cam.AutoWhiteBalance || cam.AutoWhiteBalance.value === false,
};

// function to check if the controls should be blocked or not by other control settings
function isControlEnabled(name) {
  const rule = CONTROL_DEPENDENCIES[name];
  return rule ? rule(controls) : true;
}

// -----ARROW FUNCTIONS-----
// returns the first known index of a value given its name
// It is used by the byControlOrder sorting list to insure the controls listed in CONTROL_ORDER are shown first.
const orderOfControl = (name) => {
  const i = CONTROL_ORDER.indexOf(name);
  return i === -1 ? CONTROL_ORDER.length : i;
};

// Lists of the controls sorted in the order defined in the CONTROL_ORDER list
const byControlOrder = (a, b) => orderOfControl(a) - orderOfControl(b) || a.localeCompare(b);

// Replaces the names of the labels
const renamedLabels = (name) => NICER_LABELS[name] ?? name.replace(/([a-z])([A-Z])/g, '$1 $2');

// parse server entry into a flat object
// e.g. { IntegerRange: { value, default, min, max, step } }
function parseControl(name, entry) {
  // control type e.g. (Menu, Integer Range, Boolean)
  const controlType = Object.keys(entry ?? {})[0];
  // value of the control e.g. (Brightness: {controlBody})
  const controlBody = entry?.[controlType];
  if (!controlBody) return null;

  const contents = {
    controlType,
    label: renamedLabels(name),
    value: controlBody.value,
    // fallback if the value field is left blank
    original: controlBody.value,
    default: controlBody.default,
  };

  // handler for different control types
  // this switch statement returns the contents defined above in addition to any control type specific form features
  // e.g. min max and step for a IntegerRange vs a items for Menu
  switch (controlType) {
    case 'IntegerRange':
      return {
        ...contents,
        min: controlBody.min, max: controlBody.max,
        step: controlBody.step ?? 1
      };
    case 'Menu':
      return {
        ...contents,
        items: (controlBody.items ?? []).map((item) => ({
          id: item.id, name: item.item?.name ?? String(item.id)
        })),
      };
    case 'Boolean':
      return controlBody;
      default:
        console.warn(`Unknown control kind "${contents}" for ${name}, skipping`);
        return null;
  }
}


// -------------------------
//   Feedback Messages
// -------------------------
// This is for the feature of the device settings page which provides the confirmation successful submission of data
// NOTE: This does not indicate that the setting was successfully updated on the server and edge side of the full stack
const feedback = reactive({
  microComputerName: null,
  visionProcessing: null,
  camera: null,
  controls: null,
  thresholds: null,
  thresholdsRange: null,
});
// This is the duration for the amount of time the feedback message is displayed to the user
const FEEDBACK_DURATION = 3000; // in ms
// Each feedback message has its own timer so there is no confusion when which message is to close
const feedbackTimers = {};
// shows the feedback message by pushing the message and its timer to their respective arrays
// Then when the time is up it sets the message to null the garbage collector takes care of the rest
// This is keyed by the section element defined in the reactive variable
function showFeedback(section, ok, message) {
  clearTimeout(feedbackTimers[section]);
  feedback[section] = { ok, message };
  feedbackTimers[section] = setTimeout(() => {
    feedback[section] = null;
  }, FEEDBACK_DURATION);
}

// runs a confirmed websocket command, shows the result, and hands the result back
async function sendWithFeedback(section, label, sendFn) {
  const result = await sendFn();
  if (result.ok) {
    showFeedback(section, true, `${label} has been sent successfully`);
  } else {
    showFeedback(section, false, `${label} failed to send: ${result.error}`);
  }
  return result;
}

// clear timer on refresh or page exit
onUnmounted(() => {
  Object.values(feedbackTimers).forEach(clearTimeout);
});

// --------------------
//    Computed Data
// --------------------
// filter micro Computer list for active computers
// may need to be changed to remove state
const activeMicroComputers = computed(() => {
  const source = isLive.value ? wsEdgeList.value : sampleMicroComputerList.microComputers
  return source.filter((com) => com.state === 'Active')
});

// filter out the cameras that are not active
const activeCameras = computed(() => {
  const source = isLive.value ? wsCameraList.value : sampleCameraList.cameras
  const active = source.filter((cam) => cam.state === 'Active')

  // if no option is selected or the all option is selected.
  if (!selectedMicroComputer.value || selectedMicroComputer.value === 'all') {
    return active
  }

  // else a micro computer is selected filter only the cameras for that computer
  return active.filter((cam) => cam.conn_id === selectedMicroComputer.value.conn_id)
});

// --------------------
//   CUSTOM VALIDATION
// --------------------
// All validate function return a bool, either true (is valid) or false (failed the validation)
// Validation Errors
const deviationErrors = ref([]);
const deviationSliderRangeErrors = ref([]);
const cameraControlErrors = ref([]);
const cameraNameErrors = ref([]);
const microComputerNameErrors = ref([]);
// global constants
const THRESHOLD_MIN = 0;
const THRESHOLD_MAX = 200;

// Camera Controls
function validateCameraControl(name, control) {
  // validation for control type IntegerRange
  if (control.controlType === 'IntegerRange') {
    // a blank value falls back to the current value on save
    if (isBlank(control.value)) return true;

    if (!Number.isInteger(control.value)) {
      cameraControlErrors.value.push(`Warning: ${control.label} must be a whole number`);
      return false;
    }

    if (control.value < control.min) {
      cameraControlErrors.value.push(`Warning: ${control.label} at ${control.value}, is under the minimum value of ${control.min}`);
      return false;
    }
    if (control.value > control.max) {
      cameraControlErrors.value.push(`Warning: ${control.label} at ${control.value}, is over the maximum value of ${control.max}`);
      return false;
    }
  }

  // validate control type Menu
  if (control.controlType === 'Menu' && !control.items.some((item) => item.id === control.value)) {
    cameraControlErrors.value.push(`Warning: Invalid option has been selected ${control.label}.`);
    return false;
  }

  // validate control type Boolean
  if (control.controlType === 'Boolean' && typeof control.value !== 'boolean') {
    cameraControlErrors.value.push(`Warning: ${control.label} must be true or false`);
    return false;
  }

  return true;
}


// loops through all camera controls and validates them
function validateAllCameraControls() {
  cameraControlErrors.value = [];
  if (!selectedConfig.value) return false;

  let result = true;
  for (const [name, control] of Object.entries(controls)) {
    if (!validateCameraControl(name, control)) result = false;
  }

  return result;
}

// Validate deviation Thresholds:
function validateDeviation() {
  // reset variables both global and local
  let result = true;
  deviationErrors.value = [];

  if (!Number.isFinite(newAlertBelow.value) || !Number) {
    deviationErrors.value.push(`Warning: Alert Below must be a percentage and not ${newAlertBelow.value}`);
    result = false;
  }
  if (!Number.isFinite(newWarnBelow.value)) {
    deviationErrors.value.push(`Warning: Warn Below must be a percentage and not ${newWarnBelow.value}`);
    result = false;
  }
  if (!Number.isFinite(newWarnAbove.value)) {
    deviationErrors.value.push(`Warning: Warn Above must be a percentage and not ${newWarnAbove.value}`);
    result = false;
  }
  if (!Number.isFinite(newAlertAbove.value)) {
    deviationErrors.value.push(`Warning: Alert Above must be a percentage and not ${newAlertAbove.value}`);
    result = false;
  }

  if (newAlertBelow.value < THRESHOLD_MIN) { // Alert Below Validation
    deviationErrors.value.push(`Warning: Alert Below threshold of ${newAlertBelow.value}% is under the allowed limit of ${THRESHOLD_MIN}%`);
    result = false;
  }
  if (newAlertBelow.value >= newWarnBelow.value) {
    deviationErrors.value.push(`Warning: Alert Below threshold of ${newAlertBelow.value}% is more than or equal to the Warn Below threshold of ${newWarnBelow.value}%`);
    result = false;
  }
  if (newWarnBelow.value <= newAlertBelow.value) { // Warn Below Validation
    deviationErrors.value.push(`Warning: Warn Above threshold of  ${newWarnBelow.value}% is less than or equal to the Alert Below threshold of ${newAlertBelow.value}%`);
    result = false;
  }
  if (newWarnBelow.value >= newWarnAbove.value) {
    deviationErrors.value.push(`Warning: Warn Above threshold of  ${newWarnBelow.value}% is more than or equal to the Warn Above threshold of ${newWarnAbove.value}%`);
    result = false;
  }
  if (newWarnAbove.value <= newWarnBelow.value) { // Warn Above Validation
    deviationErrors.value.push(`Warning: Warn Above threshold of ${newWarnAbove.value}% is less than or equal to the Warn Below threshold of ${newWarnBelow.value}%`);
    result = false;
  }
  if (newWarnAbove.value >= newAlertAbove.value) {
    deviationErrors.value.push(`Warning: Warn Above threshold of ${newWarnAbove.value}% is more than or equal to the Alert Above threshold of ${newWarnBelow.value}%`);
    result = false;
  }
  if (newAlertAbove.value <= newWarnAbove.value) { // Alert Above Validation
    deviationErrors.value.push(`Warning: Alert Above threshold of ${newAlertAbove.value}% is less than or equal to the Warn Above threshold of ${newWarnAbove.value}%`);
    result = false;
  }
  if (newAlertAbove.value > THRESHOLD_MAX) {
    deviationErrors.value.push(`Warning: Alert Above threshold of ${newAlertAbove.value}% is over the allowed limit of ${THRESHOLD_MAX}%`);
    result = false;
  }
  return result;
}

// Threshold Range validation
function validateThresholdRange() {
  deviationSliderRangeErrors.value = [];
  let result = true;
  if (!Number.isInteger(sliderRange.value.min)) {
    deviationSliderRangeErrors.value.push(`Warning: min: ${sliderRange.value.min} must be a whole number`);
    return false;
  }
  if (!Number.isInteger(sliderRange.value.max)) {
    deviationSliderRangeErrors.value.push(`Warning: max: ${sliderRange.value.max} must be a whole number`);
    return false;
  }
  if (sliderRange.value.min < THRESHOLD_MIN || sliderRange.value.min >= sliderRange.value.max) {
    deviationSliderRangeErrors.value.push(`Warning: min: ${sliderRange.value.min} is out of bounds`);
    return false;
  }
  if (sliderRange.value.max > THRESHOLD_MAX || sliderRange.value.max <= sliderRange.value.min) {
    deviationSliderRangeErrors.value.push(`Warning: max: ${sliderRange.value.max} is out of bounds`);
    return false;
  }
  return result;
}

// Validate MicroComputer name
function validateMicroComputerName() {

}

// Validate Camera name
function validateCameraName() {

}

// ---------------------------
//    Validated Save Methods
// ---------------------------
// request functions for the validation before save / sending.
function requestSetSliderRange() {
  if (validateThresholdRange()) showSetThresholdRange.value = true;
}
function requestSaveControls() {
  if (validateAllCameraControls()) showSaveAllControlsConfirm.value = true;
}
function requestSaveThresholds() {
  if (validateDeviation()) showSaveThresholdsConfirm.value = true;
}
function requestSaveDefaultThresholds() {
  if (validateDeviation()) showSetDefaultThresholdConfirm.value = true;
}

// save Confirmation for local Storage
function saveConfirmThresholdRange() {
  if (saveDeviationSliderRange()) {
    showFeedback('thresholdsRange', true, 'Thresholds Range has been saved successfully');
  } else {
    showFeedback('thresholdsRange', false, 'Error: Threshold range did not save successfully ');
  }
}


// ---------------------------
//    Selected Device Methods
// ---------------------------
// Methods that relate selected devices
// such as submitting and helper functions

// returns the name of the micro computer a camera belongs to
function getEdgeName(connId) {
  return activeMicroComputers.value.find((com) => com.conn_id === connId)?.name ?? connId;
}

// when micro comp is clicked/ selected clear the value for selected camera to avoid errors.
function clearSelectedCamera() {
  if (!selectedCamera.value) return
  // no need to reset if camera is part of the selected option
  const hasCamera = activeCameras.value.some((cam) =>
    cam.conn_id === selectedCamera.value.conn_id && cam.camera_id === selectedCamera.value.camera_id)
  if (hasCamera) return
  // clear the camera value
  selectedCamera.value = ''
}

// rename Selected micro computer
async function renameMicroComputer() {
  if (!selectedMicroComputer.value || !newMicroComputerName.value) return
  if (isLive.value) {
    const result = await sendWithFeedback('microComputerName', 'Rename', () =>
      setEdgeName(selectedMicroComputer.value.conn_id, newMicroComputerName.value));
    // one second await timer
    await countdownTimer(1000);
    if (result.ok) listEdges();
  } else {
    selectedMicroComputer.value.name = newMicroComputerName.value;
    showFeedback('microComputerName', true, 'Rename saved (sample data)');
  }
}

// Select Vision processing method.
//  the method for saving/ submitting the selected vision processing method
async function submitVisionProcessing() {
  if (!selectedMicroComputer.value || newVisionProcessing.value == null) return;
  if (isLive.value) {
    await sendWithFeedback('visionProcessing', 'Vision Processing Technique', () =>
      // API function for submitting the chosen vision processing
      setEdgeProcessingType(selectedMicroComputer.value.conn_id, newVisionProcessing.value));
  } else {
    selectedMicroComputer.value.Menu.value.ConValueMenu = newVisionProcessing.value;
    showFeedback('visionProcessing', true, 'Vision processing Technique (sample data)');
  }
}

// Rename Selected camera
async function renameCamera() {
  if (!selectedCamera.value || !newCameraName.value) return;
  // ADD VALIDATION FOR CAMERA RENAME
  if (isLive.value) {
    const result = await sendWithFeedback('camera', 'Camera Rename', () =>
      setCameraName(selectedCamera.value.conn_id, selectedCamera.value.camera_id, newCameraName.value));
    // one second await timer
    await countdownTimer(1000);
    if (result.ok) listCameras(); // fetch the new camera list after renaming the camera
  } else {
    selectedCamera.value.name = newCameraName.value;
    showFeedback('camera', true, 'Camera rename saved (sample data)');
  }
}

// build camera control payload
function buildControlsPayload() {
  if (!selectedConfig.value) return null

  const original = selectedConfig.value.configuration
  const payload = {}

  for (const [name, control] of Object.entries(controls)) {
    const originalBody = original?.[name]?.[control.controlType];
    if (!originalBody) continue; // camera doesn't have a control
    // build the payload for a control
    payload[name] = {
      [control.controlType]: { ...originalBody, value: checkBlank(control.value, control.original) },
    };
  }
  // NOT IN CURRENT SPRINT BUT MAY NEED TO BE FIXED DEPENDING ON HOW THE CONTROLS ARE SET THROUGH
  if (original?.AutoExposure) {
    const current = original.AutoExposure.Menu?.value?.ConValueMenu
    payload.AutoExposure = {
      Menu: {...original.AutoExposure.Menu, value: { ConValueMenu: checkBlank(newAutoExposure.value, current) },},
    }
  }
  return payload;
}

// Timeout timer function
function countdownTimer(time) {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve("resolved");
    }, time);
  });
}

// Save the changes made to the camera controls
async function saveControlConfig() {
  if (!selectedCamera.value || !selectedConfig.value) return
  try {
    // ADD VALIDATION FOR CONTROLS
    const controlsPayload = buildControlsPayload()
    if (isLive.value) {
      const { conn_id, camera_id } = selectedCamera.value;
      const result = await sendWithFeedback('controls', 'Camera controls', () =>
        updateConfiguration(conn_id, camera_id, JSON.stringify(controlsPayload)));
      if (!result.ok) return;
      // one second await timer
      await countdownTimer(1000);
      // request to view the camera config.
      viewCameraConfig(conn_id, camera_id);
    } else {
      selectedConfig.value = {
        ...selectedConfig.value, // keep the original values of conn_id and camera_id
        configuration: { ...selectedConfig.value.configuration, ...controlsPayload },
      };
      loadCameraValues();
      showFeedback('controls', true, 'Camera controls saved (sample data)');
    }
  } catch (e) {
    console.error('Error updating camera:', e);
    showFeedback('controls', false, 'Something went wrong preparing the camera controls.');
  }
}

// ------------------------------
//        Sample data Methods
// ------------------------------

// function to find the configuration that matches the selected cameras conn_id and camera_id
function findConfig(conn_id, camera_id) {
  return (
    sampleCameraConfiguration.configurations.find(
      (c) => c.conn_id === conn_id && c.camera_id === camera_id
    ) ?? null
  )
}

// ------------------------------
//       Helper Methods
// ------------------------------

// Toggle Camera Feed
function toggleCameraFeed() {
  // toggle
  isCameraFeed.value = !isCameraFeed.value;
  if (isCameraFeed.value) {
    viewCamera(selectedCamera.value.conn_id, selectedCamera.value.camera_id);
  } else {
    stopViewingCamera(selectedCamera.value.conn_id, selectedCamera.value.camera_id);
  }
}

// Load current values from the matched config. must be used after select config is set
function loadCameraValues() {
  // clear the previous camera's controls
  Object.keys(controls).forEach((key) => delete controls[key]);

  const config = selectedConfig.value?.configuration;
  if (!config) return;

  // display the controls in the stated order so v-for renders control in the desired order
  Object.keys(config).sort(byControlOrder).forEach((name) => {
    const parsed = parseControl(name, config[name]);
    if (parsed) controls[name] = parsed;
  });
}

// set selected control value to the default settings
function setDefaultControl(name) {
  const control = controls[name];
  // return if there is no control or defined default value.
  if (!control || control.default === undefined) return;
  control.value = control.default;
}

// set all values to default
function resetControlsConfig() {
  // reset the control to default for each control
  Object.keys(controls).forEach((name) => setDefaultControl(name));
}

// sets the default threshold for all deviation thresholds
function resetAllThresholds() {
  if (isLive.value) {
    if (!defaultThresholds.value) {
      console.warn('Default thresholds have not loaded from the server yet.');
      return
    }
    newAlertBelow.value = defaultThresholds.value.alert_below_threshold * 100;
    newWarnBelow.value = defaultThresholds.value.warn_below_threshold * 100;
    // add alert and warn above thresholds when routes are added
    newWarnAbove.value = defaultThresholds.value.warn_above_threshold * 100;
    newAlertAbove.value = defaultThresholds.value.alert_above_threshold * 100;
  } else {
    newAlertBelow.value = 95;
    newWarnBelow.value = 98;
    newWarnAbove.value = 102;
    newAlertAbove.value = 105;
  }
}

// save thresholds
async function saveThresholds() {
  if (!selectedCamera.value) return;
  const alertBelow = newAlertBelow.value / 100;
  const warningBelow = newWarnBelow.value / 100;
  const warningAbove = newWarnAbove.value / 100;
  const alertAbove = newAlertAbove.value / 100;

  if (isLive.value) {
      const result = await sendWithFeedback('thresholds', 'Thresholds', () =>
        setCameraThresholds(
          selectedCamera.value.conn_id,
          selectedCamera.value.camera_id,
          alertBelow,
          warningBelow,
          warningAbove,
          alertAbove,
        ));
      if (result.ok) listCameras(); // refresh camera list
  } else {
    selectedCamera.value.alert_below_threshold = alertBelow;
    selectedCamera.value.warn_below_threshold = warningBelow;
    selectedCamera.value.warn_above_threshold = warningAbove;
    selectedCamera.value.alert_above_threshold = alertAbove;
    showFeedback('thresholds', true, 'Thresholds saved (sample data)');
  }
}

// set global default threshold on server
async function setServerDefaultThreshold() {
  if (!selectedCamera.value) return

  const alertBelow = newAlertBelow.value / 100;
  const warningBelow = newWarnBelow.value / 100;
  const warningAbove = newWarnAbove.value / 100;
  const alertAbove = newAlertAbove.value / 100;

  if (isLive.value) {
    const result = await sendWithFeedback('thresholds', 'Default thresholds', () =>
      setDefaultThreshold(alertBelow, warningBelow, warningAbove, alertAbove));
    // update the default values
    if (result.ok) getDefaultThresholds();
  } else {
    showFeedback('thresholds', true, 'default Thresholds saved (sample data)');
  }
}

// --------------------
//    Shared Config
// --------------------
// state
let sharedDataApplied = false;

function applySharedData() {
  // if the data has been already applied
  if (sharedDataApplied) return;

  const sharedComputer = sharedMicroComputer.value;
  if (!sharedComputer) return;

  const computer = activeMicroComputers.value.find((c) => c.conn_id === sharedComputer.conn_id);
  if (!computer) return;
  selectedMicroComputer.value = computer;

  if (sharedCamera.value) {
    const camera = activeCameras.value.find((c) =>
      c.conn_id === sharedCamera.value.conn_id && c.camera_id === sharedCamera.value.camera_id);
    if (!camera) return;
    selectedCamera.value = camera;
  }
  sharedDataApplied = true;
}


// --------------------
//        Watchers
// --------------------

// watch the selected camera to load it's values when it changes
watch(selectedCamera, (cam, oldCam) => {

  selectedConfig.value = null;
  cameraControlErrors.value = [];
  deviationErrors.value = [];
  cameraNameErrors.value = [];
  microComputerNameErrors.value = [];
  if (!cam) {
    if (isLive.value && oldCam) {
      stopViewingCamera(oldCam.conn_id, oldCam.camera_id)
    }
    loadCameraValues()
    return
  }
  // load camera list values
  newCameraName.value = cam.name
  newAlertBelow.value = cam.alert_below_threshold * 100;
  newWarnBelow.value = cam.warn_below_threshold * 100;
  newWarnAbove.value = cam.warn_above_threshold * 100;
  newAlertAbove.value = cam.alert_above_threshold * 100;

  if (isLive.value) {
    viewCamera(cam.conn_id, cam.camera_id)
    viewCameraConfig(cam.conn_id, cam.camera_id)
    // selectedConfig gets filled in by the controlConfig watcher below once the server replies
  } else  {
    selectedConfig.value = findConfig(cam.conn_id, cam.camera_id)
    loadCameraValues()
  }
})

// watch to apply the server's Configuration reply once it matches the currently selected camera
watch(controlConfig, (config) => {
  if (!isLive.value || !config || !selectedCamera.value) return
  if (config.conn_id === selectedCamera.value.conn_id
    && config.camera_id === selectedCamera.value.camera_id) {
    selectedConfig.value = config
    loadCameraValues()
  }
})

// watch the camera list to keep track of the connected and disconnected cameras to keep the camera feed fresh
watch(wsCameraList, () => {
  if (!isLive.value || !selectedCamera.value) return

  const freshCam = wsCameraList.value.find(
    (cam) => cam.conn_id === selectedCamera.value.conn_id
      && cam.camera_id === selectedCamera.value.camera_id
  )
  if (!freshCam || freshCam.state !== 'Active') {
    selectedCamera.value = ''
    return
  }
  Object.assign(selectedCamera.value, freshCam)
})


// keep the selected micro computer pointing at the refreshed entry after the edge list reloads
// to prevent the select option from going blank
watch(wsEdgeList, () => {
  if (!isLive.value) return;
  const current = selectedMicroComputer.value;
  if (!current || current === 'all') return;
  const fresh = wsEdgeList.value.find((com) => com.conn_id === current.conn_id);
  selectedMicroComputer.value = fresh ?? ''
})

watch(selectedMicroComputer, () => {
  clearSelectedCamera()
  if (selectedMicroComputer.value && selectedMicroComputer.value !== 'all') {
    newMicroComputerName.value = selectedMicroComputer.value.name
    // add auto select current vision processing when value is available
    if (isLive.value) {
      // add vision processing when api has a path for its value
      //newVisionProcessing.value =
    } else {
      newVisionProcessing.value = selectedMicroComputer.value.Menu.value.ConValueMenu
    }
  }
})
// watches for the websocket to connected before running the apply shared data
watch(isLive, () => { sharedDataApplied = false; });
watch([isLive, wsEdgeList, wsCameraList], () => {
  applySharedData();
  newMicroComputerName.value = selectedMicroComputer.value.name;
}, { immediate: true });



// -------------------------------
//        onMount
// -------------------------------
onMounted(() => {
    //fetchCameraConfig()
  connect(); // gets the edge list and camera list in its function
  applySharedData();
});
</script>
<template>
    <div class="container">
        <div class="row">
            <div class="col">
            <!-- for testing remove in final product -->
                <div class="text-center mb-2 p-1">
                    <span v-if="isLive" class="badge bg-success">Live: Connected to server</span>
                    <span v-else class="badge bg-secondary">Offline: Showing sample data for local testing</span>
                </div>
            <!-- for testing remove in final product -->
                <form @submit.prevent="">
                    <div class="form">
                        <div class="pb-3">
                            <h2 class="config-title">
                                <img
                                :src="isMicroComputerSection ? arrowDown : arrowUp"
                                alt="toggle button" width="30" height="30" class="toggle-button"
                                @click="isMicroComputerSection = !isMicroComputerSection">
                                µ-Computer Configuration
                            </h2>
                            <div v-if="isMicroComputerSection">
                                <label for="microCompSelect" class="config-subtitle">
                                    <img
                                    :src="isRenameMicroComputerSection ? arrowDown : arrowUp"
                                    alt="toggle button" width="25" height="25" class="toggle-button"
                                    @click="isRenameMicroComputerSection = !isRenameMicroComputerSection">
                                    Select µ-Computer
                                </label>
                                <div class="form-element">
                                    <select class="menu-input" id="microCompSelect" v-model="selectedMicroComputer">
                                        <option value="" disabled selected>Please select a µ-computer</option>
                                        <option value="all">Select All µ-computers</option>
                                        <option v-for="(com, index) in activeMicroComputers" :key="`${com.conn_id}`" :value="com">
                                            [ {{index + 1}} ] : {{com.name}}
                                        </option>
                                    </select>
                                </div>

                                <div v-if="selectedMicroComputer && selectedMicroComputer !== 'all' && isRenameMicroComputerSection">
                                    <label for="rename" class="config-label">Rename µ-Computer</label>
                                    <div class="form-element">
                                        <input type="text" id="rename" class="text-input" v-model="newMicroComputerName">
                                        <button type="button" class="btn submit-btn" @click="showRenameMicroCompConfirm = true">Rename</button>
                                        <ConfirmationBox
                                            v-model="showRenameMicroCompConfirm"
                                            :message="'Rename the selected micro-computer to ' + newMicroComputerName + '?'"
                                            :onConfirmFunction="renameMicroComputer"/>
                                    </div>
                                </div>
                                <p v-if="feedback.microComputerName"
                                   :class="feedback.microComputerName.ok ? 'success' : 'error'"
                                   role="status"> {{ feedback.microComputerName.message }}</p>
                                <div v-if="selectedMicroComputer && selectedMicroComputer !== 'all' && isRenameMicroComputerSection">
                                    <label for="vision-process" class="config-label">Select Vision Processing Method</label>
                                    <div class="form-element">
                                        <select class="submenu-input " id="vision-process" v-model.number="newVisionProcessing">
                                            <option value="" disabled>Please select a Vision Processing Method</option>
                                            <option v-for="(technique,index) in visionProcessingTechniques" :key="technique" :value="technique">
                                                [{{index + 1}}] : {{technique}}
                                            </option>
                                        </select>
                                        <button type="button" class="btn submit-btn" @click="showSelectVisionProcessingConfirm = true">Select</button>
                                        <ConfirmationBox
                                        v-model="showSelectVisionProcessingConfirm"
                                        message="Please click Confirm to change the Vision Processing Method"
                                        :onConfirmFunction="submitVisionProcessing"/>
                                    </div>
                                </div>
                                <p v-if="feedback.visionProcessing"
                                   :class="feedback.visionProcessing.ok ? 'success' : 'error'"
                                   role="status"> {{ feedback.visionProcessing.message }}</p>
                            </div>
                            <hr class="line-break">
                        </div>
                        <h2 class="config-title">
                            <img
                            :src="isCameraSection ? arrowDown : arrowUp"
                            alt="toggle button" width="30" height="30" class="toggle-button"
                            @click="isCameraSection = !isCameraSection">
                            Camera Configuration
                        </h2>
                        <div v-if="isCameraSection">
                        <!-- SELECT CAMERA -->
                            <label for="cameraSelect" class="config-subtitle">
                                <img
                                :src="isRenameCameraSection ? arrowDown : arrowUp"
                                alt="toggle button" width="25" height="25" class="toggle-button"
                                @click="isRenameCameraSection = !isRenameCameraSection">
                                Select Camera
                            </label>
                            <div class="form-element">
                                <select class="menu-input" id="cameraSelect" required v-model="selectedCamera">
                                    <option value="" disabled selected>Please select a camera</option>
                                    <option v-for="(cam, index) in activeCameras" :key="`${cam.conn_id}-${cam.camera_id}`" :value="cam">
                                        [ {{getEdgeName(cam.conn_id)}} - {{index + 1}} ] : {{cam.name}}
                                    </option>
                                </select>
                            </div>
                            <!-- RENAME CAMERA -->
                            <div v-if="selectedConfig && isRenameCameraSection">
                                <label for="rename" class="config-label">Rename Camera</label>
                                <div class="form-element">
                                    <input type="text" id="rename" class="text-input" v-model="newCameraName">
                                    <button type="button" class="btn submit-btn" @click="showRenameCameraConfirm = true">Rename</button>
                                    <ConfirmationBox
                                    v-model="showRenameCameraConfirm"
                                    :message="'Rename the selected camera to ' + newCameraName + '?'"
                                    :onConfirmFunction="renameCamera"/>
                                </div>
                            </div>
                            <p v-if="feedback.camera"
                               :class="feedback.camera.ok ? 'success' : 'error'"
                               role="status"> {{ feedback.camera.message }}</p>
                            <hr class="line-break" v-if="selectedCamera">
                            <!-- CAMERA CONTROLS -->
                            <h4 class="pt-3 pb-2 config-subtitle" v-if="selectedCamera">
                                <img
                                :src="isControlsSection ? arrowDown : arrowUp"
                                alt="toggle button" width="25" height="25" class="toggle-button"
                                @click="isControlsSection = !isControlsSection">
                                Camera Controls
                            </h4>
                            <div v-if="isControlsSection && selectedCamera">
                                <p v-if="!hasControls" class="config-label">Waiting for controls from the camera...</p>

                                <div v-for="(control,name) in controls" :key="name">
                                    <label :for="`control-${name}`" class="config-label">{{control.label}}</label>
                                    <div class="form-element">
                                        <!-- Integer range [range slider and number input] -->
                                        <template v-if="control.controlType === 'IntegerRange'">
                                            <input type="range" class="slider-input" :id="`control-${name}`"
                                                v-model.number="control.value"
                                                :min="control.min" :max="control.max" :step="control.step"
                                                :disabled="!isControlEnabled(name)">
                                            <input type="number" class="number-input" :id="`control-${name}-number`"
                                                v-model.number="control.value"
                                                :min="control.min" :max="control.max" :step="control.step"
                                                :disabled="!isControlEnabled(name)">
                                        </template>
                                        <!-- Menu drop down -->
                                        <select v-else-if="control.controlType === 'Menu'" class="menu-input" :id="`control-${name}`"
                                            v-model.number="control.value" :disabled="!isControlEnabled(name)">
                                                <option  v-for="item in control.items" :key="item.id" :value="item.id">
                                                    {{ item.name }}
                                                </option>
                                        </select>
                                        <!-- Boonlean: switch -->
                                        <div v-else-if="control.controlType === 'Boolean'" class="form-check form-switch">
                                            <input class="form-check-input" type="checkbox" role="switch" :id="`control-${name}`"
                                                v-model="control.value" :disabled="!isControlEnabled(name)">
                                        </div>
                                        <!-- reset to default button -->
                                        <button type="button" class="btn submit-btn" @click="setDefaultControl(name)">Reset</button>
                                    </div>
                                </div>
                                <p v-for="e in cameraControlErrors" class="error">{{e}}</p>
                                <div class="mt-1 text-center d-flex flex-row justify-content-center gap-3" v-if="selectedCamera">
                                    <button class="btn submit-btn" @click="requestSaveControls">Save Camera Controls</button>
                                    <ConfirmationBox
                                        v-model="showSaveAllControlsConfirm"
                                        message="Would you like to save all camera controls?"
                                        :onConfirmFunction="saveControlConfig"/>
                                    <button class="btn submit-btn" @click="showResetAllControlsConfirm = true">Reset Camera Controls</button>
                                    <ConfirmationBox
                                        v-model="showResetAllControlsConfirm"
                                        message="Would you like to reset all camera controls?"
                                        :onConfirmFunction="resetControlsConfig"/>
                                </div>
                                <p v-if="feedback.controls"
                                   :class="feedback.controls.ok ? 'success' : 'error'"
                                   role="status"> {{ feedback.controls.message }}</p>
                            </div>
                            <!-- DEVIATION THRESHOLDS -->
                            <hr class="line-break" v-if="selectedCamera">
                            <p class="pt-3 pb-2 config-subtitle" v-if="selectedCamera">
                                <img
                                :src="isDeviationSection ? arrowDown : arrowUp"
                                alt="toggle button" width="25" height="25" class="toggle-button"
                                @click="isDeviationSection = !isDeviationSection">
                                Deviation Thresholds
                                <button class="btn submit-btn" @click="isDeviationMinMaxConfigure = !isDeviationMinMaxConfigure">
                                    <p class="p-0 m-0" v-if="!isDeviationMinMaxConfigure">Configure Range</p>
                                    <p class="p-0 m-0" v-else>Close Configuration</p>
                                </button>
                            </p>
                            <div v-if="isDeviationMinMaxConfigure">
                                <div class="text-center d-flex flex-row justify-content-center gap-3 deviation-range-slider">
                                    <label for="slider-range-min" class="config-label">Min</label>
                                    <input type="number" id="slider-range-min" class="number-input" v-model.number="sliderRange.min" :min="THRESHOLD_MIN" :max="sliderRange.max - 1">
                                    <label for="slider-range-max" class="config-label">Max</label>
                                    <input type="number" id="slider-range-max" class="number-input" v-model.number="sliderRange.max" :min="sliderRange.min + 1" :max="THRESHOLD_MAX">
                                </div>
                                <div class="d-flex flex-row justify-content-center gap-3 py-3">
                                    <button class="btn submit-btn" @click="requestSetSliderRange">Set Range</button>
                                    <ConfirmationBox
                                        v-model="showSetThresholdRange"
                                        message="Would you like to save the deviation threshold range?"
                                        :onConfirmFunction="saveConfirmThresholdRange"/>
                                    <button class="btn submit-btn" @click="revertDeviationSliderRange">Cancel</button>
                                    <button class="btn submit-btn" @click="resetDeviationSliderRange">Set Default Range</button>
                                </div>
                            </div>
                            <div v-if="isDeviationSection">
                                <p v-for="e in deviationSliderRangeErrors" class="error">{{e}}</p>
                                <p v-if="feedback.thresholdsRange"
                                   :class="feedback.thresholdsRange.ok ? 'success' : 'error'"
                                   role="status"> {{ feedback.thresholdsRange.message }}</p>
                                <div v-if="selectedConfig">
                                    <MultiThumbSlider
                                        v-model:alertBelow="newAlertBelow"
                                        v-model:warnBelow="newWarnBelow"
                                        v-model:warnAbove="newWarnAbove"
                                        v-model:alertAbove="newAlertAbove"
                                        :min="sliderRange.min" :max="sliderRange.max"
                                    />
                                    <p v-for="e in deviationErrors" class="error">{{e}}</p>
                                </div>
                                <div class="mt-1 text-center d-flex flex-row justify-content-center gap-3" v-if="selectedCamera">
                                    <button class="btn submit-btn" @click="requestSaveThresholds">Save Thresholds</button>
                                    <ConfirmationBox
                                        v-model="showSaveThresholdsConfirm"
                                        message="Would you like to save the Deviation Thresholds?"
                                        :onConfirmFunction="saveThresholds"/>
                                    <button type="button" class="btn submit-btn" @click="showResetThresholdsConfirm = true">Reset to Default</button>
                                    <ConfirmationBox
                                        v-model="showResetThresholdsConfirm"
                                        message="Would you like to reset all Deviation Thresholds to default?"
                                        :onConfirmFunction="resetAllThresholds"/>
                                    <button type="button" class="btn submit-btn" @click="requestSaveDefaultThresholds">Save Global Default Thresholds</button>
                                    <ConfirmationBox
                                        v-model="showSetDefaultThresholdConfirm"
                                        message="Would you like to set the default value for the thresholds?"
                                        :onConfirmFunction="setServerDefaultThreshold"/>
                                </div>
                                <p v-if="feedback.thresholds"
                                   :class="feedback.thresholds.ok ? 'success' : 'error'"
                                   role="status"> {{ feedback.thresholds.message }}</p>
                            </div>
                        </div>
                    </div>
                    <hr class="line-break" v-if="selectedCamera">
                </form>
            </div>
            <!-- Camera feed -->
            <h4 class="pt-3 pb-2 config-subtitle" v-if="selectedCamera">
                <img
                :src="isCameraFeed ? arrowDown : arrowUp"
                alt="toggle button" width="30" height="30" class="toggle-button"
                @click="toggleCameraFeed">
                Camera Feed
            </h4>
            <div class="col-12 d-flex ps-0 mt-2 justify-content-center py-3" v-if="selectedCamera">
                <CameraFeed :imageSrc="imageSrc" :isLive="isLive" :isSelected="isCameraFeed"/>
            </div>
        </div>
    </div>
</template>
<style scoped>
select {
    padding: 0.5em;
}
option:hover{
    background-color: var(--button-hover);
}
.form{
    display: flex;
    flex-direction: column;
    padding: 0.5em;
}
.deviation-range-slider {
   margin-left: 0rem;
   margin-right: 5rem ;
}
</style>
