import express from "express";
import { createServer } from "vite";
import { createApi } from "./api.mjs";
import { createLocalStore } from "./store.mjs";

const app = express();
const port = Number(process.env.PORT || 3000);
const api = createApi({
  store: createLocalStore(process.env.LOCAL_DATA_DIR || ".local-data"),
});
app.use("/api", async (req, res) => {
  const url = `${req.protocol}://${req.get("host")}${req.originalUrl}`;
  const request = new Request(url, {
    method: req.method,
    headers: req.headers,
    ...(req.method !== "GET" && req.method !== "HEAD"
      ? { body: req, duplex: "half" }
      : {}),
  });
  const response = await api(request, { ip: req.socket.remoteAddress });
  res.status(response.status);
  response.headers.forEach((value, key) => res.setHeader(key, value));
  res.send(Buffer.from(await response.arrayBuffer()));
});
const vite = await createServer({
  server: { middlewareMode: true, allowedHosts: true },
  appType: "spa",
});
app.use(vite.middlewares);
app.listen(port, "0.0.0.0", () =>
  console.log(`WitchSearch ready at http://localhost:${port}`),
);
