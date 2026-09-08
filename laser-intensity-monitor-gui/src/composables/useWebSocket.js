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
  // -------------------------
  //   Variable Values
  // -------------------------
  let socket = null
  let currentObjectUrl = null
  // -----------------
  //   Wire format
  // -----------------
  // Encoder: builds the "Type:{JSON}" String the server expects.
  function encodeMessage(type, data) {
    if (data === undefined || data === null) return type
    if (typeof data === 'object' && Object.keys(data).length === 0) return type
    return `${type}:${JSON.stringify(data)}`
  }
  // Decoder: Breaks down string into Type and JSON
  function decodeServerMessage(raw) {
    const text = String(raw).trim()
    const sep = text.indexOf(':')
    if (sep === -1) {
      return {type: text, data:null}
    }
    const type = text.slice(0, sep)
    const jsonData = text.slice(sep + 1)
    try {
      return {type, data: JSON.parse(jsonData)}
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
    socket.send(encodeMessage(type, data))
  }
  // -------------------------
  //   Heartbeat
  // -------------------------
  // Ping rate time in ms
  const HEARTBEAT_INTERVAL = 7000
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
  // handle pong when it is recived:
  // -------------------------
  //   Connection to Server
  // -------------------------
  function connect() {
    if (socket?.readyState === WebSocket.OPEN) return
    status.value = 'CONNECTING'
    socket = new WebSocket(url)
    socket.binaryType = 'blob'

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
    status.value = 'DISCONNECTED'
  }
  // -------------------------
  //   Handling Server Data
  // -------------------------
  // Handle the image feed
  function handleImageFrame(blob) {
    if (currentObjectUrl) {
      URL.revokeObjectURL(currentObjectUrl)
    }
    currentObjectUrl = URL.createObjectURL(blob)
    imageSrc.value = currentObjectUrl
  }
  // normalise hash map to java data object array and get rid of the tuple
  function normaliseCameraMap(raw) {
    const normalised = {}
    if (!raw) return normalised
    const setArrayEntry = (connId, cameraId, details) => {
      const key = `${connId},${cameraId}`
      normalised[key] = {
        conn_id: connId,
        camera_id: cameraId,
        name: details?.name ?? '',
        state: details?.state ?? 'Disconnected',
        warn_below_threshold: details?.warn_below_threshold ?? null,
        alert_below_threshold: details?.alert_below_threshold ?? null,
      }
    }
    // if the raw data array is in the shape of an array
    if (Array.isArray(raw)) {
      for (const [key, details] of raw) {
        const [connId, cameraId] = Array.isArray(key) ? key : [key.conn_id, key.camera_id]
        setArrayEntry(connId, cameraId, details)
      }
      return normalised
    }
    // Fallback: object keyed by some stringified form of the tuple, e.g. "(1, 2)" or "1,2"
    for (const [key, details] of Object.entries(raw)) {
      const match = String(key).match(/(-?\d+)\D+(-?\d+)/)
      const connId = match ? Number(match[1]) : key
      const cameraId = match ? Number(match[2]) : null
      setArrayEntry(connId, cameraId, details)
    }
    return normalised
  }
  // Normalise the Edge hash map into a java array
  function normaliseEdgeMap(raw) {
    const normalised = {}
    if (!raw) return normalised
    for (const [key, name] of Object.entries(raw)) {
      const connId = Number(key)
      normalised[connId] = { conn_id: connId, name, state: 'Active' }
    }
    return normalised
  }
  // Handle the Text message sent by the server
  function handleTextMessage(raw) {
    const { type, data } = decodeServerMessage(raw)
    if (type === null) return

    switch (type) {
      // list of All cameras
      case 'ListOfCameras':
        cameras.value = normaliseCameraMap(data.cameras)
        break
      // list of All edge (micro computers)
      case 'ListOfEdges':
        edges.value = normaliseEdgeMap(data.edges)
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
        const updated = { ...cameras.value }
        delete updated[key]
        cameras.value = updated
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
        controlConfig.value = data
        break
      // GUI Image Analysis (reading the deviation and intensity)
      case 'ImageAnalysis':
        analysis.value = data
        break
      // Pong message from the server
      case 'Pong':
        lastPongTimestamp.value = Date.now()
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

  // Set the Camera Thresholds to Default
  function setDefaultThreshold(warnBelowThreshold, alertBelowThreshold) {
    send('SetDefaultThreshold', {
      warn_below_threshold: warnBelowThreshold,
      alert_below_threshold: alertBelowThreshold,
    })
  }


  // Setpoint function for a single camera
  function setpoint(connId, cameraId) {
    send('Setpoint', { conn_id: connId, camera_id: cameraId })
  }

  // Setpoint function for all ListCameras
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
    setpoint,
    setpointAll,
    forgetCamera,
  }
}
