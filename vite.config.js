import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import svgr from 'vite-plugin-svgr';
import { createProxyMiddleware } from 'http-proxy-middleware';
import dns from 'dns';
import createBareServer from '@tomphttp/bare-server-node';
import express from 'express';

const customResolver = (url, callback) => {
  const dnsServer = process.env.DNS || '1.1.1.1';
  const resolver = new dns.Resolver();
  resolver.setServers([dnsServer]);
  resolver.resolve4(url.hostname, (err, addresses) => {
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
    const bareServer = createBareServer('/not-sus-server/');

    server.middlewares.use((req, res, next) => {
      if (bareServer.shouldRoute(req)) {
        bareServer.routeRequest(req, res);
      } else {
        next();
      }
    });

    server.middlewares.use('/URIconfig', (req, res) => {
      res.end(
        JSON.stringify({
          DC: process.env.INVITE_URL || 'example.com',
          CH: process.env.CHATBOX_URL || 'example.com'
        })
      );
    });

    server.middlewares.use(express.static('./static'));

    const proxy = createProxyMiddleware({
      target: 'http://localhost:5000',
      changeOrigin: true,
      onProxyReq: logRequestHeaders,
      selfHandleResponse: true,
      cookieDomainRewrite: {
        '*': ''
      },
      cookiePathRewrite: {
        '*': '/'
      },
      resolver: customResolver // <-- Add this line to use the custom resolver
    });

    server.middlewares.use(proxy);
  }
};

function logRequestHeaders(proxyReq) {
  console.log(`Proxying ${proxyReq.path} to ${proxyReq.proxy.host}:${proxyReq.proxy.port}`);
  console.log('Request Headers:');
  console.log(proxyReq.headers);
}

export default defineConfig({
  plugins: [
    react(),
    svgr({
      svgrOptions: {
        prettier: false,
        svgo: false,
        svgoConfig: {
          plugins: [{ removeViewBox: false }]
        },
        titleProp: true,
        ref: true
      }
    }),
    setupProxy
  ]
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
