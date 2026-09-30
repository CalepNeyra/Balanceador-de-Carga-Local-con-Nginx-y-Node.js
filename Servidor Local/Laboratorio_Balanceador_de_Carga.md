# Laboratorio: Configuración de Balanceadores de Carga

**Curso:** CloudDiseño y Desarrollo de Software

---

## 1. Objetivos de aprendizaje

Al finalizar este laboratorio, el estudiante será capaz de:

1. Explicar el funcionamiento y los algoritmos de un balanceador de carga (Round Robin, Least Connections, IP Hash).
2. Instalar y configurar un balanceador de carga local utilizando **Nginx**.
3. Desplegar y configurar un **Application Load Balancer (ALB)** en AWS.
4. Implementar verificaciones de salud (*health checks*) sobre los servidores backend.
5. Comparar ventajas y limitaciones del balanceo on-premise frente al balanceo en la nube.

---

## 2. Marco conceptual

Un **balanceador de carga** distribuye el tráfico entrante entre varios servidores backend con el fin de:

- Mejorar la **disponibilidad** del servicio.
- Aumentar la **escalabilidad horizontal**.
- Reducir el tiempo de respuesta.
- Permitir **mantenimientos sin interrumpir** el servicio.

**Algoritmos comunes:**

| Algoritmo | Descripción |
|-----------|-------------|
| Round Robin | Distribuye las peticiones de forma cíclica. |
| Least Connections | Envía la petición al servidor con menos conexiones activas. |
| IP Hash | Asigna un cliente siempre al mismo servidor según su IP. |
| Weighted Round Robin | Round Robin con pesos por capacidad del servidor. |

---

## 3. Requisitos previos

- Una computadora con **Linux (Ubuntu 22.04+)** o WSL2 / máquina virtual.
- Cuenta activa en **AWS** (puede usarse la *Free Tier*).
- Conocimientos básicos de línea de comandos y redes.
- Editor de texto (VS Code, nano, vim).
- Navegador web moderno.
- Cliente SSH (PuTTY, OpenSSH).

---

# PARTE A — Balanceador de carga LOCAL con Nginx

En esta parte simularemos tres servidores web backend en una misma máquina (puertos 8081, 8082, 8083) y configuraremos Nginx como balanceador en el puerto 80.

## Paso 1: Actualizar el sistema e instalar Nginx

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install nginx python3 -y
sudo systemctl enable nginx
sudo systemctl start nginx
```

Verifica que Nginx funcione abriendo `http://localhost` en el navegador.

## Paso 2: Crear tres servidores backend

Crearemos tres carpetas, cada una representando un servidor distinto, usando el servidor HTTP de Python.

```bash
mkdir -p ~/lab-lb/server1 ~/lab-lb/server2 ~/lab-lb/server3

echo "<h1>Servidor BACKEND 1 - Puerto 8081</h1>" > ~/lab-lb/server1/index.html
echo "<h1>Servidor BACKEND 2 - Puerto 8082</h1>" > ~/lab-lb/server2/index.html
echo "<h1>Servidor BACKEND 3 - Puerto 8083</h1>" > ~/lab-lb/server3/index.html
```

Levanta cada servidor en una terminal separada (o en segundo plano):

```bash
cd ~/lab-lb/server1 && python3 -m http.server 8081 &
cd ~/lab-lb/server2 && python3 -m http.server 8082 &
cd ~/lab-lb/server3 && python3 -m http.server 8083 &
```

Comprueba que cada uno responda:

```bash
curl http://localhost:8081
curl http://localhost:8082
curl http://localhost:8083
```

## Paso 3: Configurar Nginx como balanceador

Crea un nuevo archivo de configuración:

```bash
sudo nano /etc/nginx/conf.d/balanceador.conf
```

Contenido del archivo:

