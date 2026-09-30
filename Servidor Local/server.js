const http = require('http');

// Lee el puerto pasado por argumento de terminal o usa 8081 por defecto
const port = process.argv[2] || 8081;

const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(`<h1>Servidor BACKEND - Puerto ${port}</h1><p>Respondiendo desde entorno local Windows</p>`);
});

server.listen(port, () => {
    console.log(`Servidor iniciado en http://localhost:${port}`);
});