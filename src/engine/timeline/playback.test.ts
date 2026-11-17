import { describe, expect, it } from 'vitest'
import { initialPlayback, playbackReducer as r, type PlaybackState } from './playback'

const loaded = (n = 5): PlaybackState => r(initialPlayback(), { type: 'load', total: n })

describe('playback reducer', () => {
  it('navigates forward/backward and clamps', () => {
    let s = loaded()
    s = r(s, { type: 'prev' })
    expect(s.index).toBe(0)
    for (let i = 0; i < 10; i++) s = r(s, { type: 'next' })
    expect(s.index).toBe(4)
  })
  it('goto is arbitrary and restart returns to 0', () => {
    let s = r(loaded(), { type: 'goto', index: 3 })
    expect(s.index).toBe(3)
    s = r(s, { type: 'restart' })
    expect(s.index).toBe(0)
  })
  it('ticks advance only while playing and stop at the end', () => {
    let s = loaded(3)
    expect(r(s, { type: 'tick' }).index).toBe(0)
    s = r(s, { type: 'play' })
    s = r(s, { type: 'tick' })
    expect(s.index).toBe(1)
    s = r(s, { type: 'tick' })
    expect(s.index).toBe(2)
    expect(s.playing).toBe(false)
  })
  it('pauses on breakpoints', () => {
    let s = r(loaded(6), { type: 'toggleBreakpoint', index: 2 })
    s = r(s, { type: 'play' })
    s = r(s, { type: 'tick' })
    expect(s.playing).toBe(true)
    s = r(s, { type: 'tick' })
    expect(s.index).toBe(2)
    expect(s.playing).toBe(false)
  })
  it('play at the end restarts', () => {
    let s = r(loaded(3), { type: 'goto', index: 2 })
    s = r(s, { type: 'play' })
    expect(s.index).toBe(0)
    expect(s.playing).toBe(true)
  })
  it('manual navigation pauses', () => {
    let s = r(loaded(), { type: 'play' })
    s = r(s, { type: 'next' })
    expect(s.playing).toBe(false)
  })
  it('records history and keeps speed/breakpoints on reload', () => {
    let s = loaded(5)
    s = r(s, { type: 'setSpeed', speed: 2 })
    s = r(s, { type: 'toggleBreakpoint', index: 3 })
    s = r(s, { type: 'next' })
    expect(s.history).toEqual([0, 1])
    s = r(s, { type: 'load', total: 3 })
    expect(s.speed).toBe(2)
    expect(s.breakpoints.size).toBe(0)
    expect(s.index).toBe(0)
  })
})
