# ☁️ Servidor Node.js para Despliegue en la Nube (AWS EC2 & ALB)

Este módulo contiene la implementación del servidor de aplicaciones desarrollado en **Node.js y Express**, diseñado para ser desplegado en múltiples instancias **AWS EC2** distribuidas en diferentes Zonas de Disponibilidad (AZ) y gestionadas por un **Application Load Balancer (ALB)**.

---

## 🚀 Funcionalidades Principales

1. **Identificación Dinámica de Instancia:**  
   Retorna el nombre o hostname del servidor que procesa la petición HTTP, permitiendo verificar visualmente el comportamiento del balanceador de carga (`web-server-1` vs `web-server-2`).

2. **Endpoint de Health Check (`/health`):**  
   Proporciona la ruta `/health` con estado `200 OK`, permitiendo al **Target Group** de AWS monitorear constantemente la salud del contenedor o instancia. Si un servidor falla, el ALB deja de enviarle tráfico automáticamente.

3. **Gestión de Procesos con PM2:**  
   Configurado para ser administrado por **PM2**, garantizando la ejecución del servicio en segundo plano, reinicio automático en caso de errores inesperados y persistencia tras el reinicio de la maquina virtual EC2.

4. **Respuestas en Formato JSON:**  
   Entrega metadatos clave sobre la infraestructura en cada solicitud (mensaje, hostname, tipo de instancia y marca de tiempo).

---

## 📂 Estructura de la Carpeta

```text
Servidor en la nube/
├── node_modules/       # Dependencias instaladas
├── package.json        # Configuración del proyecto y scripts
├── package-lock.json   # Árbol de dependencias exacto
└── server.js           # Archivo principal de la aplicación Express
```

## 🛠️ Requisitos e Instalación Local / EC2

Prerrequisitos

1. **Node.js v20.x o superior**  

2. **npm (Node Package Manager)**  

3. **PM2 (instalado globalmente en el servidor)**  

### Pasos de Despliegue

1. **Acceder al directorio:**  
```text
cd "Servidor en la nube"
```

2. **Instalar dependencias:**  

```Bash
npm install
```

3. **Ejecutar en desarrollo:**  

```Bash
node server.js
```

4. **Ejecutar en producción con PM2 (en AWS EC2):**  
```Bash
sudo npm install -g pm2
sudo pm2 start server.js --name "web-server"
sudo pm2 save
```
## 📡 Endpoints del Servidor

1. Endpoint Principal
**Ruta: GET /**  
**Respuesta de Ejemplo:**  

```JSON
{
  "mensaje": "Respuesta desde la nube de AWS",
  "servidor": "ip-172-31-12-219",
  "instancia": "EC2 t2.micro",
  "timestamp": "2026-09-30T23:45:00.000Z"
}
```

2. Endpoint de Verificación de Salud (Health Check)
**Ruta: GET /health**  
**Respuesta: OK (Código HTTP 200)**  

## 👨‍💻 Autor

Desarrollado y mantenido por CalepNeyra.

### Pasos para guardar y subir el README a GitHub:

Una vez guardado el archivo en VS Code, ejecuta estos tres comandos en tu terminal:

```powershell
git add .
git commit -m "Doc: Agregar README explicativo para el servidor en la nube"
git push origin main
```