import express from "express";
import { refresh } from "./core/refresh.js";
import { getPersonasByIds } from "./core/api.js";

const app = express();
const port = 3000;

await refresh();

app.get("/", (req, res) => {
    res.send("server is running");
});

app.get("/getPersonasByIds", async (req, res) => {
    const response = await getPersonasByIds(req.query.pid);
    const data = await response.json();
    res.send(data);
});

app.listen(port, () => {
    console.log(`easy api server listening on port http://127.0.0.1:${port}`);
});
