import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import svgr from 'vite-plugin-svgr'

import createBareServer from '@tomphttp/bare-server-node';
import express from 'express';
import dns from 'dns';

const familyProtectionDNS = process.env.DNS || '1.1.1.1';  // Sets DNS to the envioment variable, if not supplied, default to CloudFlare "1.1.1.1"

const customResolver = (url, callback) => {
  dns.resolve4(url.hostname, familyProtectionDNS, (err, addresses) => {
    if (err) {
      callback(err);
    } else {
      url.host = addresses[0];
      callback(null, url);
    }
  });
};

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

    server.middlewares.use((req, res, next) => {
      const originalResolve = req._proxyRequestOptions.lookup;
      req._proxyRequestOptions.lookup = customResolver.bind(null, req._proxyRequestOptions.url);
      originalResolve(req._proxyRequestOptions.hostname, (err, address) => {
        req._proxyRequestOptions.lookup = originalResolve;
        if (err) {
          next(err);
        } else {
          req._proxyRequestOptions.host = address;
          next();
        }
      });
    });
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