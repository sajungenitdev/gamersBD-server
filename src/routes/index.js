const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

router.get('/', (req, res) => {
    const uptime = process.uptime();
    const currentYear = new Date().getFullYear();
    const NODE_ENV = process.env.NODE_ENV || 'development';
    const dbState = mongoose.connection.readyState;
    const isDbConnected = dbState === 1;

    const formatUptime = (seconds) => {
        const days = Math.floor(seconds / 86400);
        const hours = Math.floor((seconds % 86400) / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = Math.floor(seconds % 60);
        const parts = [];
        if (days > 0) parts.push(`${days}d`);
        if (hours > 0) parts.push(`${hours}h`);
        if (minutes > 0) parts.push(`${minutes}m`);
        if (secs > 0 || parts.length === 0) parts.push(`${secs}s`);
        return parts.join(' ');
    };

    res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>🎮 GamersBD API - Ultimate Gaming Destination</title>
        <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                min-height: 100vh;
                position: relative;
                overflow-x: hidden;
            }
            body::before {
                content: '';
                position: absolute;
                width: 100%;
                height: 100%;
                background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" opacity="0.1"><path fill="white" d="M20,20 L30,10 L40,20 L30,30 Z M60,60 L70,50 L80,60 L70,70 Z M40,70 L50,60 L60,70 L50,80 Z M10,50 L20,40 L30,50 L20,60 Z M70,20 L80,10 L90,20 L80,30 Z"/></svg>') repeat;
                pointer-events: none;
            }
            .container { max-width: 1200px; margin: 0 auto; padding: 2rem; position: relative; z-index: 1; }
            .header { text-align: center; padding: 4rem 0; animation: fadeInDown 0.8s ease-out; }
            .logo { font-size: 5rem; margin-bottom: 1rem; animation: bounce 2s infinite; display: inline-block; }
            h1 { font-size: 3rem; background: linear-gradient(135deg, #fff 0%, #f0f0f0 100%); -webkit-background-clip: text; background-clip: text; color: transparent; margin-bottom: 1rem; font-weight: 800; }
            .tagline { font-size: 1.2rem; color: rgba(255,255,255,0.9); margin-bottom: 2rem; }
            .status-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 1.5rem; margin: 3rem 0; animation: fadeInUp 0.8s ease-out; }
            .status-card { background: rgba(255,255,255,0.95); backdrop-filter: blur(10px); border-radius: 20px; padding: 1.5rem; box-shadow: 0 8px 32px rgba(0,0,0,0.1); transition: transform 0.3s ease; cursor: pointer; }
            .status-card:hover { transform: translateY(-5px); }
            .status-icon { font-size: 2.5rem; margin-bottom: 1rem; }
            .status-title { font-size: 1rem; text-transform: uppercase; color: #667eea; font-weight: 600; margin-bottom: 0.5rem; letter-spacing: 1px; }
            .status-value { font-size: 1.8rem; font-weight: bold; color: #333; margin-bottom: 0.5rem; }
            .status-badge { display: inline-block; padding: 0.25rem 0.75rem; border-radius: 20px; font-size: 0.8rem; font-weight: 600; }
            .badge-online { background: #10b981; color: white; animation: pulse 2s infinite; }
            .badge-offline { background: #ef4444; color: white; }
            .endpoints-section { background: rgba(255,255,255,0.95); backdrop-filter: blur(10px); border-radius: 20px; padding: 2rem; margin: 2rem 0; animation: fadeInUp 0.8s ease-out 0.2s backwards; }
            .section-title { font-size: 1.8rem; margin-bottom: 1.5rem; color: #333; }
            .endpoint-grid { display: grid; gap: 1rem; }
            .endpoint-item { background: rgba(102, 126, 234, 0.05); border-left: 4px solid #667eea; padding: 1rem; border-radius: 8px; transition: all 0.3s ease; }
            .endpoint-item:hover { background: rgba(102, 126, 234, 0.1); transform: translateX(5px); }
            .endpoint-method { display: inline-block; padding: 0.25rem 0.75rem; border-radius: 4px; font-size: 0.75rem; font-weight: bold; margin-right: 1rem; font-family: monospace; }
            .method-get { background: #10b981; color: white; }
            .method-post { background: #3b82f6; color: white; }
            .method-put { background: #f59e0b; color: white; }
            .method-delete { background: #ef4444; color: white; }
            .endpoint-path { font-family: monospace; font-size: 1rem; color: #333; font-weight: 600; }
            .endpoint-desc { margin-top: 0.5rem; color: #666; font-size: 0.9rem; }
            .features-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 1.5rem; margin: 2rem 0; animation: fadeInUp 0.8s ease-out 0.4s backwards; }
            .feature-card { text-align: center; padding: 1.5rem; background: rgba(255,255,255,0.95); backdrop-filter: blur(10px); border-radius: 20px; transition: all 0.3s ease; }
            .feature-card:hover { transform: scale(1.05); }
            .feature-icon { font-size: 2.5rem; margin-bottom: 1rem; }
            .feature-title { font-size: 1.2rem; font-weight: 600; margin-bottom: 0.5rem; color: #333; }
            .feature-desc { color: #666; font-size: 0.9rem; }
            .footer { text-align: center; padding: 2rem; margin-top: 3rem; color: rgba(255,255,255,0.8); animation: fadeInUp 0.8s ease-out 0.6s backwards; }
            .footer a { color: white; text-decoration: none; border-bottom: 1px dotted rgba(255,255,255,0.5); }
            .footer a:hover { border-bottom-color: white; }
            @keyframes fadeInDown { from { opacity: 0; transform: translateY(-30px); } to { opacity: 1; transform: translateY(0); } }
            @keyframes fadeInUp { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } }
            @keyframes bounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }
            @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.7; } }
            @media (max-width: 768px) { h1 { font-size: 2rem; } .logo { font-size: 3rem; } .container { padding: 1rem; } .status-value { font-size: 1.4rem; } }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <div class="logo">🎮</div>
                <h1>GamersBD API</h1>
                <div class="tagline">Your Ultimate Gaming Destination API</div>
            </div>

            <div class="status-grid">
                <div class="status-card">
                    <div class="status-icon">🟢</div>
                    <div class="status-title">API Status</div>
                    <div class="status-value">Online</div>
                    <span class="status-badge badge-online">Operational</span>
                </div>
                <div class="status-card">
                    <div class="status-icon">🗄️</div>
                    <div class="status-title">Database</div>
                    <div class="status-value" id="dbStatus">${isDbConnected ? 'Connected' : 'Disconnected'}</div>
                    <span class="status-badge ${isDbConnected ? 'badge-online' : 'badge-offline'}" id="dbBadge">${isDbConnected ? 'Active' : 'Inactive'}</span>
                </div>
                <div class="status-card">
                    <div class="status-icon">⏱️</div>
                    <div class="status-title">Uptime</div>
                    <div class="status-value" id="uptime">${formatUptime(uptime)}</div>
                    <span class="status-badge badge-online">Running</span>
                </div>
                <div class="status-card">
                    <div class="status-icon">📊</div>
                    <div class="status-title">Environment</div>
                    <div class="status-value">${NODE_ENV.toUpperCase()}</div>
                    <span class="status-badge badge-online">${NODE_ENV}</span>
                </div>
            </div>

            <div class="endpoints-section">
                <div class="section-title">🔗 API Endpoints</div>
                <div class="endpoint-grid">
                    <div class="endpoint-item">
                        <a href="https://gamersbd-server.onrender.com/api/products" target="_blank">
                            <span class="endpoint-method method-get">GET</span>
                            <span class="endpoint-path">https://gamersbd-server.onrender.com/api/products</span>
                            <div class="endpoint-desc">Get all products with pagination</div>
                        </a>
                    </div>
                    <div class="endpoint-item">
                        <a href="https://gamersbd-server.onrender.com/api/products/:id" target="_blank">
                            <span class="endpoint-method method-get">GET</span>
                            <span class="endpoint-path">https://gamersbd-server.onrender.com/api/products/:id</span>
                            <div class="endpoint-desc">Get single product by ID</div>
                        </a>
                    </div>
                    <div class="endpoint-item">
                        <a href="https://gamersbd-server.onrender.com/api/categories" target="_blank">
                            <span class="endpoint-method method-get">GET</span>
                            <span class="endpoint-path">https://gamersbd-server.onrender.com/api/categories</span>
                            <div class="endpoint-desc">Get all categories</div>
                        </a>
                    </div>
                    <div class="endpoint-item">
                        <span class="endpoint-method method-get">GET</span><span
                            class="endpoint-path">https://gamersbd-server.onrender.com/api/categories</span>
                        <div class="endpoint-desc">Get all categories</div>
                        </a></a>
                    </div>
                    <div class="endpoint-item">
                        <a href="https://gamersbd-server.onrender.com/api/auth/register" target="_blank">
                            <span class="endpoint-method method-post">POST</span><span
                                class="endpoint-path">https://gamersbd-server.onrender.com/api/auth/register</span>
                            <div class="endpoint-desc">Register new user</div>
                        </a>
                    </div>
                    <div class="endpoint-item">
                        <a href="https://gamersbd-server.onrender.com/api/auth/login" target="_blank">
                            <span class="endpoint-method method-post">POST</span>
                            <span class="endpoint-path">https://gamersbd-server.onrender.com/api/auth/login</span>
                            <div class="endpoint-desc">User login</div>
                        </a>
                    </div>
                    <div class="endpoint-item">
                        <a href="https://gamersbd-server.onrender.com/api/orders" target="_blank">
                            <span class="endpoint-method method-get">GET</span>
                            <span class="endpoint-path">https://gamersbd-server.onrender.com/api/orders</span>
                            <div class="endpoint-desc">Get user orders</div>
                        </a>
                    </div>
                    <div class="endpoint-item">
                        <a href="https://gamersbd-server.onrender.com/api/orders" target="_blank">
                            <span class="endpoint-method method-post">POST</span>
                            <span class="endpoint-path">https://gamersbd-server.onrender.com/api/orders</span>
                            <div class="endpoint-desc">Create new order</div>
                        </a>
                    </div>
                    <div class="endpoint-item">
                        <a href="https://gamersbd-server.onrender.com/health" target="_blank">
                            <span class="endpoint-method method-get">GET</span>
                            <span class="endpoint-path">https://gamersbd-server.onrender.com/health</span>
                            <div class="endpoint-desc">Health check endpoint</div>
                        </a>
                    </div>
                </div>
            </div>

            <div class="features-grid">
                <div class="feature-card"><div class="feature-icon">🚀</div><div class="feature-title">High Performance</div><div class="feature-desc">Optimized queries for fast responses</div></div>
                <div class="feature-card"><div class="feature-icon">🔒</div><div class="feature-title">Secure Auth</div><div class="feature-desc">JWT-based authentication</div></div>
                <div class="feature-card"><div class="feature-icon">📦</div><div class="feature-title">RESTful API</div><div class="feature-desc">Clean and intuitive API</div></div>
                <div class="feature-card"><div class="feature-icon">🛡️</div><div class="feature-title">Rate Limited</div><div class="feature-desc">Protection against abuse</div></div>
            </div>

            <div class="footer">
                <p>© ${currentYear} GamersBD. All rights reserved.</p>
                <p>🎮 Powered by Node.js, Express & MongoDB</p>
            </div>
        </div>

        <script>
            const startTime = ${Date.now() - uptime * 1000};
            function formatUptime(s) {
                const d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
                const parts = [];
                if (d > 0) parts.push(d + 'd');
                if (h > 0) parts.push(h + 'h');
                if (m > 0) parts.push(m + 'm');
                if (sec > 0 || parts.length === 0) parts.push(sec + 's');
                return parts.join(' ');
            }
            function updateUptime() {
                const el = document.getElementById('uptime');
                if (el) el.textContent = formatUptime(Math.floor((Date.now() - startTime) / 1000));
            }
            setInterval(updateUptime, 1000);
            updateUptime();
        </script>
    </body>
    </html>
  `);
});

module.exports = router;