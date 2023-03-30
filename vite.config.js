import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import svgr from 'vite-plugin-svgr';
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
  }
}

const customResolver = {
  name: 'custom-resolver-plugin',
  async configureServer(server) {
    const dnsServer = process.env['DNS'] || "1.1.1.1";
    const resolver = new dns.promises.Resolver();
    resolver.setServers([dnsServer]);

    server.middlewares.use((req, res, next) => {
      const urlObj = new URL(req.url, `http://${req.headers.host}`);
      const hostname = urlObj.hostname;

      resolver.resolve(hostname)
        .then(() => next())
        .catch(() => res.sendStatus(404));
    });
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