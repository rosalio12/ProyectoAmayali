// Obtiene la configuración por defecto de Metro desde Expo
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Esta línea es la clave:
// Permite que Metro encuentre y procese archivos .cjs (usados por Firebase)
config.resolver.sourceExts.push('cjs');

// Añade esta línea para resolver un problema de compatibilidad con paquetes
config.resolver.unstable_enablePackageExports = false;

module.exports = config;