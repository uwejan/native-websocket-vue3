import { ref, shallowRef, onUnmounted, getCurrentInstance } from 'vue'

/**
 * Composition API composable for WebSocket connections.
 *
 * @param {string} url - WebSocket URL to connect to
 * @param {Object} options - Configuration options
 * @param {boolean} options.autoConnect - Whether to connect immediately (default: true)
 * @param {boolean} options.autoReconnect - Whether to reconnect on disconnect (default: false)
 * @param {number} options.reconnectAttempts - Max reconnection attempts (default: Infinity)
 * @param {number} options.reconnectDelay - Delay between reconnect attempts in ms (default: 1000)
 * @param {string} options.protocol - WebSocket sub-protocol
 * @param {boolean} options.json - Whether to auto-parse/stringify JSON (default: false)
 * @returns {Object} WebSocket reactive state and methods
 */
export function useWebSocket(url, options = {}) {
  const {
    autoConnect = true,
    autoReconnect = false,
    reconnectAttempts = Infinity,
    reconnectDelay = 1000,
    protocol = '',
    json = false
  } = options

  // Reactive state
  const ws = shallowRef(null)
  const isConnected = ref(false)
  const data = shallowRef(null)
  const error = shallowRef(null)
  const status = ref('DISCONNECTED') // DISCONNECTED, CONNECTING, CONNECTED, ERROR

  // Internal state
  let reconnectCount = 0
  let reconnectTimeoutId = null
  let explicitClose = false

  /**
     * Connect to the WebSocket server
     */
  function connect() {
    if (ws.value?.readyState === WebSocket.OPEN) {
      return
    }

    explicitClose = false
    status.value = 'CONNECTING'

    try {
      ws.value = protocol
        ? new WebSocket(url, protocol)
        : new WebSocket(url)
    } catch (e) {
      error.value = e
      status.value = 'ERROR'
      return
    }

    ws.value.onopen = (_event) => {
      isConnected.value = true
      status.value = 'CONNECTED'
      error.value = null
      reconnectCount = 0
    }

    ws.value.onclose = (_event) => {
      isConnected.value = false
      status.value = 'DISCONNECTED'
      ws.value = null

      if (!explicitClose && autoReconnect && reconnectCount < reconnectAttempts) {
        reconnectCount++
        reconnectTimeoutId = setTimeout(() => {
          connect()
        }, reconnectDelay)
      }
    }

    ws.value.onerror = (event) => {
      error.value = event
      status.value = 'ERROR'
    }

    ws.value.onmessage = (event) => {
      if (json) {
        try {
          data.value = JSON.parse(event.data)
        } catch {
          // JSON parse failed, use raw data
          data.value = event.data
        }
      } else {
        data.value = event.data
      }
    }
  }

  /**
     * Disconnect from the WebSocket server
     */
  function disconnect() {
    explicitClose = true
    if (reconnectTimeoutId) {
      clearTimeout(reconnectTimeoutId)
      reconnectTimeoutId = null
    }
    if (ws.value) {
      ws.value.close()
      ws.value = null
    }
    isConnected.value = false
    status.value = 'DISCONNECTED'
  }

  /**
     * Send data through the WebSocket
     * @param {string|Object} message - Data to send
     */
  function send(message) {
    if (!ws.value || ws.value.readyState !== WebSocket.OPEN) {
      console.warn('[useWebSocket] Cannot send - WebSocket is not connected')
      return false
    }

    const payload = json && typeof message === 'object'
      ? JSON.stringify(message)
      : message

    ws.value.send(payload)
    return true
  }

  // Auto-connect if enabled
  if (autoConnect) {
    connect()
  }

  // Cleanup on component unmount
  if (getCurrentInstance()) {
    onUnmounted(() => {
      disconnect()
    })
  }

  return {
    // State
    ws,
    data,
    error,
    status,
    isConnected,

    // Methods
    connect,
    disconnect,
    send
  }
}
