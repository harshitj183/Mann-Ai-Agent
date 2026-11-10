export const SERVICES = {
  auth: process.env.AUTH_SERVICE_URL || 'http://localhost:3001',
  chat: process.env.CHAT_SERVICE_URL || 'http://localhost:3002',
  agent: process.env.AGENT_SERVICE_URL || 'http://localhost:3004',
  memory: process.env.MEMORY_SERVICE_URL || 'http://localhost:3003',
  tools: process.env.TOOLS_SERVICE_URL || 'http://localhost:3005',
}