const express = require('express');
const os = require('os');
const app = express();
const PORT = process.env.PORT || 80;

// Identificador del servidor (se puede pasar por variable de entorno SERVER_NAME)
const SERVER_NAME = process.env.SERVER_NAME || os.hostname();

// Endpoint principal
app.get('/', (req, res) => {
  res.json({
    mensaje: "Respuesta desde la nube de AWS",
    servidor: SERVER_NAME,
    instancia: "EC2 t2.micro",
    timestamp: new Date().toISOString()
  });
});

// Endpoint de Health Check para el Application Load Balancer
app.get('/health', (req, res) => {
  res.status(200).send('OK');

  
});

app.listen(PORT, () => {
  console.log(`Servidor ${SERVER_NAME} escuchando en el puerto ${PORT}`);


});

// . 

// Analizando obejtivo