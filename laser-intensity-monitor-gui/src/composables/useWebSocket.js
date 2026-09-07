import { ref, computed, onUnmounted } from 'vue'

export function useWebSocket(url) {
  const status = ref('DISCONNECTED')   // 'CONNECTING' | 'CONNECTED' | 'DISCONNECTED' | 'ERROR'
  const error = ref(null)

  // cameras hashmap:
  // Hashmap: < (conn_id , camera_id), name, state >
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

  let socket = null
  let currentObjectUrl = null

  function send(type, data = {}) {
    if (socket?.readyState !== WebSocket.OPEN) {
      console.warn(`Cannot send "${type}", socket is not open`)
      return
    }
    socket.send(JSON.stringify({ type, data }))
  }

  function connect() {
    if (socket?.readyState === WebSocket.OPEN) return
    status.value = 'CONNECTING'
    socket = new WebSocket(url)
    socket.binaryType = 'blob'

    socket.onopen = () => {
      status.value = 'CONNECTED'
      error.value = null
      listCameras()
    }
    // check if the recived data is the image feed (blob) or json message, and handle appropriately
    socket.onmessage = (event) => {
      if (event.data instanceof Blob) {
        handleImageFrame(event.data)
      } else {
        handleJsonMessage(event.data)
      }
    }

    socket.onerror = (socketError) => {
      error.value = 'WebSocket error'
      status.value = 'ERROR'
      console.error(socketError)
    }

    socket.onclose = () => {
      status.value = 'DISCONNECTED'
    }
  }

  function disconnect() {
    // check if a camera is active
    if (activeCamera.value) {
      stopViewingCamera(activeCamera.value.connId, activeCamera.value.cameraId)
    }
    socket?.close()
    status.value = 'DISCONNECTED'
  }

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
    // if the tuple is sent as an array of pairs
    if (Array.isArray(raw)) {
      for (const [key, val] of raw) {
        const [conn_id, camera_id] = Array.isArray(key) ? key : [key.conn_id, key.camera_id]
        const [name, state] = val
        normalised[`${conn_id},${camera_id}`] = { conn_id, camera_id, name, state }
      }
      return normalised
    }
    // fall back code incase the raw data is already in an array (probs can be deleted after testing)
    for (const [key, val] of Object.entries(raw)) {
      const match = String(key).match(/(-?\d+)\D+(-?\d+)/) // does not matter what is sepperating the conn and cam id this generic will match
      const conn_id = match ? Number(match[1]) : key
      const camera_id = match ? Number(match[2]) : null
      const [name, state] = val
      normalised[`${conn_id},${camera_id}`] = { conn_id, camera_id, name, state }
    }
    return normalised
  }


  function handleJsonMessage(raw) {
    let message
    try {
      message = JSON.parse(raw)
    } catch (e) {
      console.error('Received faulty JSON from server:', e, raw)
      return
    }

    switch (message.type) {
      // list of cameras
      case 'ListOfCameras':
        cameras.value = normaliseCameraMap(message.data.cameras)
        break
      // Camera Connect  (a new camera has come online)
      case 'CameraConnected': {
        const { conn_id, camera_id, camera_name } = message.data
        const key = `${conn_id},${camera_id}`
        cameras.value = {
          ...cameras.value,
          [key]: { connId: conn_id, cameraId: camera_id, name: camera_name, state: 'Active' },
        }
        break
      }
      // Camera Disconnect
      case 'CameraDisconnected': {
        const { conn_id, camera_id } = message.data
        const key = `${conn_id},${camera_id}`
        const updated = { ...cameras.value }
        delete updated[key]
        cameras.value = updated
        // if the disconnected camera is the one selected, clear the feed
        if (activeCamera.value?.connId === conn_id && activeCamera.value?.cameraId === camera_id) {
          clearActiveFeed()
        }
        break
      }
      // Forget Camera
      case 'ForgetCamera': {
        const { conn_id, camera_id, confirm } = message.data
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
        controlConfig.value = message.data
        break
      // GUI Image Analysis (reading the deviation and intensity)
      case 'GUIImageAnalysis':
        analysis.value = message.data
        break
      // server-reported error
      case 'ErrorMSG':
        error.value = message.data
        console.error('Server error:', message.data.code, message.data.message)
        break
      // warn if case is not met.
      default:
        console.warn('Unhandled message type from server:', message.type, message.data)
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

  // ------------------- Outgoing API Commands (GUI -> Server) -------------------

  // list camera API function
  function listCameras() {
    send('ListCameras')
  }

  // set camera name API function
  function setCameraName(connId, cameraId, name) {
    send('GUISetNameCamera', { conn_id: connId, camera_id: cameraId, name })
  }

  // switch selected camera to a new camera, stopping the old one first (if any)
  function viewCamera(connId, cameraId) {
    if (activeCamera.value) {
      send('StopViewingCamera')
      clearActiveFeed()
    }
    activeCamera.value = { connId, cameraId }
    send('GUIStartViewingCamera', { conn_id: connId, camera_id: cameraId })
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

  // Setpoint function
  function setpoint(connId, cameraId) {
    send('GUISetpoint', { conn_id: connId, camera_id: cameraId })
  }

  // Forget Camera Function
  function forgetCamera(connId, cameraId) {
    send('ForgetCamera', { conn_id: connId, camera_id: cameraId, confirm: true })
  }



  onUnmounted(() => {
    disconnect()
  })

  return {
    // state
    status,
    // error
    error,
    // data
    cameras,
    cameraList,
    imageSrc,
    analysis,
    controlConfig,
    activeCamera,
    // connection
    connect,
    disconnect,
    // commands
    listCameras,
    setCameraName,
    viewCamera,
    stopViewingCamera,
    viewCameraConfig,
    updateConfiguration,
    setpoint,
    forgetCamera,
  }
}
