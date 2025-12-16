import { describe, it, expect, beforeEach } from 'vitest'
import Emitter from '../src/Emitter'

describe('Emitter', () => {
    beforeEach(() => {
        // Clear all listeners between tests
        Emitter.listeners.clear()
    })

    describe('addListener', () => {
        it('should add a listener for a label', () => {
            const callback = () => { }
            const vm = {}

            const result = Emitter.addListener('test', callback, vm)

            expect(result).toBe(true)
            expect(Emitter.listeners.has('test')).toBe(true)
            expect(Emitter.listeners.get('test')).toHaveLength(1)
        })

        it('should return false for non-function callbacks', () => {
            const result = Emitter.addListener('test', 'not a function', {})

            expect(result).toBe(false)
            expect(Emitter.listeners.has('test')).toBe(false)
        })

        it('should allow multiple listeners for the same label', () => {
            const callback1 = () => { }
            const callback2 = () => { }

            Emitter.addListener('test', callback1, {})
            Emitter.addListener('test', callback2, {})

            expect(Emitter.listeners.get('test')).toHaveLength(2)
        })
    })

    describe('removeListener', () => {
        it('should remove a specific listener', () => {
            const callback = () => { }
            const vm = {}

            Emitter.addListener('test', callback, vm)
            const result = Emitter.removeListener('test', callback, vm)

            expect(result).toBe(true)
            expect(Emitter.listeners.get('test')).toHaveLength(0)
        })

        it('should return false if listener not found', () => {
            const result = Emitter.removeListener('nonexistent', () => { }, {})

            expect(result).toBe(false)
        })

        it('should only remove matching callback and vm', () => {
            const callback1 = () => { }
            const callback2 = () => { }
            const vm1 = {}
            const vm2 = {}

            Emitter.addListener('test', callback1, vm1)
            Emitter.addListener('test', callback2, vm2)
            Emitter.removeListener('test', callback1, vm1)

            expect(Emitter.listeners.get('test')).toHaveLength(1)
        })
    })

    describe('emit', () => {
        it('should call all listeners for a label', () => {
            let called1 = false
            let called2 = false
            const vm = {}

            Emitter.addListener('test', () => { called1 = true }, vm)
            Emitter.addListener('test', () => { called2 = true }, vm)

            const result = Emitter.emit('test')

            expect(result).toBe(true)
            expect(called1).toBe(true)
            expect(called2).toBe(true)
        })

        it('should pass arguments to listeners', () => {
            let receivedArgs = []
            const vm = {}

            Emitter.addListener('test', (...args) => { receivedArgs = args }, vm)
            Emitter.emit('test', 'arg1', 'arg2', 123)

            expect(receivedArgs).toEqual(['arg1', 'arg2', 123])
        })

        it('should return false if no listeners exist', () => {
            const result = Emitter.emit('nonexistent')

            expect(result).toBe(false)
        })

        it('should call listener with correct this context', () => {
            let thisContext = null
            const vm = { name: 'testVm' }

            Emitter.addListener('test', function () { thisContext = this }, vm)
            Emitter.emit('test')

            expect(thisContext).toBe(vm)
        })
    })
})
