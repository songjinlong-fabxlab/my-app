// Vercel Serverless Function - 代理转发 AI 请求
const https = require('https');

module.exports = async function(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-api-key, x-provider');

  if (req.method === 'OPTIONS') { res.status(204).end(); return; }
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }

  const provider = req.headers['x-provider'] || 'qwen';
  const body = JSON.stringify(req.body);

  const options = provider === 'anthropic' ? {
    hostname: 'api.anthropic.com',
    path: '/v1/messages',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': req.headers['x-api-key'] || '',
      'anthropic-version': '2023-06-01',
      'Content-Length': Buffer.byteLength(body)
    }
  } : {
    hostname: 'dashscope.aliyuncs.com',
    path: '/compatible-mode/v1/chat/completions',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': req.headers['authorization'] || '',
      'Content-Length': Buffer.byteLength(body)
    }
  };

  return new Promise((resolve) => {
    const proxyReq = https.request(options, (proxyRes) => {
      let data = '';
      proxyRes.on('data', (chunk) => { data += chunk; });
      proxyRes.on('end', () => {
        res.status(proxyRes.statusCode).setHeader('Content-Type', 'application/json').end(data);
        resolve();
      });
    });
    proxyReq.on('error', (e) => {
      res.status(500).json({ error: e.message });
      resolve();
    });
    proxyReq.write(body);
    proxyReq.end();
  });
};
