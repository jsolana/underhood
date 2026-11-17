/** Shared animation presets. Timing lives here, never in simulation logic. */
export const spring = { type: 'spring', stiffness: 380, damping: 32, mass: 0.8 } as const
export const quick = { duration: 0.18, ease: [0.2, 0, 0, 1] } as const
export const slow = { duration: 0.45, ease: [0.2, 0, 0, 1] } as const
