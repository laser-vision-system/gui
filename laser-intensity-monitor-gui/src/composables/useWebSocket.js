import { ref, computed, onUnmounted } from 'vue'

export function useWebSocket(url) {
  // -------------------------
  //   Constant Values
  // -------------------------
  const status = ref('DISCONNECTED')   // 'CONNECTING' | 'CONNECTED' | 'DISCONNECTED' | 'ERROR'
  const error = ref(null)
  // edge hashmap:
  // Hashmap: < conn_id, name >
  const edges = ref({})
  const edgeList = computed(() => Object.values(edges.value))
  // cameras hashmap:
  // Hashmap: < (conn_id , camera_id), name, state >
  // CameraDetails: { name, state, warnBelowThreshold, alertBelowThreshold }
  // state: 'Active' | 'Disconnected' | 'Broken'
  const cameras = ref({})
  // camera list java array
  // Array: { connId, cameraId, name, state }
  const cameraList = computed(() => Object.values(cameras.value))
  // active camera feed
  const imageSrc = ref('')
  // Image Analysis for active camera
  const analysis = ref(null)
  // Control Configuration
  const controlConfig = ref(null)
  // Active Camera / selected camera
  const activeCamera = ref(null)
  // default Threasholds
  const defaultThresholds = ref(null)
  // Array of Known ID feilds  just add any more ids that are needed to this array of the time comes
  const ID_KEYS = ['conn_id', 'camera_id', 'edge_id']
  // Creates regex alturation string out of the array of ids
  const ID_KEYS_REGEX_OPTIONS = ID_KEYS.join('|')
  // -------------------------
  //   Variable Values
  // -------------------------
  let socket = null
  let currentObjectUrl = null
  // -----------------
  //   Wire format
  // -----------------

  // enquoter for the incoming U64
  function enquoteIds(jsonString) {
      // replace / wrap the incoming int with quotes to make it a string
      return jsonString.replace(new RegExp(`"(${ID_KEYS_REGEX_OPTIONS})":(-?\\d+)`, 'g'), '"$1":"$2"')
  }

  // unquoter for the outgoing id feilds
  function unquoteIds(jsonString) {
    // replaces the string with a number on the out
    return jsonString.replace(new RegExp(`"(${ID_KEYS_REGEX_OPTIONS})":"(-?\\d+)"`, 'g'), '"$1":$2')
  }

  // Encoder: builds the "Type:{JSON}" String the server expects.
  function encodeMessage(type, data) {
    if (data === undefined || data === null) return type
    if (typeof data === 'object' && Object.keys(data).length === 0) return type
    return `${type}:${unquoteIds(JSON.stringify(data))}`
  }

  // Decoder: Breaks down string into Type and JSON
  function decodeServerMessage(raw) {
    const text = String(raw).trim()
    const sep = text.indexOf(':')
    if (sep === -1) { return {type: text, data:null} }
    const type = text.slice(0, sep)
    const jsonData = text.slice(sep + 1)
    try {
      return {type, data: JSON.parse(enquoteIds(jsonData))}
    } catch (e) {
      console.error(`Failed to parse JSON payload for message type: "${type}"`, e, jsonData)
      return {type: null, data:null}
    }
  }
  // ---------------------------
  //   Send Message to Sever
  // ---------------------------
  function send(type, data) {
    if (socket?.readyState !== WebSocket.OPEN) {
      console.warn(`Cannot send "${type}", socket is not open`)
      return
    }
    try {
      socket.send(encodeMessage(type, data))
    } catch(e) {
      console.error(`Failed to send "${type}"`, e)
      error.value = `Failed to send ${type}.`
    }
  }
  // -------------------------
  //   Heartbeat
  // -------------------------
  // Ping rate (time in ms)
  const HEARTBEAT_INTERVAL = 2000
  // last pong time stamp
  const lastPongTimestamp = ref(null)
  // Heartbeat variable
  let heartbeatInterval = null
  function startHeartbeat() {
    stopHeartbeat() // clear any left over timer
    heartbeatInterval = setInterval(() => {
      if (socket?.readyState !== WebSocket.OPEN) return
      // send ping text message
      send('Ping')
    }, HEARTBEAT_INTERVAL)
  }
  // stop the heartbeat
  function stopHeartbeat() {
    clearInterval(heartbeatInterval)
    heartbeatInterval = null
  }
  // -------------------------
  //   Connection to Server
  // -------------------------
  function connect() {
    if (socket?.readyState === WebSocket.OPEN) return
    status.value = 'CONNECTING'
    try {
      socket = new WebSocket(url)
      socket.binaryType = 'blob'
    } catch(e) {
      console.error('Failed to create WebSocket', e)
      return
    }

    socket.onopen = () => {
      status.value = 'CONNECTED'
      error.value = null
      startHeartbeat()
      listEdges()
      listCameras()
    }

    socket.onmessage = (event) => {
      if (event.data instanceof Blob) {
        handleImageFrame(event.data)
      } else {
        handleTextMessage(event.data)
      }
    }

    socket.onerror = (socketError) => {
      error.value = 'WebSocket error'
      status.value = 'ERROR'
      console.error(socketError)
    }

    socket.onclose = () => {
      stopHeartbeat()
      status.value = 'DISCONNECTED'
    }
  }
  // -------------------------
  //   Server Disconnection
  // -------------------------
  function disconnect() {
    // check if a camera is active
    if (activeCamera.value) {
      stopViewingCamera(activeCamera.value.connId, activeCamera.value.cameraId)
    }
    stopHeartbeat()
    socket?.close()
    clearActiveFeed()
    status.value = 'DISCONNECTED'
  }
  // -------------------------
  //   Handling Server Data
  // -------------------------
  // Handle the image feed
  function handleImageFrame(blob) {
    const newURL = URL.createObjectURL(blob)
    const img = new Image()
    // make sure that the image has loaded before clearing the blob before.
    img.onload = () => {
      if (currentObjectUrl) {
        URL.revokeObjectURL(currentObjectUrl)
      }
      currentObjectUrl = newURL
      imageSrc.value = newURL
    }
    // handle bad frames
    img.onerror = () => {
      console.warn("Bad image frame was sent")
      URL.revokeObjectURL(newURL)
    }
    img.src = newURL
  }
  // normalise hash map to keyed java script data object
  function normaliseCameraMap(raw) {
    const normalised = {}
    if (!raw) return normalised

    for (const [rawKey, details] of Object.entries(raw)) {
      const match = String(rawKey).match(/(-?\d+)\D+(-?\d+)/)
      if (!match) {
        console.warn('Could not decode camera map key:', rawKey)
        continue
      }
      const [, connId, cameraId] = match
      normalised[`${connId},${cameraId}`] = {
        conn_id: connId,
        camera_id: cameraId,
        name: details?.name ?? '',
        state: details?.state ?? 'Disconnected',
        warn_below_threshold: details?.warn_below_threshold ?? null,
        alert_below_threshold: details?.alert_below_threshold ?? null,
      }
    }
    return normalised
  }
  // Normalise the Edge hash map into a java array
  function normaliseEdgeMap(raw) {
    const normalised = {}
    if (!raw) return normalised
    for (const [key, name] of Object.entries(raw)) {
      const connId = key
      normalised[connId] = { conn_id: connId, name, state: 'Active' }
    }
    return normalised
  }

  // parse the configuration payload
  function parseConfigurationPayload(data) {
    if (typeof data !== 'string') return data ?? null
    try {
      return JSON.parse(data)
    } catch (e) {
      console.error('Failed to parse Configuration JSON', e, data)
      return null
    }
  }

  // Handle the Text message sent by the server
  function handleTextMessage(raw) {
    const { type, data } = decodeServerMessage(raw)
    if (type === null) return

    switch (type) {
      // list of All cameras
      case 'ListOfCameras':
        cameras.value = normaliseCameraMap(data?.cameras)
        break
      // list of All edge (micro computers)
      case 'ListOfEdges':
        edges.value = normaliseEdgeMap(data?.edges)
        break
      // Camera Connect  (a new camera has come online)
      case 'CameraConnected': {
        const { conn_id, camera_id, camera_name } = data
        const key = `${conn_id},${camera_id}`
        const existing = cameras.value[key]
        cameras.value = {
          ...cameras.value,
          [key]: {
            conn_id,
            camera_id,
            name: camera_name,
            state: 'Active',
            warn_below_threshold: existing?.warn_below_threshold ?? null,
            alert_below_threshold: existing?.alert_below_threshold ?? null,
          },
        }
        break
      }
      // Camera Disconnect
      case 'CameraDisconnected': {
        const { conn_id, camera_id } = data
        const key = `${conn_id},${camera_id}`
        const existing = cameras.value[key]
        if (existing) {
          cameras.value = {
            ...cameras.value,
            [key]: { ...existing, state: 'Disconnected' },
          }
        }
        // if the disconnected camera is the one selected, clear the feed
        // active camera is js object and uses connId not conn_id
        if (activeCamera.value?.connId === conn_id && activeCamera.value?.cameraId === camera_id) {
          clearActiveFeed()
        }
        break
      }
      // Forget Camera
      case 'ForgetCamera': {
        const { conn_id, camera_id, confirm } = data
        if (confirm) {
          const key = `${conn_id},${camera_id}`
          const updated = { ...cameras.value }
          delete updated[key]
          cameras.value = updated
          if (activeCamera.value?.connId === conn_id && activeCamera.value?.cameraId === camera_id) {
            clearActiveFeed()
          }
        }
        break
      }
      // Control configuration (reading and writing)
      case 'Configuration':
        controlConfig.value = { ... data, configuration: parseConfigurationPayload(data?.configuration) }
        break
      // GUI Image Analysis (reading the deviation)
      case 'ImageAnalysis':
        analysis.value = data
        break
      // Pong message from the server
      case 'Pong':
        lastPongTimestamp.value = Date.now()
        break
      // read the default thresholds
      case 'DefaultThresholds':
        defaultThresholds.value = data
        break
      // warn if case is not met.
      default:
        console.warn('Unhandled message type from server:', type, data)
    }
  }

  // clear the active/selected camera feed and reset variables
  function clearActiveFeed() {
    if (currentObjectUrl) {
      URL.revokeObjectURL(currentObjectUrl)
      currentObjectUrl = null
    }
    imageSrc.value = ''
    activeCamera.value = null
    analysis.value = null
  }

  // -----------------------------------------
  //   Outgoing API Commands (GUI -> Server)
  // -----------------------------------------

  // List the Edge micro computers
  function listEdges() {
    send('ListEdges')
  }

  // Set the name of Edge micro computers
  function setEdgeName(edgeId, name) {
    send('SetEdgeName', { edge_id: edgeId, name })
  }

  // Set Vision Processing Type
  function setEdgeProcessingType(edgeId, processingType) {
    send('SetEdgeProcessingType', { edge_id: edgeId, processing_type: processingType })
  }

  // list camera API function
  function listCameras() {
    send('ListCameras')
  }

  // set camera name API function
  function setCameraName(connId, cameraId, name) {
    send('SetNameCamera', { conn_id: connId, camera_id: cameraId, name })
  }

  // switch selected camera to a new camera, stopping the old one first (if any)
  function viewCamera(connId, cameraId) {
    if (activeCamera.value) {
      send('StopViewingCamera')
      clearActiveFeed()
    }
    activeCamera.value = { connId, cameraId }
    send('StartViewingCamera', { conn_id: connId, camera_id: cameraId })
  }

  // stop viewing camera
  function stopViewingCamera(connId, cameraId) {
    send('StopViewingCamera')
    if (activeCamera.value?.connId === connId && activeCamera.value?.cameraId === cameraId) {
      clearActiveFeed()
    }
  }

  // view camera config
  function viewCameraConfig(connId, cameraId) {
    send('ViewCameraConfig', { conn_id: connId, camera_id: cameraId })
  }

  // update camera control configuration
  function updateConfiguration(connId, cameraId, configuration) {
    send('Configuration', {
      conn_id: connId,
      camera_id: cameraId,
      configuration:
        typeof configuration === 'string' ? configuration : JSON.stringify(configuration),
    })
  }

  // Set Camera Thresholds (Deviation alerts thresholds)
  function setCameraThresholds(edgeId, cameraId, warnBelowThreshold, alertBelowThreshold) {
    send('SetCameraThresholds', {
      edge_id: edgeId,
      camera_id: cameraId,
      warn_below_threshold: warnBelowThreshold,
      alert_below_threshold: alertBelowThreshold,
    })
  }

  // Set Defualt vlaue of the servers camera thresholds
  function setDefaultThreshold(warnBelowThreshold, alertBelowThreshold) {
    send('SetDefaultThreshold', {
      warn_below_threshold: warnBelowThreshold,
      alert_below_threshold: alertBelowThreshold,
    })
  }

  // get defualt thresholds
  function getDefaultThresholds() {
    send('GetDefaultThresholds')
  }

  // Setpoint function for a single camera
  function setpoint(connId, cameraId) {
    send('Setpoint', { conn_id: connId, camera_id: cameraId })
  }

  // Setpoint function for all Cameras (no json attached)
  function setpointAll() {
    send('Setpoint')
  }

  // Forget Camera Function
  function forgetCamera(connId, cameraId) {
    send('ForgetCamera', { conn_id: connId, camera_id: cameraId, confirm: true })
  }

  // ---------------
  //   UnMount
  // ---------------
  onUnmounted(() => {
    disconnect()
  })

  return {
    // state
    status,
    // error
    error,
    // data
    edges,
    edgeList,
    cameras,
    cameraList,
    imageSrc,
    analysis,
    controlConfig,
    activeCamera,
    defaultThresholds,
    // connection
    connect,
    disconnect,
    // functions
    listEdges,
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
    forgetCamera,
  }
}
