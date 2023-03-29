import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import svgr from 'vite-plugin-svgr'
import createBareServer from '@tomphttp/bare-server-node'
import express from 'express'
import chalk from 'chalk'
import block from './blocklist/block.json' assert { type: 'json' }

const bareServer = createBareServer('/not-sus-server/')

const setupProxy = {
  name: 'setup-proxy-plugin',
  async configureServer(server) {
    server.httpServer.on('request', (req, res) => {
      if (bareServer.shouldRoute(req)) {
        if (block.includes(req.headers['x-bare-host'])) {
          return res.end(`{
            "id": "error.Blocked",
            "message": "Header was blocked by the owner of this site. Is this a porn site?",
          }`)
        }
        bareServer.routeRequest(req, res)
      } else {
        server.middlewares(req, res, () => {})
      }
    })

    server.middlewares.use('/URIconfig', (req, res) => {
      res.end(
        JSON.stringify({
          DC: process.env['INVITE_URL'] || 'example.com',
          CH: process.env['CHATBOX_URL'] || 'example.com',
        })
      )
    })

    server.middlewares.use(express.static("./static"))
  },
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
      },
    }),
    setupProxy,
  ],
})
