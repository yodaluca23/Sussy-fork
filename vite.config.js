import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import svgr from 'vite-plugin-svgr'
import createBareServer from '@tomphttp/bare-server-node'
import express from 'express'
import dns from 'dns'

const setupProxy = {
  name: 'setup-proxy-plugin',
  async configureServer(server) {
    const bareServer = createBareServer("/not-sus-server/")

    server.middlewares.use((req, res, next) => {
      if(bareServer.shouldRoute(req)) bareServer.routeRequest(req, res); else next();
    })

    server.middlewares.use("/URIconfig", (req, res) => {
      res.end(JSON.stringify({
        DC: process.env['INVITE_URL'] || "example.com",
        CH: process.env['CHATBOX_URL'] || "example.com"
      }))
    })

    server.middlewares.use(express.static("./static"))
  },
  async configureServer(server) {
    const dnsServer = process.env['DNS'] || '1.1.1.1'

    const customResolver = new dns.promises.Resolver()
    customResolver.setServers([dnsServer])

    server.middlewares.use(async (req, res, next) => {
      try {
        const domain = new URL(req.url).hostname
        await customResolver.resolve4(domain)
        next()
      } catch (err) {
        console.error(`Blocked request to ${req.url}: ${err.message}`)
        res.status(403).send(`Access denied: ${req.url} is blocked by DNS filtering`)
      }
    })
  }
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    svgr({
      svgrOptions: {
        prettier: false,
        svgo: false,
        svgoConfig: {
          plugins: [{ removeViewBox: false }],
        },
        titleProp: true,
        ref: true,
      }
    }),
    setupProxy
  ]
})
