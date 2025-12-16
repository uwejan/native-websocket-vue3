import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

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

describe('Observer', () => {
    let Observer

    beforeEach(async () => {
        const module = await import('../src/Observer')
        Observer = module.default
    })

    describe('constructor', () => {
        it('should create a WebSocket connection', () => {
            const observer = new Observer('ws://localhost:9090')

            expect(observer.WebSocket).toBeDefined()
            expect(observer.WebSocket.url).toBe('ws://localhost:9090')
        })

        it('should handle protocol-relative URLs', () => {
            vi.stubGlobal('window', { location: { protocol: 'https:' } })

            const observer = new Observer('//localhost:9090')

            expect(observer.connectionUrl).toBe('wss://localhost:9090')
        })

        it('should handle http protocol-relative URLs', () => {
            vi.stubGlobal('window', { location: { protocol: 'http:' } })

            const observer = new Observer('//localhost:9090')

            expect(observer.connectionUrl).toBe('ws://localhost:9090')
        })

        it('should set reconnection options', () => {
            const observer = new Observer('ws://localhost:9090', {
                reconnection: true,
                reconnectionAttempts: 5,
                reconnectionDelay: 2000
            })

            expect(observer.reconnection).toBe(true)
            expect(observer.reconnectionAttempts).toBe(5)
            expect(observer.reconnectionDelay).toBe(2000)
        })

        it('should use default reconnection values', () => {
            const observer = new Observer('ws://localhost:9090')

            expect(observer.reconnection).toBe(false)
            expect(observer.reconnectionAttempts).toBe(Infinity)
            expect(observer.reconnectionDelay).toBe(1000)
        })

        it('should store mutations mapping', () => {
            const mutations = { SOCKET_ONOPEN: 'CUSTOM_OPEN' }
            const observer = new Observer('ws://localhost:9090', { mutations })

            expect(observer.mutations).toBe(mutations)
        })
    })

    describe('connect', () => {
        it('should create WebSocket with protocol if provided', () => {
            const observer = new Observer('ws://localhost:9090', {
                protocol: 'my-protocol'
            })

            expect(observer.WebSocket.protocol).toBe('my-protocol')
        })

        it('should add sendObj method when format is json', () => {
            const observer = new Observer('ws://localhost:9090', {
                format: 'json'
            })

            expect(observer.WebSocket.sendObj).toBeDefined()
            expect(typeof observer.WebSocket.sendObj).toBe('function')
        })
    })

    describe('onEvent', () => {
        it('should set up event handlers on WebSocket', () => {
            const observer = new Observer('ws://localhost:9090')

            expect(observer.WebSocket.onopen).toBeDefined()
            expect(observer.WebSocket.onclose).toBeDefined()
            expect(observer.WebSocket.onerror).toBeDefined()
            expect(observer.WebSocket.onmessage).toBeDefined()
        })

        it('should pass events to store', () => {
            const store = { commit: vi.fn() }
            const observer = new Observer('ws://localhost:9090', { store })

            observer.WebSocket.onopen({ type: 'open' })

            expect(store.commit).toHaveBeenCalledWith(
                'SOCKET_ONOPEN',
                expect.any(Object)
            )
        })
    })

    describe('reconnection', () => {
        it('should reconnect when enabled and onclose triggered', () => {
            vi.useFakeTimers()

            const setInstanceMock = vi.fn()
            const observer = new Observer('ws://localhost:9090', {
                reconnection: true,
                reconnectionDelay: 100,
                $setInstance: setInstanceMock
            })

            observer.WebSocket.onclose({ type: 'close' })

            vi.advanceTimersByTime(150)

            expect(observer.reconnectionCount).toBe(1)

            vi.useRealTimers()
        })

        it('should stop reconnecting after max attempts', () => {
            const store = { commit: vi.fn() }
            const observer = new Observer('ws://localhost:9090', {
                reconnection: true,
                reconnectionAttempts: 2,
                store
            })

            observer.reconnectionCount = 3

            observer.reconnect()

            expect(store.commit).toHaveBeenCalledWith('SOCKET_RECONNECT_ERROR', true)
        })
    })

    describe('store integration', () => {
        it('should detect Vuex store', () => {
            const vuexStore = {
                commit: vi.fn(),
                dispatch: vi.fn()
            }

            const observer = new Observer('ws://localhost:9090', {
                store: vuexStore
            })

            expect(observer.store).toBe(vuexStore)
        })

        it('should detect Pinia store', () => {
            const piniaStore = {
                $patch: vi.fn(),
                SOCKET_ONOPEN: vi.fn()
            }

            const observer = new Observer('ws://localhost:9090', {
                store: piniaStore
            })

            expect(observer.store).toBe(piniaStore)
        })
    })

    describe('passToStore', () => {
        it('should call Vuex commit for mutations', () => {
            const vuexStore = {
                commit: vi.fn(),
                dispatch: vi.fn()
            }

            const observer = new Observer('ws://localhost:9090', {
                store: vuexStore
            })

            observer.passToStore('SOCKET_ONOPEN', { type: 'open' })

            expect(vuexStore.commit).toHaveBeenCalledWith(
                'SOCKET_ONOPEN',
                { type: 'open' }
            )
        })

        it('should call Pinia actions directly', () => {
            const piniaStore = {
                $patch: vi.fn(),
                SOCKET_ONOPEN: vi.fn(),
                SOCKET_ONMESSAGE: vi.fn()
            }

            const observer = new Observer('ws://localhost:9090', {
                store: piniaStore
            })

            observer.passToStore('SOCKET_ONOPEN', { type: 'open' })

            expect(piniaStore.SOCKET_ONOPEN).toHaveBeenCalledWith({ type: 'open' })
        })

        it('should use custom passToStoreHandler if provided', () => {
            const customHandler = vi.fn()

            const observer = new Observer('ws://localhost:9090', {
                store: { commit: vi.fn() },
                passToStoreHandler: customHandler
            })

            observer.passToStore('SOCKET_ONOPEN', { type: 'open' })

            expect(customHandler).toHaveBeenCalled()
        })

        it('should ignore events not starting with SOCKET_', () => {
            const store = { commit: vi.fn() }
            const observer = new Observer('ws://localhost:9090', { store })

            observer.passToStore('OTHER_EVENT', { type: 'other' })

            expect(store.commit).not.toHaveBeenCalled()
        })

        it('should use mutations mapping', () => {
            const store = { commit: vi.fn() }
            const observer = new Observer('ws://localhost:9090', {
                store,
                mutations: { SOCKET_ONOPEN: 'CUSTOM_OPEN' }
            })

            observer.passToStore('SOCKET_ONOPEN', { type: 'open' })

            expect(store.commit).toHaveBeenCalledWith('CUSTOM_OPEN', { type: 'open' })
        })

        it('should parse JSON messages and dispatch actions', () => {
            const store = { commit: vi.fn(), dispatch: vi.fn() }
            const observer = new Observer('ws://localhost:9090', {
                store,
                format: 'json'
            })

            const event = { data: JSON.stringify({ action: 'newMessage', namespace: 'chat' }) }
            observer.passToStore('SOCKET_ONMESSAGE', event)

            expect(store.dispatch).toHaveBeenCalledWith(
                'chat/newMessage',
                expect.objectContaining({ action: 'newMessage' })
            )
        })

        it('should parse JSON messages and commit mutations', () => {
            const store = { commit: vi.fn() }
            const observer = new Observer('ws://localhost:9090', {
                store,
                format: 'json'
            })

            const event = { data: JSON.stringify({ mutation: 'SET_MESSAGE', namespace: 'chat' }) }
            observer.passToStore('SOCKET_ONMESSAGE', event)

            expect(store.commit).toHaveBeenCalledWith(
                'chat/SET_MESSAGE',
                expect.objectContaining({ mutation: 'SET_MESSAGE' })
            )
        })

        it('should warn when Pinia action not found', () => {
            const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => { })
            const piniaStore = { $patch: vi.fn() }

            const observer = new Observer('ws://localhost:9090', {
                store: piniaStore
            })

            observer.passToStore('SOCKET_ONOPEN', { type: 'open' })

            expect(warnSpy).toHaveBeenCalledWith(
                expect.stringContaining('Pinia action')
            )
            warnSpy.mockRestore()
        })
    })
})

