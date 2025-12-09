const { createServer } = require('http')
const { parse } = require('url')
const next = require('next')
const fs = require('fs')
const path = require('path')

const dev = process.env.NODE_ENV !== 'production'
const hostname = process.env.HOSTNAME || '0.0.0.0'
const port = parseInt(process.env.PORT || '3000', 10)

// Update config file with environment variables if provided
const configPath = path.join(__dirname, 'config', 'app.config.json')
if (fs.existsSync(configPath)) {
  try {
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'))
    
    // Update database config from environment
    if (process.env.DB_HOST) config.database.host = process.env.DB_HOST
    if (process.env.DB_PORT) config.database.port = parseInt(process.env.DB_PORT)
    if (process.env.DB_NAME) config.database.database = process.env.DB_NAME
    if (process.env.DB_USER) config.database.user = process.env.DB_USER
    if (process.env.DB_PASSWORD) config.database.password = process.env.DB_PASSWORD
    if (process.env.DB_SSL) config.database.ssl = process.env.DB_SSL === 'true'
    
    // Update application config
    if (process.env.APP_PORT) config.application.port = parseInt(process.env.APP_PORT)
    if (process.env.NODE_ENV) config.application.environment = process.env.NODE_ENV
    
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2))
    console.log('✓ Configuration updated from environment variables')
  } catch (error) {
    console.error('✗ Error updating configuration:', error)
  }
}

const app = next({ dev, hostname, port })
const handle = app.getRequestHandler()

app.prepare().then(() => {
  createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true)
      await handle(req, res, parsedUrl)
    } catch (err) {
      console.error('Error occurred handling', req.url, err)
      res.statusCode = 500
      res.end('internal server error')
    }
  }).listen(port, hostname, (err) => {
    if (err) throw err
    console.log(`> Ready on http://${hostname}:${port}`)
  })
})
