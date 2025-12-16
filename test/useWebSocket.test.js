import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ref, nextTick } from 'vue'

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

        // Auto-connect after a tick
        setTimeout(() => {
            this.readyState = MockWebSocket.OPEN
            if (this.onopen) this.onopen({ type: 'open' })
        }, 0)
    }

    send(data) {
        if (this.readyState !== MockWebSocket.OPEN) {
            throw new Error('WebSocket is not open')
        }
        return true
    }

    close() {
        this.readyState = MockWebSocket.CLOSED
        if (this.onclose) this.onclose({ type: 'close' })
    }
}

// Replace global WebSocket
vi.stubGlobal('WebSocket', MockWebSocket)

describe('useWebSocket', () => {
    let useWebSocket

    beforeEach(async () => {
        vi.useFakeTimers()
        // Dynamic import to get fresh module
        const module = await import('../src/useWebSocket')
        useWebSocket = module.useWebSocket
    })

    afterEach(() => {
        vi.useRealTimers()
    })

    describe('initialization', () => {
        it('should auto-connect by default', async () => {
            const { isConnected, status } = useWebSocket('ws://localhost:9090')

            expect(status.value).toBe('CONNECTING')

            await vi.runAllTimersAsync()

            expect(status.value).toBe('CONNECTED')
            expect(isConnected.value).toBe(true)
        })

        it('should not connect when autoConnect is false', async () => {
            const { isConnected, status } = useWebSocket('ws://localhost:9090', {
                autoConnect: false
            })

            await vi.runAllTimersAsync()

            expect(status.value).toBe('DISCONNECTED')
            expect(isConnected.value).toBe(false)
        })
    })

    describe('connection methods', () => {
        it('should connect manually', async () => {
            const { connect, isConnected, status } = useWebSocket('ws://localhost:9090', {
                autoConnect: false
            })

            expect(isConnected.value).toBe(false)

            connect()
            await vi.runAllTimersAsync()

            expect(isConnected.value).toBe(true)
            expect(status.value).toBe('CONNECTED')
        })

        it('should disconnect', async () => {
            const { disconnect, isConnected, status } = useWebSocket('ws://localhost:9090')

            await vi.runAllTimersAsync()
            expect(isConnected.value).toBe(true)

            disconnect()

            expect(isConnected.value).toBe(false)
            expect(status.value).toBe('DISCONNECTED')
        })
    })

    describe('send', () => {
        it('should send data when connected', async () => {
            const { send, ws } = useWebSocket('ws://localhost:9090')

            await vi.runAllTimersAsync()

            const result = send('test message')

            expect(result).toBe(true)
        })

        it('should return false when not connected', async () => {
            const { send } = useWebSocket('ws://localhost:9090', {
                autoConnect: false
            })

            const result = send('test message')

            expect(result).toBe(false)
        })

        it('should stringify objects when json option is true', async () => {
            const { send, ws } = useWebSocket('ws://localhost:9090', { json: true })

            await vi.runAllTimersAsync()

            const spy = vi.spyOn(ws.value, 'send')
            send({ type: 'test', data: 123 })

            expect(spy).toHaveBeenCalledWith('{"type":"test","data":123}')
        })
    })

    describe('data handling', () => {
        it('should update data on message', async () => {
            const { data, ws } = useWebSocket('ws://localhost:9090')

            await vi.runAllTimersAsync()

            // Simulate message
            ws.value.onmessage({ data: 'test message' })

            expect(data.value).toBe('test message')
        })

        it('should parse JSON when json option is true', async () => {
            const { data, ws } = useWebSocket('ws://localhost:9090', { json: true })

            await vi.runAllTimersAsync()

            ws.value.onmessage({ data: '{"type":"test","value":42}' })

            expect(data.value).toEqual({ type: 'test', value: 42 })
        })

        it('should handle invalid JSON gracefully', async () => {
            const { data, ws } = useWebSocket('ws://localhost:9090', { json: true })

            await vi.runAllTimersAsync()

            ws.value.onmessage({ data: 'not json' })

            expect(data.value).toBe('not json')
        })
    })

    describe('error handling', () => {
        it('should set error on WebSocket error', async () => {
            const { error, ws, status } = useWebSocket('ws://localhost:9090')

            await vi.runAllTimersAsync()

            const errorEvent = { type: 'error', message: 'Connection failed' }
            ws.value.onerror(errorEvent)

            expect(error.value).toEqual(errorEvent)
            expect(status.value).toBe('ERROR')
        })
    })
})
