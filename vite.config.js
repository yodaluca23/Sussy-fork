import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import svgr from 'vite-plugin-svgr'
import dns from 'dns'

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

    server.middlewares.use(express.static("./static"));
  }
}

// Custom resolver that enforces DNS filtering
const customResolver = {
  name: 'custom-resolver-plugin',
  async resolveId(id, importer) {
    const dnsServer = process.env.DNS || '1.1.1.1';
    const options = { family: 4, all: false, hints: dns.ADDRCONFIG | dns.V4MAPPED };
    try {
      await dns.promises.lookup(id, options);
      return null; // allow resolution using default algorithm
    } catch (err) {
      return `Cannot resolve ${id}`; // block resolution
    }
  }
};

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
    setupProxy,
    customResolver
  ]
});
