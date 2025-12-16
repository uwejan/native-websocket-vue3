import type { App, Ref, ShallowRef } from 'vue'
import type { Store } from 'vuex'

// Plugin options
export interface VueNativeSockOptions {
    /** Vuex or Pinia store instance */
    store?: Store<any> | ReturnType<typeof import('pinia').defineStore>
    /** WebSocket sub-protocol */
    protocol?: string
    /** Enable JSON message parsing/stringifying */
    format?: 'json'
    /** Enable automatic reconnection */
    reconnection?: boolean
    /** Maximum number of reconnection attempts */
    reconnectionAttempts?: number
    /** Delay between reconnection attempts in milliseconds */
    reconnectionDelay?: number
    /** Enable manual connection (don't connect automatically) */
    connectManually?: boolean
    /** Custom mutation names mapping */
    mutations?: {
        SOCKET_ONOPEN?: string
        SOCKET_ONCLOSE?: string
        SOCKET_ONERROR?: string
        SOCKET_ONMESSAGE?: string
        SOCKET_RECONNECT?: string
        SOCKET_RECONNECT_ERROR?: string
    }
    /** Custom handler for passing events to store */
    passToStoreHandler?: (
        eventName: string,
        event: Event | MessageEvent,
        next: (eventName: string, event: Event | MessageEvent) => void
    ) => void
}

// useWebSocket composable options
export interface UseWebSocketOptions {
    /** Whether to connect immediately (default: true) */
    autoConnect?: boolean
    /** Whether to reconnect on disconnect (default: false) */
    autoReconnect?: boolean
    /** Max reconnection attempts (default: Infinity) */
    reconnectAttempts?: number
    /** Delay between reconnect attempts in ms (default: 1000) */
    reconnectDelay?: number
    /** WebSocket sub-protocol */
    protocol?: string
    /** Whether to auto-parse/stringify JSON (default: false) */
    json?: boolean
}

// useWebSocket return type
export interface UseWebSocketReturn<T = any> {
    /** Raw WebSocket instance */
    ws: ShallowRef<WebSocket | null>
    /** Latest received data */
    data: ShallowRef<T | null>
    /** Latest error */
    error: ShallowRef<Event | null>
    /** Connection status: 'DISCONNECTED' | 'CONNECTING' | 'CONNECTED' | 'ERROR' */
    status: Ref<'DISCONNECTED' | 'CONNECTING' | 'CONNECTED' | 'ERROR'>
    /** Whether currently connected */
    isConnected: Ref<boolean>
    /** Connect to the WebSocket server */
    connect: () => void
    /** Disconnect from the WebSocket server */
    disconnect: () => void
    /** Send data through the WebSocket */
    send: (message: string | object) => boolean
}

/**
 * Composition API composable for WebSocket connections.
 */
export function useWebSocket<T = any>(
    url: string,
    options?: UseWebSocketOptions
): UseWebSocketReturn<T>

// Vue plugin
export interface VueNativeSockPlugin {
    install: (app: App, connection: string, opts?: VueNativeSockOptions) => void
}

declare const VueNativeSock: VueNativeSockPlugin
export default VueNativeSock

// Observer class
export class Observer {
    constructor(connectionUrl: string, opts?: VueNativeSockOptions)
    WebSocket: WebSocket
    connect(connectionUrl: string, opts?: VueNativeSockOptions): WebSocket
    reconnect(): void
}

// Emitter singleton
export interface EmitterInstance {
    addListener(label: string, callback: Function, vm: any): boolean
    removeListener(label: string, callback: Function, vm: any): boolean
    emit(label: string, ...args: any[]): boolean
}

export const Emitter: EmitterInstance

// Vue module augmentation
declare module 'vue' {
    interface ComponentCustomProperties {
        /** WebSocket instance */
        $socket: WebSocket & {
            /** Send JSON-stringified object (when format: 'json' is enabled) */
            sendObj?: (obj: object) => void
        }
        /** Connect to WebSocket (when connectManually: true) */
        $connect: (url?: string, opts?: VueNativeSockOptions) => void
        /** Disconnect from WebSocket (when connectManually: true) */
        $disconnect: () => void
    }

    interface ComponentCustomOptions {
        /** Socket event handlers */
        sockets?: {
            onopen?: (event: Event) => void
            onclose?: (event: CloseEvent) => void
            onerror?: (event: Event) => void
            onmessage?: (event: MessageEvent) => void
        }
    }
}
