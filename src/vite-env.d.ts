/// <reference types="vite/client" />

// Fontsource packages resolve to a stylesheet with no bundled types; declaring
// them keeps `noUncheckedSideEffectImports` satisfied without loosening it.
declare module '@fontsource-variable/*'
