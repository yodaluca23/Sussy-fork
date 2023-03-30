import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import svgr from 'vite-plugin-svgr'
import createProxyMiddleware from 'http-proxy-middleware'
import dns from 'dns'

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
    })
  ],
  server: {
    middleware: [
      createProxyMiddleware({
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
        resolver: customResolver
      })
    ],
    fs: {
      strict: true
    }
  }
})
