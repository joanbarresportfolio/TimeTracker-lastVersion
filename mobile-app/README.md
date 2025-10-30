# Aplicación Móvil - Employee Time Tracking

## 🚀 Construir APK para Producción

### Requisitos Previos
1. Cuenta de Expo (gratis): https://expo.dev/
2. EAS CLI instalado globalmente: `npm install -g eas-cli`

### Pasos para Construir el APK

#### 1. Instalar Dependencias
```bash
cd mobile-app
npm install
```

#### 2. Iniciar Sesión en Expo
```bash
eas login
```

#### 3. Configurar el Proyecto
```bash
eas build:configure
```

#### 4. Construir APK para Android
```bash
# Para build de desarrollo (testing)
eas build --platform android --profile preview

# Para build de producción
eas build --platform android --profile production
```

El proceso tardará unos minutos. Al finalizar, recibirás un link para descargar el APK.

### 🔧 Configuración del Backend

Antes de construir el APK, asegúrate de actualizar la URL del backend en:
**`src/services/api.ts`**

```typescript
// Cambiar esto por la URL de tu servidor en producción
const API_BASE_URL = 'https://tu-servidor.replit.app';
```

### 📱 Instalación del APK

1. Descarga el APK desde el link proporcionado por EAS
2. En tu dispositivo Android:
   - Ve a Configuración > Seguridad
   - Habilita "Instalar apps de fuentes desconocidas"
3. Abre el APK descargado e instálalo

### 🐛 Solución de Problemas

#### Error: "React version mismatch"
- Elimina `node_modules` y `package-lock.json`
- Ejecuta `npm install` nuevamente

#### Error al construir
- Verifica que tengas las credenciales correctas de Expo
- Revisa que `app.json` tenga los bundle identifiers correctos

#### La app no se conecta al servidor
- Verifica que la URL en `api.ts` sea correcta
- Asegúrate de que el servidor esté publicado y accesible

### 📚 Más Información

- [Documentación de EAS Build](https://docs.expo.dev/build/introduction/)
- [Guía de Deploy](https://docs.expo.dev/distribution/introduction/)

### 🔑 Dependencias Corregidas

Las siguientes dependencias han sido actualizadas a versiones compatibles:

- **React 18.3.1** (compatible con React Native 0.76.5)
- **React Native 0.76.5** (compatible con Expo SDK 54)
- **Expo SDK 54** (versión estable)
- **@react-native-async-storage** (añadido para almacenamiento)

### ⚙️ Archivos de Configuración Creados

- `babel.config.js` - Configuración de Babel para Expo
- `metro.config.js` - Configuración de Metro bundler
- `tsconfig.json` - TypeScript configurado correctamente
- `.gitignore` - Archivos a ignorar en git
