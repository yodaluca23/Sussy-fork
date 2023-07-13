import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import svgr from 'vite-plugin-svgr'
import dns from 'dns'
import url from 'url'
import createBareServer from '@tomphttp/bare-server-node';
import express from 'express';

const setupProxy = {
  name: 'setup-proxy-plugin',
  async configureServer(server) {
    const bareServer = createBareServer("/not-sus-server/");

    server.middlewares.use((req, res, next) => {
      if(bareServer.shouldRoute(req)) bareServer.routeRequest(req, res); else next();
    });

    server.middlewares.use("/URIconfig", (req, res) => {
      res.end(JSON.stringify({
        DC: process.env['INVITE_URL'] || "example.com",
        CH: process.env['CHATBOX_URL'] || "example.com"
      }));
    });

    server.middlewares.use((req, res, next) => {
      const hostname = url.parse(req.url).hostname;
      dns.setServers([process.env.DNS]);
      dns.resolve4(hostname, (err) => {
        if (err) {
          res.status(403).send('Forbidden');
        } else {
          next();
        }
      });
    });

    server.middlewares.use(express.static("./static"));
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
