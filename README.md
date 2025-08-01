# Middleware Ollama API (Bun)

Este proyecto es un middleware HTTP para proteger y exponer la API de Ollama de forma segura, usando autenticación por API key y CORS. Está construido con [Hono](https://hono.dev/) y corre sobre [Bun](https://bun.sh/).

## Características
- Proxy seguro para la API de Ollama
- Autenticación por API key (header `x-api-key` o `Authorization: Bearer ...`)
- Soporte CORS para peticiones desde frontends
- Configuración flexible mediante archivo `.env`

## Requisitos
- [Bun](https://bun.sh/) instalado
- Node.js solo si quieres usar dotenv fuera de Bun (opcional)

## Instalación
1. Clona este repositorio o copia los archivos a tu proyecto.
2. Instala las dependencias:

```bash
bun install
```

3. Crea un archivo `.env` en la raíz del proyecto con el siguiente contenido (ajusta los valores a tu entorno):

```env
OLLAMA_BASE_URL=http://localhost:11434
VALID_API_KEY=pon_tu_api_key_aqui
PORT=11435
```

## Uso

Para arrancar el middleware ejecuta:

```bash
bun run middleware-ollama.js
```

O si usas Bun v1.0+:

```bash
bun middleware-ollama.js
```

El servidor escuchará en el puerto definido en `.env` (por defecto 11435).

## Ejemplo de petición

```bash
curl -H "x-api-key: pon_tu_api_key_aqui" http://localhost:11435/api/tus-endpoints
```

## Notas
- El middleware reenvía todas las rutas y métodos a la API de Ollama definida en `OLLAMA_BASE_URL`.
- Si la API key es incorrecta o falta, responde 401 Unauthorized.
- Puedes usar este middleware como base para exponer Ollama de forma segura en producción.

---

Hecho con ❤️ usando Bun y Hono.
