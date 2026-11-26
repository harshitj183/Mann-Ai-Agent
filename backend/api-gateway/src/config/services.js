const HOST = process.env.SERVICE_HOST || 'localhost'

export const SERVICES = {
  auth:   process.env.AUTH_SERVICE_URL   || `http://${HOST}:3001`,
  chat:   process.env.CHAT_SERVICE_URL   || `http://${HOST}:3002`,
  agent:  process.env.AGENT_SERVICE_URL  || `http://${HOST}:3004`,
  memory: process.env.MEMORY_SERVICE_URL || `http://${HOST}:3003`,
  tools:     process.env.TOOLS_SERVICE_URL     || `http://${HOST}:3005`,
  execution: process.env.EXECUTION_SERVICE_URL || `http://${HOST}:3006`,
}