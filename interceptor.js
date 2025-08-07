
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
const URL_INTERCEPTADA = 'http://10.0.5.2:6333'
const VALID_API_KEY = process.env.VALID_API_KEY || ''
const PORT =  6334

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
// app.use('*', authMiddleware)

// Proxy para todas las rutas de qdrant
app.all('*', async (c) => {
    const url = new URL(c.req.url)
    const targetUrl = `${URL_INTERCEPTADA}${url.pathname}${url.search}`
    
    // Obtener el cuerpo de la solicitud una sola vez
    let bodyContent;
    if (c.req.method !== 'GET' && c.req.method !== 'HEAD') {
        try {
            bodyContent = await c.req.text();
        } catch (err) {
            console.error('Error al leer el cuerpo de la solicitud:', err);
            bodyContent = await c.req.json();
        }
    }
    
    console.log({ 
        method: c.req.method,
        url: c.req.url,
        bodyContent,
        // targetUrl,
        // headers: c.req.header(),
        // bodyLength: bodyContent ? bodyContent.length : 0
    });
    
    try {
        // Configurar los headers para la solicitud de proxy
        const headers = {
            'Content-Type': c.req.header('Content-Type') || 'application/json',
        };
        
        // Agregar todos los headers excepto los que queremos filtrar
        Object.entries(c.req.header()).forEach(([key, value]) => {
            if (!['host', 'x-api-key', 'authorization'].includes(key.toLowerCase())) {
                headers[key] = value;
            }
        });
        
        // Asegurarnos de que las cookies se reenvían correctamente
        if (c.req.header('cookie')) {
            headers['Cookie'] = c.req.header('cookie');
        }
        
        const response = await fetch(targetUrl, {
            method: c.req.method,
            headers: headers,
            body: bodyContent,
            // Asegurar que las redirecciones se manejan correctamente
            redirect: 'follow'
        });

        // Recopilar todos los headers de respuesta
        const responseHeaders = {};
        response.headers.forEach((value, key) => {
            responseHeaders[key] = value;
        });

        // Registrar información sobre la respuesta para depuración
        console.log(`Respuesta de Ollama: ${response.status}, Content-Type: ${response.headers.get('Content-Type')}`);
        
        // Determinar el tipo de contenido para manejar diferentes tipos de respuestas
        const contentType = response.headers.get('Content-Type') || '';
        
        if (contentType.includes('application/json')) {
            // Para respuestas JSON, podemos convertirlas y devolverlas como JSON
            const jsonData = await response.json();
            console.log('Respuesta JSON recibida:', typeof jsonData, JSON.stringify(jsonData, null, 2));
            return c.json(jsonData, response.status);
        } else if (contentType.includes('text/')) {
            // Para respuestas de texto
            const textData = await response.text();
            return new Response(textData, {
                status: response.status,
                statusText: response.statusText,
                headers: responseHeaders
            });
        } else if (contentType.includes('stream')) {
            // Para streams (como con generación de texto)
            console.log('Manejando respuesta de stream');
            return new Response(response.body, {
                status: response.status,
                statusText: response.statusText, 
            });
        } else {
            // Para otros tipos de contenido (binario, etc.)
            const arrayBuffer = await response.arrayBuffer();
            return new Response(arrayBuffer, {
                status: response.status,
                statusText: response.statusText,
                headers: responseHeaders
            });
        }
    } catch (error) {
        console.error('Error al conectar con el servicio Ollama:', error);
        return c.json({ 
            error: 'Failed to connect to Ollama service', 
            details: error.message 
        }, 500);
    }
})

export default {
    port: PORT,
    fetch: app.fetch,
}

