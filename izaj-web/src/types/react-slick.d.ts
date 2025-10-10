// Minimal type declarations for react-slick used in this project
// This prevents TypeScript errors when @types/react-slick is not installed.

declare module 'react-slick' {
  import * as React from 'react';

  export type Settings = any;

  const Slider: React.ComponentType<any>;
  export default Slider;
}
