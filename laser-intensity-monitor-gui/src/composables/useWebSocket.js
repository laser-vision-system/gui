import { ref, onUnmounted } from 'vue'

export function useWebSocket(url) {
  const status = ref('DISCONNECTED')   // 'CONNECTING' | 'CONNECTED' | 'DISCONNECTED' | 'ERROR'
  const error = ref(null)

  // camera list
  const cameras = ref({})
  // active camera feed
  const imageSrc = ref('')
  // image analysis for active camera
  const analysis = ref(null)
  // active camera / selected camera
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
    if(currentObjectUrl) {
      URL.revokeObjectURL(currentObjectUrl)
    }
    currentObjectUrl = URL.createObjectURL(blob)
    imageSrc.value = currentObjectUrl
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
        cameras.value = message.data.cameras
        break
      // camera disconnect
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
      // Control configuration (reading and writing)
      case 'Configuration':
        controlConfig.value = message.data
        break
      // GUI Image Analysis (reading the deviation and intensity)
      case 'GUIImageAnalysis':
        analysis.value = message.data
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
      send('StopViewingCamera', {
        conn_id: activeCamera.value.connId,
        camera_id: activeCamera.value.cameraId,
      })
      clearActiveFeed()
    }
    activeCamera.value = { connId, cameraId }
    send('StartViewingCamera', { conn_id: connId, camera_id: cameraId })
  }

  // stop viewing camera
  function stopViewingCamera(connId, cameraId) {
    send('StopViewingCamera', { conn_id: connId, camera_id: cameraId })
    if (activeCamera.value?.connId === connId && activeCamera.value?.cameraId === cameraId) {
      clearActiveFeed()
    }
  }

  onUnmounted(() => {
    disconnect()
  })

  return { 
    status, 
    error, 
    cameras,
    imageSrc, 
    analysis,
    activeCamera,
    // connection
    connect, 
    disconnect, 
    // commands
    listCameras,
    setCameraName,
    viewCamera,
    stopViewingCamera
  }
}
