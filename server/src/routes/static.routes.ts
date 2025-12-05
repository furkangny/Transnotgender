import { FastifyInstance } from 'fastify'
import fs from 'fs'
import { paths } from '../config/paths.js'



export async function registerStaticRoutes(server: FastifyInstance)
{
	server.get('/', async (request, reply) => {
		console.log('Serving root path')
		try {
            const content = await fs.promises.readFile(paths.index, 'utf8')
            return reply.type('text/html').send(content)
        } catch (err) {
            console.error('Error reading index.html:', err)
            return reply.code(500).send('İç sunucu hatası')
        }
    })
    
    server.setNotFoundHandler( (request, reply) => {
        console.log(`NotFound handler for: ${request.url}`)
        
        if (request.url.startsWith('/api/')) {
            return reply.code(404).send({ error: 'Adres bulunamadı' })
        }
        
        if (request.url === '/ws') {
            return reply.code(404).send({ error: 'WebSocket bulunamadı' })
        }

        if (request.url.match(/\.(js|css|png|jpg|jpeg|gif|svg|ico|json|woff|woff2|ttf)$/)) {
            return reply.code(404).send('Dosya bulunamadı')
        }
        
        return fs.promises.readFile(paths.index, 'utf8')
            .then(content => reply.type('text/html').send(content))
            .catch(err => {
                console.error('❌ Error reading index.html:', err)
                return reply.code(500).send('İç sunucu hatası')
            })
    })
}