/**
 * performanceUtils.js
 *
 * Utility functions and React hooks for performance optimization.
 *
 * Functions : debounce, throttle, memoize
 * Hooks     : useDebounce, useVirtualList, useUnsavedChanges, useKeyboard
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'

// ── Pure utilities ────────────────────────────────────────────────────────────

/**
 * Returns a debounced version of fn that fires after `wait` ms of silence.
 */
export function debounce(fn, wait = 300) {
  let timer = null
  function debounced(...args) {
    clearTimeout(timer)
    timer = setTimeout(() => fn.apply(this, args), wait)
  }
  debounced.cancel = () => clearTimeout(timer)
  return debounced
}

/**
 * Returns a throttled version of fn that fires at most once per `wait` ms.
 */
export function throttle(fn, wait = 100) {
  let last = 0
  return function throttled(...args) {
    const now = Date.now()
    if (now - last >= wait) {
      last = now
      return fn.apply(this, args)
    }
  }
}

/**
 * Memoizes fn using a Map keyed by the first argument (by reference).
 * Useful for expensive pure computations called repeatedly with the same input.
 */
export function memoize(fn) {
  const cache = new Map()
  return function memoized(key, ...rest) {
    if (cache.has(key)) return cache.get(key)
    const result = fn(key, ...rest)
    cache.set(key, result)
    return result
  }
}

// ── React hooks ───────────────────────────────────────────────────────────────

/**
 * Returns a debounced copy of value that updates after `delay` ms of no changes.
 */
export function useDebounce(value, delay = 300) {
  const [debounced, setDebounced] = useState(value)

  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(id)
  }, [value, delay])

  return debounced
}

/**
 * Virtualises a long list so only `overscan` rows beyond the visible viewport
 * are rendered. Returns { containerProps, innerStyle, visibleItems }.
 *
 * @param {object[]} items        Full item array
 * @param {number}   itemHeight   Row height in px (fixed)
 * @param {object}   [opts]
 * @param {number}   [opts.overscan=5]        Extra rows above/below viewport
 * @param {number}   [opts.containerHeight]   Explicit container height (px);
 *                                            if omitted the hook measures it
 */
export function useVirtualList(items, itemHeight, { overscan = 5, containerHeight } = {}) {
  const containerRef  = useRef(null)
  const [scrollTop,  setScrollTop]  = useState(0)
  const [measured,   setMeasured]   = useState(containerHeight ?? 0)

  // Measure container height if not provided
  useEffect(() => {
    if (containerHeight) return
    const el = containerRef.current
    if (!el) return
    const ro = new ResizeObserver(([entry]) => {
      setMeasured(entry.contentRect.height)
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [containerHeight])

  const height = containerHeight ?? measured

  const onScroll = useCallback((e) => {
    setScrollTop(e.currentTarget.scrollTop)
  }, [])

  const { startIndex, endIndex, visibleItems } = useMemo(() => {
    if (!height || !itemHeight) {
      return { startIndex: 0, endIndex: items.length - 1, visibleItems: items.map((item, i) => ({ item, index: i })) }
    }
    const start = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan)
    const end   = Math.min(items.length - 1, Math.ceil((scrollTop + height) / itemHeight) + overscan)
    return {
      startIndex:   start,
      endIndex:     end,
      visibleItems: items.slice(start, end + 1).map((item, i) => ({ item, index: start + i })),
    }
  }, [items, itemHeight, height, scrollTop, overscan])

  const totalHeight  = items.length * itemHeight
  const offsetTop    = startIndex * itemHeight

  const containerProps = {
    ref:      containerRef,
    onScroll,
    style: { overflowY: 'auto', height: containerHeight ? `${containerHeight}px` : '100%' },
  }

  const innerStyle = {
    position: 'relative',
    height:   `${totalHeight}px`,
  }

  const itemStyle = (index) => ({
    position:  'absolute',
    top:       `${index * itemHeight}px`,
    left:      0,
    right:     0,
    height:    `${itemHeight}px`,
  })

  return { containerProps, innerStyle, itemStyle, visibleItems, offsetTop, startIndex, endIndex }
}

/**
 * Warns the user (beforeunload dialog) when `isDirty` is true.
 * Also returns a `confirmLeave()` function for in-app navigation guards.
 */
export function useUnsavedChanges(isDirty) {
  useEffect(() => {
    if (!isDirty) return
    const handler = (e) => {
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [isDirty])

  const confirmLeave = useCallback(() => {
    if (!isDirty) return true
    return window.confirm('You have unsaved changes. Leave anyway?')
  }, [isDirty])

  return { confirmLeave }
}

/**
 * Global keyboard shortcut handler.
 *
 * @param {Record<string, (e: KeyboardEvent) => void>} keyMap
 *   Key format: 'ctrl+s', 'escape', 'enter', 'ctrl+shift+z', etc.
 * @param {boolean} [enabled=true]
 */
export function useKeyboard(keyMap, enabled = true) {
  useEffect(() => {
    if (!enabled) return

    const handler = (e) => {
      const parts  = []
      if (e.ctrlKey  || e.metaKey)  parts.push('ctrl')
      if (e.shiftKey)                parts.push('shift')
      if (e.altKey)                  parts.push('alt')
      parts.push(e.key.toLowerCase())
      const combo = parts.join('+')

      const fn = keyMap[combo]
      if (fn) {
        e.preventDefault()
        fn(e)
      }
    }

    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [keyMap, enabled])
}
