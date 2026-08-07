import { describe, expect, it } from 'vitest'
import { cx } from './cx'

describe('cx', () => {
  it('joins strings and skips falsy values', () => {
    expect(cx('a', false, null, undefined, '', 'b')).toBe('a b')
  })

  it('applies truthy object keys and flattens arrays', () => {
    expect(cx('a', { b: true, c: false }, ['d', { e: 1 }])).toBe('a b d e')
  })

  it('returns an empty string when nothing is truthy', () => {
    expect(cx(false, null, { a: false })).toBe('')
  })
})
