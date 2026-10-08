import { ref, computed, onUnmounted } from 'vue'

export function useWebSocket(url) {
  // -------------------------
  //   Constant Values
  // -------------------------
  const status = ref('DISCONNECTED');   // 'CONNECTING' | 'CONNECTED' | 'DISCONNECTED' | 'ERROR'
  const error = ref(null);
  // edge hashmap:
  // Hashmap: < conn_id, name >
  const edges = ref({});
  const edgeList = computed(() => Object.values(edges.value));
  const disconnectedEdges = ref({});
  const disconnectedEdgeList = computed(() => Object.values(disconnectedEdges.value));
  // cameras hashmap:
  // Hashmap: < (conn_id , camera_id), name, state >
  // CameraDetails: { name, state, warnBelowThreshold, alertBelowThreshold }
  // state: 'Active' | 'Disconnected' | 'Broken' | 'Limbo' | 'Invalid'
  const cameras = ref({});
  // camera list java array
  // Array: { connId, cameraId, name, state }
  const cameraList = computed(() => Object.values(cameras.value));
  // active camera feed
  const imageSrc = ref('');
  // Image Analysis for active camera
  const analysis = ref(null);
  // Control Configuration
  const controlConfig = ref(null);
  // Active Camera / selected camera
  const activeCamera = ref(null);
  // default Threasholds
  const defaultThresholds = ref(null);
  // Vision Processing Techniques
  const visionProcessingTechniques = ref([]);
  // server Alert
  const serverAlert = ref(null);

  // Array of Known ID feilds  just add any more ids that are needed to this array of the time comes
  const ID_KEYS = ['conn_id', 'camera_id', 'edge_id'];
  // Creates regex alturation string out of the array of ids
  const ID_KEYS_REGEX_OPTIONS = ID_KEYS.join('|');
  //

  // -------------------------
  //   Variable Values
  // -------------------------
  let socket = null;
  let currentObjectUrl = null;
  // -----------------
  //   Wire format
  // -----------------

  // enquoter for the incoming U64
  function enquoteIds(jsonString) {
      // replace / wrap the incoming int with quotes to make it a string
    return jsonString.replace(new RegExp(`"(${ID_KEYS_REGEX_OPTIONS})":(-?\\d+)`, 'g'), '"$1":"$2"');
  }

  // unquoter for the outgoing id feilds
  function unquoteIds(jsonString) {
    // replaces the string with a number on the out
    return jsonString.replace(new RegExp(`"(${ID_KEYS_REGEX_OPTIONS})":"(-?\\d+)"`, 'g'), '"$1":$2');
  }

  // Encoder: builds the "Type:{JSON}" String the server expects.
  function encodeMessage(type, data) {
    if (data === undefined || data === null) return JSON.stringify(type);
    if (typeof data === 'object' && Object.keys(data).length === 0) return JSON.stringify(type);
    return unquoteIds(JSON.stringify({ [type]: data }));
  }

  // Decoder: Breaks down string into Type and JSON
  function decodeServerMessage(raw) {
    const text = String(raw).trim();

    let parsed;
    try {
      parsed = JSON.parse(enquoteIds(text));
    } catch (e) {
      console.error('Failed to parse server message', e, text);
      return { type: null, data: null };
    }
    // if the message doesnt have a payload
    if (typeof parsed === 'string') {
      return { type: parsed, data: null };
    }

    // if the mesasge is has a type and payload (e.g. configuration or camera maps) most messages
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      const keys = Object.keys(parsed);
      if (keys.length === 1) {
        const type = keys[0];
        return { type, data: parsed[type] ?? null };
      }
    }
    // MESSAGE COULD NOT BE HANDLEDED
    console.error('Unexpected server message shape', parsed);
    return { type: null, data: null };
  }
  // ---------------------------
  //   Send Message to Sever
  // ---------------------------
  function send(type, data) {
    if (socket?.readyState !== WebSocket.OPEN) {
      console.warn(`Cannot send "${type}", socket is not open`);
      return false;
    }
    try {
      socket.send(encodeMessage(type, data));
      return true;
    } catch(e) {
      console.error(`Failed to send "${type}"`, e);
      error.value = `Failed to send ${type}.`;
      return false;
    }
  }
  // ---------------------------
  //   Comfrim sent message
  // ---------------------------
  // Time in ms
  const FLUSH_CHECK = 100;
  const FLUSH_TIMEOUT = 3000;
  // check that the message has been sent by the GUI.
  function waitForBufferFlush(wSocket) {
    return new Promise((resolve, reject) => {
      const started = Date.now();
      const timer = setInterval(() => {
        if (wSocket.readyState !== WebSocket.OPEN) {
          clearInterval(timer);
          reject(new Error('Connection closed before the message was sent'));
        } else if (wSocket.bufferedAmount === 0) {
          clearInterval(timer);
          resolve();
        } else if (Date.now() - started > FLUSH_TIMEOUT) {
          clearInterval(timer);
          reject(new Error('Timed out waiting for the message to send'));
        }
      }, FLUSH_CHECK);
    });
  }

  async function sendConfirmed(type, data) {
    // save the web socket incase of reconnect.
    const wSocket = socket;
    if (!send(type, data)) {
      return { ok: false, error: 'Socket is not open' };
    }
    try {
      await waitForBufferFlush(wSocket);
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  }



  // -------------------------
  //   Heartbeat
  // -------------------------
  // Ping rate (time in ms)
  const HEARTBEAT_INTERVAL = 2000;
  // last pong time stamp
  const lastPongTimestamp = ref(null);
  // Heartbeat variable
  let heartbeatInterval = null;
  function startHeartbeat() {
    stopHeartbeat(); // clear any left over timer
    heartbeatInterval = setInterval(() => {
      if (socket?.readyState !== WebSocket.OPEN) return;
      // send ping text message
      send('Ping');
    }, HEARTBEAT_INTERVAL);
  }
  // stop the heartbeat
  function stopHeartbeat() {
    clearInterval(heartbeatInterval);
    heartbeatInterval = null;
  }
  // -------------------------
  //   Connection to Server
  // -------------------------
  function connect() {
    if (socket?.readyState === WebSocket.OPEN) return;
    status.value = 'CONNECTING';
    try {
      socket = new WebSocket(url);
      socket.binaryType = 'blob';
    } catch(e) {
      console.error('Failed to create WebSocket', e);
      return;
    }

    socket.onopen = () => {
      status.value = 'CONNECTED';
      error.value = null;
      startHeartbeat();
      listEdges();
      listDisconnectedEdges();
      listCameras();
      getDefaultThresholds();
      listProcessingTypes();
    }

    socket.onmessage = (event) => {
      if (event.data instanceof Blob) {
        handleImageFrame(event.data);
      } else {
        handleTextMessage(event.data);
      }
    }

    socket.onerror = (socketError) => {
      error.value = 'WebSocket error';
      status.value = 'ERROR';
      console.error(socketError);
    }

    socket.onclose = () => {
      stopHeartbeat();
      status.value = 'DISCONNECTED';
    }
  }
  // -------------------------
  //   Server Disconnection
  // -------------------------
  function disconnect() {
    // check if a camera is active
    if (activeCamera.value) {
      stopViewingCamera(activeCamera.value.connId, activeCamera.value.cameraId);
    }
    stopHeartbeat();
    socket?.close();
    clearActiveFeed();
    status.value = 'DISCONNECTED';
  }
  // -------------------------
  //   Handling Server Data
  // -------------------------
  // Handle the image feed
  function handleImageFrame(blob) {
    const newURL = URL.createObjectURL(blob);
    const img = new Image();
    // make sure that the image has loaded before clearing the blob before.
    img.onload = () => {
      // the feed was stopped while this frame was loading, drop the frame
      if (!activeCamera.value) {
        URL.revokeObjectURL(newURL);
        return;
      }
      if (currentObjectUrl) {
        URL.revokeObjectURL(currentObjectUrl);
      }
      currentObjectUrl = newURL;
      imageSrc.value = newURL;
    }
    // handle bad frames
    img.onerror = () => {
      console.warn("Bad image frame was sent");
      URL.revokeObjectURL(newURL);
    }
    img.src = newURL;
  }
  // normalise hash map to keyed java script data object
  function normaliseCameraMap(raw) {
    const normalised = {};
    if (!raw) return normalised;

    for (const [rawKey, details] of Object.entries(raw)) {
      const match = String(rawKey).match(/(-?\d+)\D+(-?\d+)/);
      if (!match) {
        console.warn('Could not decode camera map key:', rawKey);
        continue;
      }
      const [, connId, cameraId] = match;
      normalised[`${connId},${cameraId}`] = {
        conn_id: connId,
        camera_id: cameraId,
        name: details?.name ?? '',
        state: details?.state ?? null,
        warn_below_threshold: details?.warn_below_threshold ?? null,
        alert_below_threshold: details?.alert_below_threshold ?? null,
        warn_above_threshold: details?.warn_above_threshold ?? null,
        alert_above_threshold: details?.alert_above_threshold ?? null,
      };
    }
    return normalised;
  }
  // Normalise the Edge hash map into a java array
  function normaliseEdgeMap(raw) {
    const normalised = {};
    if (!raw) return normalised;
    for (const [key, name] of Object.entries(raw)) {
      const connId = key;
      normalised[connId] = { conn_id: connId, name, state: 'Active' };
    }
    return normalised;
  }

  // normalise the disconnected Edge hash map into a java array
  function normaliseDisconnectedEdgeMap(raw) {
    const normalised = {};
    if (!raw) return normalised;
    for (const [key, name] of Object.entries(raw)) {
      const connId = key;
      normalised[connId] = { conn_id: connId, name: name };
    }
    return normalised;
  }

  // parse the configuration payload
  function parseConfigurationPayload(data) {
    if (typeof data !== 'string') return data ?? null;
    try {
      return JSON.parse(data);
    } catch (e) {
      console.error('Failed to parse Configuration JSON', e, data);
      return null;
    }
  }

  // Handle the Text message sent by the server
  function handleTextMessage(raw) {
    const { type, data } = decodeServerMessage(raw);
    if (type === null) return;

    switch (type) {
      // list of All cameras
      case 'ListOfCameras':
        cameras.value = normaliseCameraMap(data?.cameras);
        break;
      // list of All edge (micro computers)
      case 'ListOfEdges':
        edges.value = normaliseEdgeMap(data?.edges);
        break;
      // list of All disconnected edges (micro computers)
      case 'DisconnectedEdges':
        disconnectedEdges.value = normaliseDisconnectedEdgeMap(data?.edges);
        break;
      // Camera Connect  (a new camera has come online)
      case 'CameraConnected': {
        const { conn_id, camera_id, camera_name } = data;
        const key = `${conn_id},${camera_id}`;
        const existing = cameras.value[key];
        cameras.value = {
          ...cameras.value,
          [key]: {
            conn_id,
            camera_id,
            name: camera_name,
            state: 'Active',
            warn_below_threshold: existing?.warn_below_threshold ?? null,
            alert_below_threshold: existing?.alert_below_threshold ?? null,
            warn_above_threshold: existing?.warn_above_threshold ?? null,
            alert_above_threshold: existing?.alert_above_threshold ?? null,
          },
        }
        break;
      }
      // Camera Disconnect (not used in GUI as it does not care about disconnecting that is handeled on the edge side.)
      case 'CameraDisconnected': {
        const { conn_id, camera_id } = data;
        const key = `${conn_id},${camera_id}`;
        const existing = cameras.value[key];
        if (existing) {
          cameras.value = {
            ...cameras.value,
            [key]: { ...existing, state: 'Disconnected' },
          }
        }
        // if the disconnected camera is the one selected, clear the feed
        // active camera is js object and uses connId not conn_id
        if (activeCamera.value?.connId === conn_id && activeCamera.value?.cameraId === camera_id) {
          clearActiveFeed();
        }
        break;
      }
      // Forget Camera
      case 'ForgetCamera': {
        const { conn_id, camera_id, confirm } = data;
        if (confirm) {
          const key = `${conn_id},${camera_id}`;
          const updated = { ...cameras.value };
          delete updated[key];
          cameras.value = updated;
          if (activeCamera.value?.connId === conn_id && activeCamera.value?.cameraId === camera_id) {
            clearActiveFeed();
          }
        }
        break;
      }
      // Control configuration (reading and writing)
      case 'Configuration':
        controlConfig.value = { ...data, configuration: parseConfigurationPayload(data?.configuration) };
        break;
      // GUI Image Analysis (reading the deviation)
      case 'ImageAnalysis':
        analysis.value = data;
        break;
      // Pong message from the server
      case 'Pong':
        lastPongTimestamp.value = Date.now();
        break;
      // read the default thresholds
      case 'DefaultThresholds':
        defaultThresholds.value = data;
        break;
      // read the vision processing types that are sent by the server.
      case 'ProcessingTypes':
        visionProcessingTechniques.value = data?.processing_types ?? [];
        break;
      // Alert sent by the server
      case 'Alert':
        serverAlert.value = data;
        break;
      // warn if case is not met.
      default:
        console.warn('Unhandled message type from server:', type, data);
    }
  }

  // clear the active/selected camera feed and reset variables
  function clearActiveFeed() {
    if (currentObjectUrl) {
      URL.revokeObjectURL(currentObjectUrl);
      currentObjectUrl = null;
    }
    imageSrc.value = '';
    activeCamera.value = null;
    analysis.value = null;
  }

  // -----------------------------------------
  //   Outgoing API Commands (GUI -> Server)
  // -----------------------------------------

  // List the Edge micro computers
  function listEdges() {
    send('ListEdges');
  }

  // List the disconnected Edge micro computers
  function listDisconnectedEdges() {
    send('ListDisconnectedEdges');
  }

  // Set the name of Edge micro computers
  function setEdgeName(edgeId, name) {
    return sendConfirmed('SetEdgeName', {
      edge_id: edgeId,
      name,
    });
  }

  // Set Vision Processing Type
  function setEdgeProcessingType(edgeId, processingType) {
    return sendConfirmed('SetEdgeProcessingType', {
      edge_id: edgeId,
      processing_type: processingType,
    });
  }

  // list camera API function
  function listCameras() {
    send('ListCameras');
  }

  // set camera name API function
  function setCameraName(connId, cameraId, name) {
    return sendConfirmed('SetNameCamera', {
      conn_id: connId,
      camera_id: cameraId,
      name,
    });
  }

  // switch selected camera to a new camera, stopping the old one first (if any)
  function viewCamera(connId, cameraId) {
    if (activeCamera.value) {
      send('StopViewingCamera');
      clearActiveFeed();
    }
    activeCamera.value = { connId, cameraId };
    send('StartViewingCamera', {
      conn_id: connId,
      camera_id: cameraId,
    });
  }

  // stop viewing camera
  function stopViewingCamera(connId, cameraId) {
    send('StopViewingCamera');
    if (activeCamera.value?.connId === connId && activeCamera.value?.cameraId === cameraId) {
      clearActiveFeed();
    }
  }

  // view camera config
  function viewCameraConfig(connId, cameraId) {
    send('ViewCameraConfig', {
      conn_id: connId,
      camera_id: cameraId,
    });
  }

  // update camera control configuration
  function updateConfiguration(connId, cameraId, configuration) {
    return sendConfirmed('Configuration', {
      conn_id: connId,
      camera_id: cameraId,
      configuration: typeof configuration === 'string' ? configuration : JSON.stringify(configuration),
    });
  }

  // Set Camera Thresholds (Deviation alerts thresholds)
  function setCameraThresholds(edgeId, cameraId, alertBelow, warnBelow,  warnAbove, alertAbove) {
    return sendConfirmed('SetCameraThresholds', {
      edge_id: edgeId,
      camera_id: cameraId,
      warn_below_threshold: warnBelow,
      alert_below_threshold: alertBelow,
      warn_above_threshold: warnAbove,
      alert_above_threshold: alertAbove,
    });
  }

  // Set Defualt vlaue of the servers camera thresholds
  function setDefaultThreshold(alertBelow, warnBelow, warnAbove, alertAbove) {
    return sendConfirmed('SetDefaultThreshold', {
      warn_below_threshold: warnBelow,
      alert_below_threshold: alertBelow,
      warn_above_threshold: warnAbove,
      alert_above_threshold: alertAbove,
    });
  }

  // get defualt thresholds
  function getDefaultThresholds() {
    send('GetDefaultThresholds');
  }

  // Setpoint function for a single camera
  function setpoint(connId, cameraId) {
    send('Setpoint', {
      conn_id: connId,
      camera_id: cameraId,
    });
  }

  // Setpoint function for all Cameras (no json attached)
  function setpointAll() {
    send('Setpoint');
  }

  // Forget Camera Function
  function forgetCameraRequest(connId, cameraId) {
    send('ForgetCameraRequest', {
      conn_id: connId,
      camera_id: cameraId,
      confirm: true,
    });
  }

  // Forget Edge function
  function forgetEdge(connId) {
    send('ForgetEdge', {
      conn: connId
    });
  }

  // request to the server to list the programing types
  function listProcessingTypes() {
    send('ListProcessingTypes');
  }

  // request the server to force retry a camera
  function forceRetryCamera(connId, cameraId) {
    send('ForceRetryCamera', {
      conn_id: connId,
      camera_id: cameraId,
    });
  }

  // ---------------
  //   UnMount
  // ---------------
  onUnmounted(() => {
    disconnect();
  })

  return {
    // states
    status,
    error,
    // Data
    edges,
    edgeList,
    disconnectedEdges,
    disconnectedEdgeList,
    cameras,
    cameraList,
    imageSrc,
    analysis,
    controlConfig,
    activeCamera,
    defaultThresholds,
    visionProcessingTechniques,
    serverAlert,
    // Connection Functions
    connect,
    disconnect,
    // Request functions
    listEdges,
    listDisconnectedEdges,
    setEdgeName,
    setEdgeProcessingType,
    listCameras,
    setCameraName,
    viewCamera,
    stopViewingCamera,
    viewCameraConfig,
    updateConfiguration,
    setCameraThresholds,
    setDefaultThreshold,
    getDefaultThresholds,
    setpoint,
    setpointAll,
    forgetCameraRequest,
    forgetEdge,
    forceRetryCamera,
    listProcessingTypes,
  }
}
