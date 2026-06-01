import { ref, onUnmounted } from 'vue'
export function useWebSocket({
  url,
  autoReconnect = true,
  maxReconnects = 10,
  reconnectDelay = 3000,
  onOpen,
  onClose,
  onError,
}) {
  //-------------Sate-------------
  const status = ref('disconnected')
}
