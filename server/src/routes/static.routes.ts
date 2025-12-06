import { FastifyInstance } from 'fastify'
import fs from 'fs'
import { paths } from '../config/paths.js'



export async function registerStaticRoutes(server: FastifyInstance)
{
	// NotFound handler for SPA routing and 404 errors
	server.setNotFoundHandler( (request, reply) => {
		console.log(`NotFound handler for: ${request.url}`)
		
		// Handle WebSocket 404
		if (request.url === '/ws') {
			return reply.code(404).send({ error: 'WebSocket bulunamadı' })
		}
		
		// Handle API 404
		if (request.url.startsWith('/api/')) {
			return reply.code(404).send({ error: 'Adres bulunamadı' })
		}

		// Handle static file 404
		if (request.url.match(/\.(js|css|png|jpg|jpeg|gif|svg|ico|json|woff|woff2|ttf)$/)) {
			return reply.code(404).send('Dosya bulunamadı')
		}
		
		// SPA fallback - serve index.html
		return fs.promises.readFile(paths.index, 'utf8')
			.then(content => reply.type('text/html').send(content))
			.catch(err => {
				console.error('❌ Error reading index.html:', err)
				return reply.code(500).send('İç sunucu hatası')
			})
	})

	// Root path handler
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
}