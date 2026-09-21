import 'react'

/**
 * React 18 does not type the `inert` attribute. It passes an empty string
 * straight through to the DOM, which is exactly what `inert` needs.
 */
declare module 'react' {
  interface HTMLAttributes<T> {
    inert?: '' | undefined
  }
}
