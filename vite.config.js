import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import svgr from 'vite-plugin-svgr'

import createBareServer from '@tomphttp/bare-server-node';
import express from 'express';
import dns from 'dns';

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

    // Custom resolver to use DNS filtering service
    const originalLookup = dns.lookup;
    const dnsServer = process.env.DNS || '1.1.1.1';
    dns.lookup = function(hostname, options, callback) {
      const callbackWrapper = (err, address, family) => {
        if (err) {
          console.error(`DNS lookup failed for ${hostname}`);
          res.status(403).sendFile('./blocked.html', { root: './static' });
        } else {
          callback(err, address, family);
        }
      };
      originalLookup.call(dns, hostname, { ...options, server: [dnsServer] }, callbackWrapper);
    };
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
    setupProxy
  ]
});