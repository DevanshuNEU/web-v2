/**
 * signature components — barrel for the React wrappers around the generative
 * signature library. Each is 'use client', strictly monochrome, and gates on
 * useIsMono() so the generative look only appears in the mono brand register.
 */

export { default as Halftone, type HalftoneProps } from './Halftone';
export { default as Dither, type DitherProps } from './Dither';
export { default as AsciiField, type AsciiFieldProps } from './AsciiField';
export { default as Plotter, type PlotterProps } from './Plotter';
