import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [
    react(),
    // Plugin para evitar que cabeceras CSP establecidas por dependencias del dev server
    // bloqueen la ejecución de scripts en desarrollo (evita Content-Security-Policy: default-src 'none').
    {
      name: 'remove-csp-header-dev',
      configureServer(server) {
        // Middleware para forzar una política CSP permisiva en desarrollo
        // (si alguna extensión o proxy inyecta `script-src 'none'`, esto permite scripts durante dev)
        server.middlewares.use((req, res, next) => {
          try {
            // Forzamos una cabecera CSP permisiva durante el desarrollo para evitar bloqueos
            // por parte de proxies o extensiones que puedan inyectar políticas estrictas.
            const cspValue = "default-src * 'unsafe-inline' 'unsafe-eval' data: blob:; script-src * 'unsafe-inline' 'unsafe-eval' http: https:; connect-src * ws:; img-src * data:; style-src * 'unsafe-inline'";
            try {
              res.setHeader('Content-Security-Policy', cspValue);
            } catch (e) {
              // ignore
            }

            // No necesitamos envolver writeHead si simplemente establecemos la cabecera
          } catch (e) {
            // no hacer nada si falla el wrapping
          }
          next();
        });

        // Algunos usuarios reportan que Vite establece CSP antes de que los middlewares se apliquen.
        // Para cubrir ese caso, también envolvemos el event 'request' del servidor http principal,
        // que se ejecuta muy temprano al crear la respuesta.
        try {
          const httpServer = server.httpServer;
          if (httpServer && typeof httpServer.on === 'function') {
            httpServer.on('request', (req, res) => {
              try {
                const origSetHeader = res.setHeader && res.setHeader.bind(res);
                if (origSetHeader) {
                  // En el evento 'request' también fijamos la cabecera permisiva lo antes posible.
                  const cspValue = "default-src * 'unsafe-inline' 'unsafe-eval' data: blob:; script-src * 'unsafe-inline' 'unsafe-eval' http: https:; connect-src * ws:; img-src * data:; style-src * 'unsafe-inline'";
                  res.setHeader = function (name, value) {
                    try {
                      // eslint-disable-next-line no-console
                      //console.log('[remove-csp-header-dev] (request) Forzando CSP (dev) para', req.url);
                      res.setHeader('Content-Security-Policy', cspValue);
                    } catch (e) {}
                    return origSetHeader(name, value);
                  };
                }
                if (typeof res.writeHead === 'function') {
                  const origWriteHead = res.writeHead.bind(res);
                  res.writeHead = function (statusCode, statusMessageOrHeaders, headers) {
                    let statusMessage = statusMessageOrHeaders;
                    let hdrs = headers;
                    if (typeof statusMessageOrHeaders === 'object' && statusMessageOrHeaders !== null) {
                      hdrs = statusMessageOrHeaders;
                      statusMessage = undefined;
                    }
                    if (hdrs && typeof hdrs === 'object') {
                      for (const k of Object.keys(hdrs)) {
                        if (k.toLowerCase() === 'content-security-policy') delete hdrs[k];
                      }
                    }
                    if (statusMessage !== undefined) return origWriteHead(statusCode, statusMessage, hdrs);
                    return origWriteHead(statusCode, hdrs);
                  };
                }
              } catch (e) {
                // ignore
              }
            });
          }
        } catch (e) {
          // ignore
        }
      }
    }
  ],
  resolve: {
    alias: {
      // Force single copy resolution to avoid invalid hook calls / duplicate emotion
      react: path.resolve(__dirname, 'node_modules', 'react'),
      'react-dom': path.resolve(__dirname, 'node_modules', 'react-dom'),
      '@emotion/react': path.resolve(__dirname, 'node_modules', '@emotion', 'react')
    }
  },
  optimizeDeps: {
    include: ['react', 'react-dom', '@emotion/react']
  },
  server: {
    port: 5173
  }
})

