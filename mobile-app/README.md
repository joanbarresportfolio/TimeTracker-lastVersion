# 📱 Employee Tracking Mobile App

Una aplicación móvil completa para el control de horarios de empleados construida con React Native y Expo.

## ✨ Funcionalidades Principales

### 🔐 Autenticación
- Login seguro con JWT
- Almacenamiento seguro de credenciales
- Sesión persistente

### ⏰ Control de Horarios
- Fichar entrada y salida
- Visualización de horas trabajadas en tiempo real
- Control de horarios por día

### ☕ Sistema de Pausas
- Pausas de café (coffee break)
- Pausas de almuerzo (lunch break)
- Descuento automático del tiempo trabajado
- Gestión de pausas activas

### 👤 Perfil de Usuario
- Información del empleado
- Número de empleado
- Rol (empleado/administrador)

## 🚀 Instalación y Configuración

### Prerrequisitos
- Node.js 18+ instalado
- Expo CLI instalado globalmente: `npm install -g @expo/cli`
- Un dispositivo móvil con la app Expo Go o un emulador

### Pasos de Instalación

1. **Navegar al directorio de la app móvil:**
   ```bash
   cd mobile-app
   ```

2. **Instalar dependencias:**
   ```bash
   npm install
   ```

3. **Configurar la URL del backend:**
   - Edita `app.json` en la sección `extra.apiUrl`
   - Para desarrollo local: `"http://localhost:5000"`
   - Para Replit: `"https://[tu-repl-url].replit.app"`

4. **Iniciar la aplicación:**
   ```bash
   npm start
   ```
   Esto abrirá Expo DevTools en tu navegador.

5. **Ejecutar en dispositivo:**
   - **En móvil:** Escanea el código QR con la app Expo Go
   - **En emulador:** Presiona 'a' para Android o 'i' para iOS

## 🔧 Configuración del Backend

Asegúrate de que el backend esté ejecutándose:

```bash
# En el directorio raíz del proyecto
npm run dev
```

El backend debe estar disponible en `http://localhost:5000` con los siguientes endpoints configurados:
- `POST /api/auth/mobile/login` - Login móvil
- `GET /api/time-entries/my` - Mis entradas de tiempo
- `POST /api/time-entries` - Fichar entrada
- `PUT /api/time-entries/:id` - Fichar salida
- `POST /api/breaks/start` - Iniciar pausa
- `PUT /api/breaks/:id/end` - Finalizar pausa

## 👥 Credenciales de Prueba

Para probar la aplicación, usa estas credenciales:

| Usuario | Email | Contraseña | Rol |
|---------|-------|------------|-----|
| Ana García | ana.garcia@company.com | password123 | Empleado |
| Admin | admin@company.com | admin123 | Administrador |

## 🎯 Uso de la Aplicación

### 1. Inicio de Sesión
- Abre la app
- Ingresa email y contraseña
- Presiona "Iniciar Sesión"

### 2. Fichar Entrada
- En la pantalla principal, presiona "Fichar Entrada"
- Se registrará la hora actual

### 3. Tomar Pausas
- Con entrada fichada, puedes iniciar pausas:
  - "Pausa Café" - para descansos cortos
  - "Pausa Almuerzo" - para el almuerzo
- Presiona "Finalizar Pausa" cuando termines

### 4. Fichar Salida
- Presiona "Fichar Salida" al terminar el día
- Se calculará automáticamente el tiempo trabajado (descontando pausas)

## 🛠️ Estructura del Proyecto

```
mobile-app/
├── src/
│   ├── screens/          # Pantallas de la app
│   │   ├── LoginScreen.tsx
│   │   └── HomeScreen.tsx
│   ├── services/         # Servicios de API
│   │   └── api.ts
│   ├── types/           # Tipos TypeScript
│   │   └── auth.ts
│   └── components/      # Componentes reutilizables
├── assets/              # Imágenes e iconos
├── App.tsx             # Componente principal
├── app.json            # Configuración de Expo
└── package.json        # Dependencias
```

## 🔒 Seguridad

- Tokens JWT almacenados de forma segura con Expo SecureStore
- Comunicación HTTPS con el backend
- Validación de datos en cliente y servidor
- Gestión automática de expiración de sesiones

## 🐛 Solución de Problemas

### Error de conexión al backend
- Verifica que el backend esté ejecutándose
- Comprueba la URL en `app.json`
- En desarrollo, usa la IP local en lugar de `localhost`

### Problemas de autenticación
- Verifica las credenciales de prueba
- Limpia el caché de Expo: `expo r -c`
- Borra y reinstala la app en el dispositivo

### Errores de dependencias
```bash
# Limpiar caché e instalar de nuevo
rm -rf node_modules package-lock.json
npm install
```

## 📱 Características de la UI

- **Diseño responsivo** - Adaptado para móviles
- **Tema consistente** - Colores corporativos
- **Feedback visual** - Indicadores de carga y estados
- **Navegación intuitiva** - Flujo simple y claro
- **Accesibilidad** - Textos legibles y botones grandes

## 🔄 Sincronización de Datos

La app se sincroniza automáticamente con el backend:
- Al iniciar sesión
- Al realizar acciones (fichar, pausas)
- Los datos se muestran en tiempo real
- Manejo de errores de conexión

## 📈 Próximas Mejoras

- [ ] Pantalla de horarios semanales
- [ ] Reporte de incidencias
- [ ] Notificaciones push
- [ ] Modo offline
- [ ] Geolocalización para fichajes
- [ ] Biometría para autenticación

---

**¡La aplicación móvil está lista para usar! 🎉**

Para cualquier problema o mejora, contacta al equipo de desarrollo.