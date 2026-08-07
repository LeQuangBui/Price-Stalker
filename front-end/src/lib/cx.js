// Tiny classnames helper (zero-dep). Joins strings, skips falsy, applies object
// keys whose values are truthy, and flattens arrays. Used by all design-system
// components so we don't pull in `clsx`.
export function cx(...args) {
  const out = []
  for (const arg of args) {
    if (!arg) continue
    if (typeof arg === 'string' || typeof arg === 'number') {
      out.push(String(arg))
    } else if (Array.isArray(arg)) {
      const inner = cx(...arg)
      if (inner) out.push(inner)
    } else if (typeof arg === 'object') {
      for (const key in arg) {
        if (arg[key]) out.push(key)
      }
    }
  }
  return out.join(' ')
}
