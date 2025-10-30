# 📱 GUÍA COMPLETA: Construir e Instalar APK de la App Móvil

## ✅ Problemas Corregidos

He solucionado los siguientes problemas críticos en las dependencias:

### 1. **React 19 → React 18.3.1**
   - **Problema**: React 19.1.1 NO es compatible con React Native
   - **Solución**: Downgrade a React 18.3.1 (versión estable compatible)

### 2. **React Native actualizado**
   - **Antes**: 0.81.4 (incompatible con Expo SDK 54)
   - **Ahora**: 0.76.5 (versión correcta para Expo SDK 54)

### 3. **AsyncStorage añadido**
   - Dependencia faltante necesaria para almacenamiento local

### 4. **Archivos de configuración creados**
   - `babel.config.js` - Configuración de Babel para Expo
   - `metro.config.js` - Configuración de Metro bundler
   - `tsconfig.json` - TypeScript configurado correctamente
   - `eas.json` - Configuración de builds de EAS (Expo Application Services)
   - `.gitignore` - Archivos a ignorar en git

## 🚀 Pasos para Construir el APK

### PASO 1: Configurar URL del Servidor (MUY IMPORTANTE ⚠️)

**Antes de construir el APK**, debes configurar la URL de tu servidor:

1. Ve a la carpeta del servidor web (el proyecto principal)
2. Haz clic en **"Publish"** (Publicar) en Replit
3. Copia la URL que aparece (ejemplo: `https://mi-proyecto.replit.app`)
4. Abre el archivo: **`mobile-app/src/services/api.ts`**
5. Busca la línea 97 y cambia:

```typescript
// ❌ ANTES (No funcionará)
return "https://YOUR-PROJECT-NAME.replit.app/api";

// ✅ DESPUÉS (Reemplaza con TU URL)
return "https://mi-proyecto.replit.app/api";
```

### PASO 2: Instalar Dependencias de la App Móvil

Abre la terminal en Replit y ejecuta:

```bash
cd mobile-app
npm install
```

**Espera** a que termine (puede tardar varios minutos).

### PASO 3: Instalar EAS CLI

```bash
npm install -g eas-cli
```

### PASO 4: Iniciar Sesión en Expo

1. Si no tienes cuenta de Expo, créala gratis en: https://expo.dev/
2. En la terminal:

```bash
eas login
```

3. Introduce tu email y contraseña de Expo

### PASO 5: Configurar Proyecto de Expo

```bash
eas build:configure
```

Este comando creará automáticamente el archivo `eas.json` (ya está creado, solo confirmará).

### PASO 6: Construir el APK

Para construir un APK de **prueba/desarrollo**:

```bash
eas build --platform android --profile preview
```

Para construir un APK de **producción**:

```bash
eas build --platform android --profile production
```

**NOTA**: El build se hace en los servidores de Expo, NO en tu computadora. Puede tardar **10-20 minutos**.

### PASO 7: Descargar el APK

1. Espera a que termine el build
2. EAS te dará un **link de descarga**
3. Copia ese link y ábrelo en tu navegador
4. Descarga el archivo `.apk`

## 📲 Instalar el APK en tu Teléfono

### Opción A: Descarga directa en el teléfono

1. Abre el link de descarga directamente en tu teléfono Android
2. Descarga el APK
3. Android te pedirá permiso para "Instalar apps de fuentes desconocidas"
4. **Acepta** el permiso
5. Instala la app

### Opción B: Transferencia desde PC

1. Descarga el APK en tu PC
2. Conecta tu teléfono con cable USB
3. Copia el archivo `.apk` a tu teléfono
4. En el teléfono:
   - Abre la app "Archivos" o "Mis archivos"
   - Busca el archivo `.apk`
   - Tócalo para instalarlo
   - Acepta el permiso de instalación

## 🔍 Verificar que Funciona

1. Abre la app en tu teléfono
2. Deberías ver la pantalla de Login
3. Prueba iniciar sesión con tus credenciales
4. Si aparece "No se pudo conectar al servidor":
   - Verifica que la URL en `api.ts` sea correcta
   - Asegúrate de que tu servidor esté **publicado** (no solo corriendo en desarrollo)

## ❌ Solución de Problemas Comunes

### "React version mismatch" o errores de build

```bash
cd mobile-app
rm -rf node_modules package-lock.json
npm install
```

### "Cannot connect to server"

1. Verifica la URL en `src/services/api.ts` línea 97
2. Asegúrate de que tu servidor esté publicado (no solo en desarrollo)
3. Prueba abrir la URL en tu navegador: `https://tu-proyecto.replit.app/api/health`
   - Debería responder con `{"status":"ok"}`

### El build falla en EAS

- Verifica que estés logueado: `eas whoami`
- Verifica que el proyecto esté configurado: `eas build:configure`
- Revisa los logs del error que muestra EAS

### La app se instala pero se cierra inmediatamente

Esto puede pasar si:
1. La URL del servidor no está configurada correctamente
2. El servidor no está publicado/accesible
3. Hay un error en el build

**Solución**: Construye con el perfil `preview` en lugar de `production` para tener mejor debugging.

## 📝 Notas Importantes

- ✅ **Todas las dependencias están ahora en versiones compatibles**
- ✅ **Los archivos de configuración están correctamente creados**
- ⚠️ **DEBES cambiar la URL del servidor antes de construir**
- ⚠️ **El servidor debe estar PUBLICADO, no solo corriendo en desarrollo**
- 💡 El build se hace en la nube (servidores de Expo), no en tu máquina
- 💡 Cada build puede tardar 10-20 minutos

## 🆘 Necesitas Ayuda?

Si algo no funciona:
1. Lee el mensaje de error completo
2. Busca en la [Documentación de Expo](https://docs.expo.dev/)
3. Revisa que hayas seguido TODOS los pasos en orden
