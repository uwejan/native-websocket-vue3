# native-websocket-vue3

[![npm version](https://img.shields.io/npm/v/native-websocket-vue3.svg?style=flat-square)](https://www.npmjs.com/package/native-websocket-vue3)
[![npm downloads](https://img.shields.io/npm/dm/native-websocket-vue3.svg?style=flat-square)](https://www.npmjs.com/package/native-websocket-vue3)
[![CI](https://img.shields.io/github/actions/workflow/status/uwejan/native-websocket-vue3/ci.yml?style=flat-square&label=CI)](https://github.com/uwejan/native-websocket-vue3/actions)
[![codecov](https://img.shields.io/codecov/c/github/uwejan/native-websocket-vue3?style=flat-square)](https://codecov.io/gh/uwejan/native-websocket-vue3)
[![GitHub stars](https://img.shields.io/github/stars/uwejan/native-websocket-vue3?style=social)](https://github.com/uwejan/native-websocket-vue3)
[![license](https://img.shields.io/npm/l/native-websocket-vue3.svg?style=flat-square)](https://github.com/uwejan/native-websocket-vue3/blob/master/LICENSE.md)

Native WebSocket implementation for Vue 3 with **Composition API** support, Vuex, and Pinia integration.

> ⭐ **If this library helps you build real-time Vue apps, consider giving it a star!** It helps others discover this project and motivates continued development.

## Features

- 🚀 **Composition API** - Modern `useWebSocket` composable
- 📦 **Zero dependencies** - Uses native WebSocket API
- 🔄 **Auto-reconnect** - Configurable reconnection with backoff
- 🏪 **State management** - Vuex and Pinia integration
- 📝 **TypeScript** - Full type definitions included
- 🌳 **Tree-shakeable** - ESM support with named exports

## Install

```bash
npm install native-websocket-vue3
# or
yarn add native-websocket-vue3
# or
pnpm add native-websocket-vue3
```

## Quick Start

### Composition API (Recommended)

```vue
<script setup>
import { useWebSocket } from 'native-websocket-vue3'
import { watch } from 'vue'

const { data, send, isConnected, status } = useWebSocket('ws://localhost:9090', {
  autoReconnect: true,
  json: true
})

// Watch for incoming messages
watch(data, (message) => {
  console.log('Received:', message)
})

function sendMessage() {
  send({ type: 'greeting', text: 'Hello!' })
}
</script>

<template>
  <div>
    <p>Status: {{ status }}</p>
    <p>Connected: {{ isConnected }}</p>
    <button @click="sendMessage" :disabled="!isConnected">
      Send Message
    </button>
  </div>
</template>
```

### Plugin API (Options API)

```js
import { createApp } from 'vue'
import VueNativeSock from 'native-websocket-vue3'
import App from './App.vue'

const app = createApp(App)
app.use(VueNativeSock, 'ws://localhost:9090')
app.mount('#app')
```

## Composition API

### `useWebSocket(url, options?)`

Returns reactive WebSocket state and methods.

```js
const {
  ws,           // ShallowRef<WebSocket | null>
  data,         // ShallowRef - latest received message
  error,        // ShallowRef - latest error
  status,       // Ref<'DISCONNECTED' | 'CONNECTING' | 'CONNECTED' | 'ERROR'>
  isConnected,  // Ref<boolean>
  connect,      // () => void
  disconnect,   // () => void
  send          // (message: string | object) => boolean
} = useWebSocket('ws://localhost:9090', {
  autoConnect: true,       // Connect immediately (default: true)
  autoReconnect: false,    // Auto-reconnect on disconnect (default: false)
  reconnectAttempts: 5,    // Max reconnection attempts (default: Infinity)
  reconnectDelay: 1000,    // Delay between attempts in ms (default: 1000)
  protocol: '',            // WebSocket sub-protocol
  json: false              // Auto-parse/stringify JSON (default: false)
})
```

### Manual Connection

```js
const { connect, disconnect, isConnected } = useWebSocket('ws://localhost:9090', {
  autoConnect: false
})

// Connect when ready
onMounted(() => {
  connect()
})

// Disconnect on cleanup
onUnmounted(() => {
  disconnect()
})
```

## Plugin API Options

```js
app.use(VueNativeSock, 'ws://localhost:9090', {
  format: 'json',              // Enable JSON message parsing
  reconnection: true,          // Enable auto-reconnect
  reconnectionAttempts: 5,     // Max attempts before giving up
  reconnectionDelay: 3000,     // Delay between attempts (ms)
  connectManually: true,       // Don't connect automatically
  protocol: 'my-protocol',     // WebSocket sub-protocol
  store: myStore,              // Vuex or Pinia store
  mutations: customMutations   // Custom mutation name mapping
})
```

### Component Usage

```vue
<script>
export default {
  methods: {
    sendMessage() {
      this.$socket.send('Hello!')
      // With format: 'json'
      this.$socket.sendObj({ type: 'message', text: 'Hello!' })
    }
  },
  sockets: {
    onopen(event) {
      console.log('Connected!')
    },
    onmessage(event) {
      console.log('Received:', event.data)
    },
    onclose(event) {
      console.log('Disconnected')
    },
    onerror(event) {
      console.error('Error:', event)
    }
  }
}
</script>
```

### Manual Connection (Plugin)

```js
// In main.js
app.use(VueNativeSock, 'ws://localhost:9090', {
  connectManually: true,
  store: myStore
})

// In a component
this.$connect()
this.$connect('ws://other-server:9090', { format: 'json' })  // Alternative URL
this.$disconnect()
```

## Pinia Integration

```js
// stores/websocket.js
import { defineStore } from 'pinia'

export const useWebSocketStore = defineStore('websocket', {
  state: () => ({
    isConnected: false,
    message: null,
    reconnectError: false
  }),

  actions: {
    SOCKET_ONOPEN(event) {
      this.isConnected = true
    },
    SOCKET_ONCLOSE(event) {
      this.isConnected = false
    },
    SOCKET_ONERROR(event) {
      console.error('Socket error:', event)
    },
    SOCKET_ONMESSAGE(message) {
      this.message = message
    },
    SOCKET_RECONNECT(count) {
      console.log('Reconnecting...', count)
    },
    SOCKET_RECONNECT_ERROR() {
      this.reconnectError = true
    }
  }
})

// main.js
import { createPinia } from 'pinia'
import VueNativeSock from 'native-websocket-vue3'
import { useWebSocketStore } from './stores/websocket'

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)

const wsStore = useWebSocketStore(pinia)
app.use(VueNativeSock, 'ws://localhost:9090', {
  store: wsStore,
  format: 'json'
})
```

## Vuex Integration

```js
// store/index.js
import { createStore } from 'vuex'

export default createStore({
  state: {
    socket: {
      isConnected: false,
      message: '',
      reconnectError: false
    }
  },
  mutations: {
    SOCKET_ONOPEN(state, event) {
      state.socket.isConnected = true
    },
    SOCKET_ONCLOSE(state, event) {
      state.socket.isConnected = false
    },
    SOCKET_ONERROR(state, event) {
      console.error(state, event)
    },
    SOCKET_ONMESSAGE(state, message) {
      state.socket.message = message
    },
    SOCKET_RECONNECT(state, count) {
      console.info('Reconnecting...', count)
    },
    SOCKET_RECONNECT_ERROR(state) {
      state.socket.reconnectError = true
    }
  }
})

// main.js
import store from './store'
app.use(VueNativeSock, 'ws://localhost:9090', { store, format: 'json' })
```

### Custom Mutation Names

```js
const mutations = {
  SOCKET_ONOPEN: 'WS_CONNECTED',
  SOCKET_ONCLOSE: 'WS_DISCONNECTED',
  SOCKET_ONERROR: 'WS_ERROR',
  SOCKET_ONMESSAGE: 'WS_MESSAGE',
  SOCKET_RECONNECT: 'WS_RECONNECT',
  SOCKET_RECONNECT_ERROR: 'WS_RECONNECT_ERROR'
}

app.use(VueNativeSock, 'ws://localhost:9090', { store, mutations })
```

### JSON Message Routing

When `format: 'json'` is enabled, messages with `namespace`, `mutation`, or `action` properties are automatically routed:

```js
// Server sends: { namespace: 'chat', action: 'newMessage', payload: {...} }
// Vuex dispatches: 'chat/newMessage'
```

### Custom Store Handler

```js
app.use(VueNativeSock, 'ws://localhost:9090', {
  passToStoreHandler(eventName, event, next) {
    // Preprocess the event
    if (event.data) {
      event.data = transformData(event.data)
    }
    // Pass to default handler
    next(eventName, event)
  }
})
```

## TypeScript

Type definitions are included. For the Composition API:

```ts
import { useWebSocket } from 'native-websocket-vue3'

interface ChatMessage {
  type: string
  text: string
  timestamp: number
}

const { data, send } = useWebSocket<ChatMessage>('ws://localhost:9090', {
  json: true
})
```

## Migration from v3.0.x

### Breaking Changes

None! This version is backward compatible. New features:

- `useWebSocket` composable for Composition API
- Full TypeScript support
- ESM module support

### Recommended Updates

1. **Use Composition API** for new components:
   ```js
   // Old (still works)
   this.$socket.send('message')

   // New (recommended)
   const { send } = useWebSocket(url)
   send('message')
   ```

2. **Update Pinia stores** to use `defineStore`:
   ```js
   // Old
   const store = { _p: true, ... }

   // New
   const store = defineStore('ws', { ... })
   ```

## 📄 License

MIT © Saddam Uwejan

---

## 👤 Author

**Saddam Uwejan (Sam)** - AI/ML engineer and Rust systems developer. Author of [tokio-actors](https://crates.io/crates/tokio-actors). Building high-performance infrastructure for LLM and AI applications.

- 🔗 [GitHub](https://github.com/uwejan)
- 💼 [LinkedIn](https://linkedin.com/in/uwejan)

---

## 🤝 Contributing

Contributions are welcome! Please open an issue or submit a PR.

For implementation details and edge cases, see `test/` directory.

---

Built with ❤️ for Vue developers who value simplicity over complexity.
