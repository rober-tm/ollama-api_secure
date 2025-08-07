
import { Hono } from 'hono'
import { cors } from 'hono/cors'

// Cargar variables de entorno desde .env si está disponible
if (typeof Bun !== 'undefined' && Bun.env) {
    // Bun ya carga .env automáticamente
} else {
    try {
        await import('dotenv/config')
    } catch { }
}

const app = new Hono()

// Configuración desde variables de entorno
const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || 'http://localhost:11434'
const VALID_API_KEY = process.env.VALID_API_KEY || ''
const PORT = process.env.PORT || 3000

// Middleware CORS
app.use('*', cors())

// Middleware de autenticación
const authMiddleware = async (c, next) => {
    const apiKey = c.req.header('x-api-key') || c.req.header('Authorization')?.replace('Bearer ', '')
    if (!apiKey || apiKey !== VALID_API_KEY) {
        return c.json({ error: 'Unauthorized: Invalid API key' }, 401)
    }

    await next()
}

// Aplicar middleware de auth a todas las rutas
app.use('*', authMiddleware)

// Proxy para todas las rutas de Ollama
app.all('*', async (c) => {
    const url = new URL(c.req.url)
    const targetUrl = `${OLLAMA_BASE_URL}${url.pathname}${url.search}`
    // console.log({ body: await c.req.text(), targetUrl })
    try {
        const response = await fetch(targetUrl, {
            method: c.req.method,
            headers: {
                'Content-Type': c.req.header('Content-Type') || 'application/json',
                ...Object.fromEntries(
                    Object.entries(c.req.header()).filter(([key]) =>
                        !['host', 'x-api-key', 'authorization'].includes(key.toLowerCase())
                    )
                )
            },
            body: c.req.method !== 'GET' ? await c.req.text() : undefined
        })

        const responseHeaders = {}
        response.headers.forEach((value, key) => {
            responseHeaders[key] = value
        })

        // console.log(`Response from Ollama: ${response.status}`, response.json ? JSON.stringify(await response.clone().json()) : await response.clone().text())
        return new Response(response.body, {
            status: response.status,
            headers: responseHeaders
        })
    } catch (error) {
        return c.json({ error: 'Failed to connect to Ollama service' }, 500)
    }
})

export default {
    port: PORT,
    fetch: app.fetch,
}

