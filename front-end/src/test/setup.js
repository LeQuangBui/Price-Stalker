import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

// Unmount React trees between tests so DOM from one test never leaks into the next
// (without this, a second render of the same component yields duplicate matches).
afterEach(() => {
  cleanup()
})