```nginx
upstream backend_pool {
    # Algoritmo por defecto: Round Robin
    server 127.0.0.1:8081;
    server 127.0.0.1:8082;
    server 127.0.0.1:8083;
}

server {
    listen 80 default_server;
    server_name _;

    location / {
        proxy_pass http://backend_pool;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

> **Nota:** Si la configuración por defecto de `/etc/nginx/sites-enabled/default` interfiere, deshabilítela:
> `sudo rm /etc/nginx/sites-enabled/default`

Validar la sintaxis y recargar:

```bash
sudo nginx -t
sudo systemctl reload nginx
```

## Paso 4: Probar el balanceador local

Ejecuta varias veces:

```bash
for i in {1..9}; do curl -s http://localhost; done
```

Deberías ver alternarse los mensajes de los tres backends, demostrando el algoritmo Round Robin en funcionamiento.

## Paso 5: Probar otros algoritmos

Modifica el bloque `upstream` para probar distintos algoritmos:

**Least Connections:**
```nginx
upstream backend_pool {
    least_conn;
    server 127.0.0.1:8081;
    server 127.0.0.1:8082;
    server 127.0.0.1:8083;
}
```

**IP Hash (sesiones pegajosas):**
```nginx
upstream backend_pool {
    ip_hash;
    server 127.0.0.1:8081;
    server 127.0.0.1:8082;
    server 127.0.0.1:8083;
}
```

**Pesos diferenciados:**
```nginx
upstream backend_pool {
    server 127.0.0.1:8081 weight=3;
    server 127.0.0.1:8082 weight=1;
    server 127.0.0.1:8083 weight=1;
}
```

Después de cada cambio, recarga Nginx con `sudo systemctl reload nginx`.

---

# PARTE B — Balanceador de carga en AWS (Application Load Balancer)

## Paso 1: Crear una VPC y subredes

1. Ingresa a la **Consola de AWS → VPC → Crear VPC**.
2. Selecciona **VPC y más** y configura:
   - Nombre: `vpc-lab-lb`
   - CIDR IPv4: `10.0.0.0/16`
   - Zonas de disponibilidad: **2**
   - Subredes públicas: **2**
   - Subredes privadas: **0** (para simplificar)
3. Crea la VPC. Esto generará automáticamente un *Internet Gateway* y la tabla de rutas.

## Paso 2: Crear un Security Group

**EC2 → Security Groups → Create security group**

- Nombre: `sg-web-lab`
- VPC: `vpc-lab-lb`
- Reglas de entrada:
  - HTTP (80) desde `0.0.0.0/0`
  - SSH (22) desde tu IP (`Mi IP`)

## Paso 3: Lanzar dos instancias EC2

Lanza **2 instancias** con la siguiente configuración:

| Parámetro | Valor |
|-----------|-------|
| AMI | Amazon Linux 2023 |
| Tipo | `t2.micro` (Free Tier) |
| Par de claves | Crea o usa uno existente |
| VPC | `vpc-lab-lb` |
| Subred | Una en `us-east-1a`, otra en `us-east-1b` |
| Auto-asignar IP pública | Habilitar |
| Security Group | `sg-web-lab` |
| User Data | Ver script abajo |

**User Data (script de arranque):**

```bash
#!/bin/bash
dnf update -y
dnf install -y httpd
systemctl enable --now httpd
INSTANCE_ID=$(curl -s http://169.254.169.254/latest/meta-data/instance-id)
AZ=$(curl -s http://169.254.169.254/latest/meta-data/placement/availability-zone)
cat > /var/www/html/index.html <<EOF
<html><body style="font-family:Arial;text-align:center;">
<h1>Servidor Web en AWS</h1>
<p><b>Instance ID:</b> $INSTANCE_ID</p>
<p><b>Availability Zone:</b> $AZ</p>
</body></html>
EOF
```

Etiqueta las instancias como `web-server-1` y `web-server-2`.

Verifica accediendo por separado a la IP pública de cada instancia: ambas deben mostrar páginas distintas.

## Paso 4: Crear el Target Group

**EC2 → Target Groups → Create target group**

- Tipo de destino: **Instances**
- Nombre: `tg-lab-web`
- Protocolo: HTTP, Puerto: 80
- VPC: `vpc-lab-lb`
- Health check path: `/`
- Avanzado: umbrales saludables/no saludables = 2/2, intervalo = 30s
- **Registrar destinos:** selecciona las dos EC2 y agrégalas como pendientes en el puerto 80.

## Paso 5: Crear el Application Load Balancer

**EC2 → Load Balancers → Create Load Balancer → Application Load Balancer**

- Nombre: `alb-lab-web`
- Esquema: **Internet-facing**
- Tipo de IP: IPv4
- VPC: `vpc-lab-lb`
- Mappings: las **dos** zonas de disponibilidad con sus subredes públicas
- Security Group: `sg-web-lab`
- Listener: HTTP:80 → forward a `tg-lab-web`
- Crear el balanceador.

Espera 2-3 minutos hasta que el estado pase a **Active**.

## Paso 6: Probar el ALB

Copia el **DNS name** del ALB (algo como `alb-lab-web-1234567890.us-east-1.elb.amazonaws.com`) y pégalo en el navegador. Refresca varias veces: deberías ver alternarse las dos instancias.

Desde la terminal:

```bash
for i in {1..10}; do
  curl -s http://<DNS-DEL-ALB> | grep "Instance ID"
done
```

## Paso 7: Probar tolerancia a fallos

1. En la consola EC2, **detén** la instancia `web-server-1`.
2. Espera ~1 minuto y observa el Target Group: la instancia pasará a estado **unhealthy**.
3. Refresca el ALB: todas las peticiones irán a `web-server-2`.
4. Vuelve a iniciar `web-server-1` y verifica que regrese a estado **healthy**.

---

# 4. EJERCICIOS

## Ejercicio 1 — Round Robin con pesos diferenciados (local)

**Objetivo:** Verificar empíricamente la proporción de tráfico en un balanceo ponderado.

**Instrucciones:**
1. Configura el upstream de Nginx con los siguientes pesos:
   - `server 127.0.0.1:8081 weight=5;`
   - `server 127.0.0.1:8082 weight=3;`
   - `server 127.0.0.1:8083 weight=2;`
2. Genera 100 peticiones con un script bash:
   ```bash
   for i in {1..100}; do curl -s http://localhost; done | sort | uniq -c
   ```
3. Compara los conteos obtenidos con la proporción esperada (50/30/20).

**Entregable:** Captura del comando, conteo obtenido y un párrafo explicando si la distribución coincide con la teoría.

---

## Ejercicio 2 — Health checks pasivos en Nginx

**Objetivo:** Implementar detección y recuperación automática de servidores caídos.

**Instrucciones:**
1. Modifica el upstream agregando los parámetros `max_fails` y `fail_timeout`:
   ```nginx
   upstream backend_pool {
       server 127.0.0.1:8081 max_fails=2 fail_timeout=15s;
       server 127.0.0.1:8082 max_fails=2 fail_timeout=15s;
       server 127.0.0.1:8083 max_fails=2 fail_timeout=15s;
   }
   ```
2. **Detén** el servidor del puerto 8082 (`kill` del proceso Python).
3. Realiza 20 peticiones y registra qué servidor responde.
4. Vuelve a levantar el servidor 8082 y observa cómo Nginx lo reincorpora.

**Entregable:** Bitácora de pruebas (antes, durante y después de la caída) y conclusión sobre el comportamiento.

---

## Ejercicio 3 — Pruebas de carga comparativas

**Objetivo:** Medir el rendimiento con y sin balanceador.

**Instrucciones:**
1. Instala Apache Benchmark: `sudo apt install apache2-utils -y`
2. Ejecuta una prueba directa contra **un solo backend**:
   ```bash
   ab -n 1000 -c 50 http://localhost:8081/
   ```
3. Ejecuta la misma prueba **a través de Nginx** (puerto 80):
   ```bash
   ab -n 1000 -c 50 http://localhost/
   ```
4. Compara: peticiones por segundo, tiempo promedio, tasa de fallos.

**Entregable:** Tabla comparativa con las métricas y un análisis de 8-10 líneas justificando los resultados.

---

## Ejercicio 4 — ALB con ruteo basado en path (AWS)

**Objetivo:** Configurar reglas de listener para enrutar por URL.

**Instrucciones:**
1. Crea un **segundo Target Group** llamado `tg-lab-api` con una nueva instancia EC2 cuyo User Data muestre el texto "API SERVER".
2. En el listener HTTP:80 del ALB, **agrega una regla** con prioridad 10:
   - Condición: `Path is /api/*`
   - Acción: forward a `tg-lab-api`
3. La regla por defecto debe seguir enviando a `tg-lab-web`.
4. Prueba ambos flujos:
   ```bash
   curl http://<DNS-ALB>/
   curl http://<DNS-ALB>/api/test
   ```

**Entregable:** Capturas de la consola (regla del listener y prueba con `curl`) y un breve diagrama del enrutamiento.

---

## Ejercicio 5 — Auto Scaling Group integrado al ALB (AWS)

**Objetivo:** Lograr escalado horizontal automático.

**Instrucciones:**
1. Crea una **Launch Template** (`lt-lab-web`) con la misma AMI, tipo y User Data utilizados en el laboratorio.
2. Crea un **Auto Scaling Group**:
   - Capacidad mínima: 2, deseada: 2, máxima: 4.
   - Asocia las dos subredes públicas.
   - Adjunta el Target Group `tg-lab-web`.
   - Política de escalado: **Target tracking** sobre CPU al 50%.
3. Genera carga sintética desde tu máquina local:
   ```bash
   ab -n 100000 -c 200 http://<DNS-ALB>/
   ```
4. Observa en la consola cómo el ASG lanza nuevas instancias y cómo el ALB las incorpora al pool saludable.
5. Detén la prueba y verifica que el ASG reduzca instancias tras unos minutos.

**Entregable:** Reporte con capturas del ASG escalando, métricas de CloudWatch (CPU y RequestCount) y una reflexión sobre el costo-beneficio de esta arquitectura.

---

# 5. Limpieza de recursos AWS (¡muy importante!)

Para evitar cobros, **elimina todo en este orden**:

1. Auto Scaling Group → eliminar.
2. Application Load Balancer → eliminar.
3. Target Groups → eliminar.
4. Instancias EC2 → terminar.
5. Launch Template → eliminar.
6. VPC `vpc-lab-lb` → eliminar (arrastra IGW, subredes, tablas de ruta).

---

# 6. Rúbrica de evaluación

| Criterio | Puntaje |
|----------|---------|
| Parte A: Balanceador local funcional con tres backends | 20 pts |
| Parte B: ALB operativo con dos EC2 sanas | 20 pts |
| Ejercicio 1 (pesos) | 10 pts |
| Ejercicio 2 (health checks) | 10 pts |
| Ejercicio 3 (pruebas de carga) | 10 pts |
| Ejercicio 4 (ruteo por path) | 15 pts |
| Ejercicio 5 (Auto Scaling) | 15 pts |
| **Total** | **100 pts** |

---

# 7. Preguntas de cierre (para discusión en clase)

1. ¿Qué algoritmo de balanceo elegiría para una aplicación con sesiones de usuario en memoria? ¿Por qué?
2. ¿Cuál es la diferencia entre un Application Load Balancer y un Network Load Balancer en AWS?
3. ¿Qué sucede si todos los targets están unhealthy? ¿Cómo lo detectaría?
4. ¿Por qué el balanceador de la nube se considera una solución más resiliente que el local?
5. ¿Qué riesgos de seguridad introduce un ALB expuesto a Internet y cómo se mitigan?
