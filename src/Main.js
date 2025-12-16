import Observer from './Observer'
import Emitter from './Emitter'
import { useWebSocket } from './useWebSocket'

export default {

  install (app, connection, opts = {}) {
    if (!connection && !opts.connectManually) { throw new Error('[vue-native-socket] cannot locate connection') }

    let observer = null

    opts.$setInstance = (wsInstance) => {
      app.config.globalProperties.$socket = wsInstance
    }

    if (opts.connectManually) {
      app.config.globalProperties.$connect = (connectionUrl = connection, connectionOpts = opts) => {
        connectionOpts.$setInstance = opts.$setInstance
        observer = new Observer(connectionUrl, connectionOpts)
        app.config.globalProperties.$socket = observer.WebSocket
        opts.store.$socket = observer.WebSocket
        opts.store._customProperties.add('$socket')
      }

      app.config.globalProperties.$disconnect = () => {
        if (observer && observer.reconnection) {
          observer.reconnection = false
          clearTimeout(observer.reconnectTimeoutId)
        }
        if (app.config.globalProperties.$socket) {
          app.config.globalProperties.$socket.close()
          delete app.config.globalProperties.$socket
        }
      }
    } else {
      observer = new Observer(connection, opts)
      app.config.globalProperties.$socket = observer.WebSocket
    }
    const hasProxy = typeof Proxy !== 'undefined' && typeof Proxy === 'function' && /native code/.test(Proxy.toString())

    app.mixin({
      created () {
        const vm = this
        const sockets = this.$options.sockets

        if (hasProxy) {
          this.$options.sockets = new Proxy({}, {
            set (target, key, value) {
              Emitter.addListener(key, value, vm)
              target[key] = value
              return true
            },
            deleteProperty (target, key) {
              Emitter.removeListener(key, vm.$options.sockets[key], vm)
              delete target.key
              return true
            }
          })
          if (sockets) {
            Object.keys(sockets).forEach((key) => {
              this.$options.sockets[key] = sockets[key]
            })
          }
        } else {
          Object.seal(this.$options.sockets)

          // if !hasProxy need addListener
          if (sockets) {
            Object.keys(sockets).forEach(key => {
              Emitter.addListener(key, sockets[key], vm)
            })
          }
        }
        app.config.globalProperties.sockets = new Proxy({}, {
          set (target, key, value) {
            Emitter.addListener(key, value, vm)
            target[key] = value
            return true
          },
          deleteProperty (target, key) {
            Emitter.removeListener(key, vm.$options.sockets[key], vm)
            delete target.key
            return true
          }
        })
      },
      beforeUnmount () {
        if (hasProxy) {
          const sockets = this.$options.sockets

          if (sockets) {
            Object.keys(sockets).forEach((key) => {
              delete this.$options.sockets[key]
            })
          }
        }
      }
    })
  }
}

// Named exports for tree-shaking
export { useWebSocket, Observer, Emitter }
