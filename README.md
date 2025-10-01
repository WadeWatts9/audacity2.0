# 🚀 AUDACITY - Sistema de Contadores

Sistema de contadores en tiempo real con bloqueo de operaciones para evitar conflictos de base de datos.

## ✨ Características

### 🔒 Sistema de Bloqueo Inteligente
- **Inicio de Operaciones**: Bloquea el contador para evitar conflictos
- **Fin de Operaciones**: Libera el contador para otros usuarios
- **Indicadores Visuales**: Muestra quién tiene bloqueado cada contador
- **Desbloqueo Automático**: Al desconectarse, se liberan todos los bloqueos

### 🔄 Sincronización en Tiempo Real
- **WebSockets**: Comunicación bidireccional instantánea
- **Actualización de Saldos**: Sincronización inmediata entre todos los usuarios
- **Notificaciones**: Sistema de notificaciones en vivo

### 🎨 Interfaz Moderna
- **Diseño Responsive**: Funciona en desktop y móvil
- **Animaciones Suaves**: Efectos visuales profesionales
- **Indicadores de Estado**: Verde (libre), Azul (tú), Rojo (otro usuario)

## 🚀 Instalación y Uso

### Opción 1: Script Automático (Recomendado)
1. **Doble clic** en `iniciar-audacity.bat`
2. El script instalará dependencias y ejecutará el servidor automáticamente
3. Abre tu navegador en `http://localhost:3000`

### Opción 2: Manual
1. **Instalar dependencias**:
   ```bash
   npm install
   ```

2. **Ejecutar servidor**:
   ```bash
   node server.js
   ```

3. **Abrir navegador**:
   - URL: `http://localhost:3000`

## 🔑 Credenciales de Acceso

### Administrador
- **Usuario**: `alan`
- **Contraseña**: `20243`

### Contadores
- **Gallo**: `contador_gallo` / `galloazul`
- **León**: `contador_leon` / `reyleon`
- **Perro**: `contador_perro` / `dalmata`
- **Mano**: `contador_mano` / `guante`
- **Estrella**: `contador_estrella` / `brillante`

## 🎯 Cómo Usar

### Para Contadores:
1. **Iniciar Operaciones**: Haz clic en "🚀 Inicio de Operaciones" en tu contador
2. **Realizar Operaciones**: Usa los botones de operaciones financieras
3. **Finalizar Operaciones**: Haz clic en "🏁 Fin de Operaciones" cuando termines
4. **Actualizar Saldos**: Usa "🔄 Actualizar Cuentas" para ver cambios de otros

### Para Administradores:
- Pueden usar todas las funcionalidades en todos los contadores
- Acceso al panel de administración
- Control total del sistema

## 🔧 Funcionalidades

### Operaciones Financieras
- **Sumar/Restar Monto**: Operaciones básicas
- **Transferir Porcentaje**: Transferir % a otro contador
- **Sumar/Restar % de Otro**: Operaciones con porcentajes
- **Depositar en Banco**: Transferir % al banco central
- **Duplicar/Reducir Saldo**: Operaciones especiales

### Panel de Administración
- **Dashboard**: Vista general del sistema
- **Reiniciar Saldos**: Volver a valores iniciales
- **Establecer Montos**: Configurar saldos específicos
- **Intercambiar Saldos**: Cambiar saldos entre contadores

## 🛠️ Tecnologías

- **Backend**: Node.js + Express + Socket.IO
- **Frontend**: HTML5 + CSS3 + JavaScript (Vanilla)
- **Comunicación**: WebSockets para tiempo real
- **Almacenamiento**: Memoria (se puede migrar a base de datos)

## 📁 Estructura del Proyecto

```
audacity_contador/
├── server.js              # Servidor principal
├── index.html             # Interfaz de usuario
├── script.js              # Lógica del cliente
├── styles.css             # Estilos
├── package.json           # Dependencias
├── iniciar-audacity.bat   # Script de inicio
└── README.md              # Este archivo
```

## 🔒 Seguridad

- **Autenticación**: Sistema de usuarios y contraseñas
- **Autorización**: Control de acceso por roles
- **Bloqueo de Operaciones**: Previene conflictos de concurrencia
- **Validación**: Verificación de permisos en cada operación

## 🌐 Acceso

- **URL Local**: http://localhost:3000
- **Puerto**: 3000 (configurable)
- **Sin Redirecciones**: Funciona completamente en local
- **Sin Dominio Externo**: No requiere conexión a internet

## 🐛 Solución de Problemas

### El servidor no inicia
1. Verifica que Node.js esté instalado: `node --version`
2. Instala dependencias: `npm install`
3. Verifica que el puerto 3000 esté libre

### No se ve la aplicación
1. Limpia la caché del navegador (Ctrl+F5)
2. Verifica que el servidor esté ejecutándose
3. Accede a http://localhost:3000/test para verificar

### Problemas de conexión
1. Verifica que no haya firewall bloqueando el puerto 3000
2. Reinicia el servidor
3. Verifica la consola del navegador para errores

## 📞 Soporte

Desarrollado por **Alan Canto**
- LinkedIn: [Alan Canto](https://www.linkedin.com/in/alancanto)
- © 2025-2026 Todos los derechos reservados

---

**Versión**: 2.0  
**Última actualización**: 2025  
**Estado**: ✅ Funcional y estable