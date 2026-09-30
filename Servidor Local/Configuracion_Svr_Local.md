# Laboratorio: Balanceador de Carga Local con Nginx y Node.js

Este proyecto demuestra la implementación y configuración de un **Balanceador de Carga (Load Balancer)** local utilizando **Nginx** para distribuir el tráfico entrante de manera equitativa entre tres servidores backend independientes construidos en **Node.js**.

---

## 🛠️ Arquitectura y Tecnologías

* **Entorno de ejecución:** Windows 10/11
* **Servidores Backend:** Node.js (v24.21.0)
* **Balanceador de Carga:** Nginx (v1.30.5 para Windows)
* **Algoritmo de Balanceo:** Round Robin (distribución cíclica por defecto)

<pre>
                       [ Cliente / Navegador ]
                                 │
                        http://localhost (Puerto 80)
                                 │
                                 ▼
                        ┌─────────────────┐
                        │   NGINX (LB)    │
                        └────────┬────────┘
                                 │
         ┌───────────────────────┼───────────────────────┐
         │ (Round Robin)         │                       │
         ▼                       ▼                       ▼
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  Backend 8081   │     │  Backend 8082   │     │  Backend 8083   │
│   (Node.js)     │     │   (Node.js)     │     │   (Node.js)     │
└─────────────────┘     └─────────────────┘     └─────────────────┘
</pre>

---

## 🚀 Estructura del Código Backend (server.js)

El archivo `server.js` recibe el puerto como argumento dinámico para iniciar cada instancia en un puerto distinto:

```javascript
const http = require('http');

// Lee el puerto desde los argumentos de la terminal o usa 8081 por defecto
const port = process.argv[2] || 8081;

const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(`<h1>Servidor BACKEND - Puerto ${port}</h1><p>Respondiendo desde entorno local Windows</p>`);
});

server.listen(port, () => {
    console.log(`Servidor iniciado en http://localhost:${port}`);
});

```

## ⚙️ Configuración de Nginx (nginx.conf)

Dentro de conf/nginx.conf, se define el bloque upstream con las tres instancias locales y el bloque server escuchando en el puerto HTTP estándar (80):

```
worker_processes  1;

events {
    worker_connections  1024;
}

http {
    include       mime.types;
    default_type  application/octet-stream;
    sendfile        on;
    keepalive_timeout  65;

    # Grupo de servidores backend
    upstream backend_pool {
        server 127.0.0.1:8081;
        server 127.0.0.1:8082;
        server 127.0.0.1:8083;
    }

    # Servidor Proxy / Balanceador
    server {
        listen       80;
        server_name  localhost;

        location / {
            proxy_pass http://backend_pool;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        }
    }
}
```

## 📋 Pasos para Ejecutar el Proyecto
1. Iniciar los 3 servidores Node.js
Abre tres terminales independientes en el directorio del proyecto y ejecuta:

* **Terminal 1:** node server.js 8081
* **Terminal 2:** node server.js 8082
* **Terminal 3:** node server.js 8083

2. Iniciar el servicio Nginx
Ubicándote dentro del directorio de Nginx en Windows:

```
start nginx.exe
```

3. Verificación del Balanceo de Carga
Abre un navegador web e ingresa a http://localhost.

Actualiza la página (F5) repetidamente.

Se observará cómo la respuesta rota cíclicamente entre:

* **Servidor BACKEND** - Puerto 8081
* **Servidor BACKEND** - Puerto 8082
* **Servidor BACKEND** - Puerto 8083

## 🛑 Comandos Útiles de Nginx

| Acción | Comando (desde la carpeta de Nginx) |
|----------|---------|
| Recargar configuración | nginx -s reload |
| Detener de forma segura | nginx -s quit |
| Detener de forma inmediata | nginx -s stop |


