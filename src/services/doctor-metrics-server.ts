import http from "http";

/** HTTP /metrics server for doctor --watch --metrics-port (127.0.0.1 only). */
export function startDoctorMetricsServer(
  getBody: () => string,
  port: number,
  host = "127.0.0.1"
): http.Server {
  const server = http.createServer((req, res) => {
    const path = req.url?.split("?")[0] || "/";
    if (path === "/metrics" || path === "/") {
      res.writeHead(200, { "Content-Type": "text/plain; version=0.0.4; charset=utf-8" });
      res.end(getBody());
      return;
    }
    if (path === "/healthz") {
      res.writeHead(200, { "Content-Type": "text/plain" });
      res.end("ok\n");
      return;
    }
    res.writeHead(404, { "Content-Type": "text/plain" });
    res.end("not found\n");
  });
  server.listen(port, host);
  return server;
}

export function stopDoctorMetricsServer(server: http.Server): Promise<void> {
  return new Promise((resolve, reject) => {
    server.close((err) => (err ? reject(err) : resolve()));
  });
}
