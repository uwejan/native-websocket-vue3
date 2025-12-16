import { defineConfig } from 'vitest/config'

export default defineConfig({
    test: {
        environment: 'happy-dom',
        globals: true,
        include: ['src/**/*.test.js', 'test/**/*.test.js'],
        coverage: {
            provider: 'v8',
            reporter: ['text', 'json', 'html', 'lcov'],
            include: ['src/**/*.js'],
            exclude: ['src/**/*.test.js']
        }
    }
})
