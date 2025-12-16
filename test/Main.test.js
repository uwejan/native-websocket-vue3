import { describe, it, expect, vi, beforeEach } from 'vitest'
import Emitter from '../src/Emitter'

// Mock WebSocket
class MockWebSocket {
    static CONNECTING = 0
    static OPEN = 1
    static CLOSING = 2
    static CLOSED = 3

    constructor(url, protocol) {
        this.url = url
        this.protocol = protocol || ''
        this.readyState = MockWebSocket.CONNECTING
        this.onopen = null
        this.onclose = null
        this.onerror = null
        this.onmessage = null
    }

    send(data) {
        return true
    }

    close() {
        this.readyState = MockWebSocket.CLOSED
        if (this.onclose) this.onclose({ type: 'close' })
    }
}

vi.stubGlobal('WebSocket', MockWebSocket)

describe('Main Plugin', () => {
    let VueNativeSock
    let mockApp

    beforeEach(async () => {
        // Clear emitter listeners
        Emitter.listeners.clear()

        // Reset mocks
        mockApp = {
            config: {
                globalProperties: {}
            },
            mixin: vi.fn()
        }

        // Fresh import
        const module = await import('../src/Main.js')
        VueNativeSock = module.default
    })

    describe('install', () => {
        it('should throw error if no connection and not manual', () => {
            expect(() => {
                VueNativeSock.install(mockApp, null, {})
            }).toThrow('[vue-native-socket] cannot locate connection')
        })

        it('should not throw if connection provided', () => {
            expect(() => {
                VueNativeSock.install(mockApp, 'ws://localhost:9090')
            }).not.toThrow()
        })

        it('should not throw if connectManually is true', () => {
            expect(() => {
                VueNativeSock.install(mockApp, null, { connectManually: true })
            }).not.toThrow()
        })

        it('should set $socket on app global properties', () => {
            VueNativeSock.install(mockApp, 'ws://localhost:9090')

            expect(mockApp.config.globalProperties.$socket).toBeDefined()
        })

        it('should register app mixin', () => {
            VueNativeSock.install(mockApp, 'ws://localhost:9090')

            expect(mockApp.mixin).toHaveBeenCalled()
        })

        it('should set $setInstance function in opts', () => {
            const opts = {}
            VueNativeSock.install(mockApp, 'ws://localhost:9090', opts)

            expect(opts.$setInstance).toBeDefined()
            expect(typeof opts.$setInstance).toBe('function')
        })

        it('$setInstance should update $socket', () => {
            const opts = {}
            VueNativeSock.install(mockApp, 'ws://localhost:9090', opts)

            const newSocket = { url: 'new-socket' }
            opts.$setInstance(newSocket)

            expect(mockApp.config.globalProperties.$socket).toBe(newSocket)
        })
    })

    describe('manual connection', () => {
        it('should set $connect and $disconnect methods', () => {
            VueNativeSock.install(mockApp, 'ws://localhost:9090', {
                connectManually: true
            })

            expect(mockApp.config.globalProperties.$connect).toBeDefined()
            expect(mockApp.config.globalProperties.$disconnect).toBeDefined()
        })

        it('$connect should create socket and set on store', () => {
            const store = {
                _customProperties: new Set()
            }

            VueNativeSock.install(mockApp, 'ws://localhost:9090', {
                connectManually: true,
                store
            })

            mockApp.config.globalProperties.$connect()

            expect(mockApp.config.globalProperties.$socket).toBeDefined()
            expect(store.$socket).toBeDefined()
            expect(store._customProperties.has('$socket')).toBe(true)
        })

        it('$disconnect should close socket and cleanup', () => {
            VueNativeSock.install(mockApp, 'ws://localhost:9090', {
                connectManually: true,
                store: { _customProperties: new Set(), commit: vi.fn() }
            })

            mockApp.config.globalProperties.$connect()
            const closeSpy = vi.spyOn(mockApp.config.globalProperties.$socket, 'close')

            mockApp.config.globalProperties.$disconnect()

            expect(closeSpy).toHaveBeenCalled()
            expect(mockApp.config.globalProperties.$socket).toBeUndefined()
        })

        it('$disconnect should stop reconnection', () => {
            VueNativeSock.install(mockApp, 'ws://localhost:9090', {
                connectManually: true,
                reconnection: true,
                store: { _customProperties: new Set() }
            })

            mockApp.config.globalProperties.$connect('ws://localhost:9090', {
                reconnection: true,
                $setInstance: () => { }
            })

            mockApp.config.globalProperties.$disconnect()

            expect(mockApp.config.globalProperties.$socket).toBeUndefined()
        })
    })

    describe('mixin lifecycle', () => {
        it('should create mixin with created and beforeUnmount hooks', () => {
            VueNativeSock.install(mockApp, 'ws://localhost:9090')

            expect(mockApp.mixin).toHaveBeenCalledWith(
                expect.objectContaining({
                    created: expect.any(Function),
                    beforeUnmount: expect.any(Function)
                })
            )
        })

        it('created hook should set up socket proxy', () => {
            VueNativeSock.install(mockApp, 'ws://localhost:9090')

            const mixin = mockApp.mixin.mock.calls[0][0]
            const mockVm = {
                $options: { sockets: {} }
            }

            mixin.created.call(mockVm)

            expect(mockApp.config.globalProperties.sockets).toBeDefined()
        })

        it('created hook should register existing socket handlers', () => {
            VueNativeSock.install(mockApp, 'ws://localhost:9090')

            const mixin = mockApp.mixin.mock.calls[0][0]
            const handler = vi.fn()
            const mockVm = {
                $options: { sockets: { onmessage: handler } }
            }

            mixin.created.call(mockVm)

            expect(Emitter.listeners.has('onmessage')).toBe(true)
        })

        it('beforeUnmount should run without errors', () => {
            VueNativeSock.install(mockApp, 'ws://localhost:9090')

            const mixin = mockApp.mixin.mock.calls[0][0]
            const handler = vi.fn()
            const mockVm = {
                $options: { sockets: { onmessage: handler } }
            }

            mixin.created.call(mockVm)

            // beforeUnmount should not throw
            expect(() => mixin.beforeUnmount.call(mockVm)).not.toThrow()
        })

        it('socket proxy set should add listener', () => {
            VueNativeSock.install(mockApp, 'ws://localhost:9090')

            const mixin = mockApp.mixin.mock.calls[0][0]
            const mockVm = {
                $options: { sockets: {} }
            }

            mixin.created.call(mockVm)

            const handler = vi.fn()
            mockApp.config.globalProperties.sockets.ontest = handler

            expect(Emitter.listeners.has('ontest')).toBe(true)
        })

        it('socket proxy delete should work', () => {
            VueNativeSock.install(mockApp, 'ws://localhost:9090')

            const mixin = mockApp.mixin.mock.calls[0][0]
            const handler = vi.fn()
            const mockVm = {
                $options: { sockets: { ontest: handler } }
            }

            mixin.created.call(mockVm)

            // Proxy delete should not throw
            expect(() => {
                delete mockApp.config.globalProperties.sockets.ontest
            }).not.toThrow()
        })
    })
})

describe('Named exports', () => {
    it('should export useWebSocket', async () => {
        const { useWebSocket } = await import('../src/Main.js')
        expect(useWebSocket).toBeDefined()
        expect(typeof useWebSocket).toBe('function')
    })

    it('should export Observer', async () => {
        const { Observer } = await import('../src/Main.js')
        expect(Observer).toBeDefined()
    })

    it('should export Emitter', async () => {
        const { Emitter } = await import('../src/Main.js')
        expect(Emitter).toBeDefined()
    })
})
