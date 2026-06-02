import { ref, onUnmounted } from 'vue'
export function useWebSocket(url) {
  const imageSrc = ref('') // if using binary data such as jpeg or png
  const status = ref('DISCONNECTED')   // 'CONNECTING' | 'CONNECTED' | 'DISCONNECTED' | 'ERROR'
  const error = ref(null)
  const reconnectAttempts = ref(0)

  let socket = null
  let currentObjectUrl = null
  function connect() {
    if (socket?.readyState === WebSocket.OPEN) return

    status.value = 'CONNECTING'
    socket = new WebSocket(url)
    socket.binaryType = 'blob'

    socket.onopen = () => {
      status.value = 'CONNECTED'
      error.value = null
    }
    socket.onmessage = (event) => {
      // Revoke previous object URL to avoid memory leaks
      if (currentObjectUrl) {
        URL.revokeObjectURL(currentObjectUrl)
      }

      // Create a blob URL from the binary frame and set as img src
      const blob = new Blob([event.data], { type: 'image/jpeg' })
      currentObjectUrl = URL.createObjectURL(blob)
      imageSrc.value = currentObjectUrl
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
    socket?.close()
    status.value = 'DISCONNECTED'

  }

  return { status, error, imageSrc, connect, disconnect, }
}
