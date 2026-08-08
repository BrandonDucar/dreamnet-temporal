export class GrafanaMcpClient {
  constructor({
    endpoint = process.env.GRAFANA_MCP_ENDPOINT || 'https://mcp.grafana.com/mcp',
    grafanaUrl = process.env.GRAFANA_URL,
    bearerToken = process.env.GRAFANA_MCP_BEARER_TOKEN,
    sdk,
  } = {}) {
    this.endpoint = endpoint;
    this.grafanaUrl = grafanaUrl;
    this.bearerToken = bearerToken;
    this.sdk = sdk;
    this.client = null;
  }

  async connect() {
    const sdk = this.sdk ?? await loadMcpSdk();
    const headers = {};
    if (this.grafanaUrl) headers['X-Grafana-URL'] = this.grafanaUrl;
    if (this.bearerToken) headers.Authorization = `Bearer ${this.bearerToken}`;
    const transport = new sdk.StreamableHTTPClientTransport(new URL(this.endpoint), {
      requestInit: { headers },
    });
    this.client = new sdk.Client({ name: 'dreamnet-studio-guardian', version: '1.0.0' });
    await this.client.connect(transport);
  }

  async callTool(name, args) {
    if (!this.client) await this.connect();
    return this.client.callTool({ name, arguments: args });
  }

  async close() {
    await this.client?.close();
    this.client = null;
  }
}

async function loadMcpSdk() {
  const [{ Client }, { StreamableHTTPClientTransport }] = await Promise.all([
    import('@modelcontextprotocol/sdk/client/index.js'),
    import('@modelcontextprotocol/sdk/client/streamableHttp.js'),
  ]);
  return { Client, StreamableHTTPClientTransport };
}

export class GeminiClient {
  constructor({
    model = process.env.GEMINI_MODEL || 'gemini-2.5-flash',
    apiKey = process.env.GEMINI_API_KEY,
    GoogleGenAI,
  } = {}) {
    this.model = model;
    this.apiKey = apiKey;
    this.GoogleGenAI = GoogleGenAI;
    this.ai = null;
  }

  async generate(prompt) {
    if (!this.ai) {
      const GoogleGenAI = this.GoogleGenAI ?? (await import('@google/genai')).GoogleGenAI;
      this.ai = new GoogleGenAI({ apiKey: this.apiKey });
    }
    const response = await this.ai.models.generateContent({ model: this.model, contents: prompt });
    return response.text;
  }
}
