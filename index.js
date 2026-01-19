import express from "express";
import rateLimit from "express-rate-limit";
import compression from "compression";
import cors from "cors";
import path from "path";
import bodyParser from "body-parser";
import fs from "fs";
import { fileURLToPath } from "url";

const app = express();

/* __dirname fix (ESM için) */
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/* MIDDLEWARE */
app.use(
  compression({
    level: 5,
    threshold: 0,
    filter: (req, res) => {
      if (req.headers["x-no-compression"]) return false;
      return compression.filter(req, res);
    },
  })
);

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json());
app.use(cors());

app.set("trust proxy", 1);

app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
  })
);

/* LOGGER */
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

/* ROUTES */

app.all("/player/login/dashboard", (req, res) => {
  const tData = {};

  try {
    const uData = JSON.stringify(req.body).split('"')[1].split("\\n");

    for (const line of uData) {
      const d = line.split("|");
      if (d[0] && d[1]) tData[d[0]] = d[1];
    }
  } catch (err) {
    console.error(err);
  }

  const htmlPath = path.join(__dirname, "public", "dashboard.html");
  const html = fs.readFileSync(htmlPath, "utf8");

  res.send(
    html.replace("{{ data._token }}", JSON.stringify(tData))
  );
});

app.all("/player/growid/login/validate", (req, res) => {
  try {
    const { _token, growId, password } = req.body;

    const token = Buffer.from(
      `_token=${_token}&growId=${growId}&password=${password}`
    ).toString("base64");

    res.json({
      status: "success",
      message: "Account Validated.",
      token,
      url: "",
      accountType: "growtopia",
    });
  } catch {
    res.status(400).json({
      status: "error",
      message: "Account not valid.",
      token: "",
      accountType: "growtopia",
    });
  }
});

app.post("/player/growid/checkToken", (req, res) => {
  try {
    const { refreshToken, clientData } = req.body;
    if (!refreshToken || !clientData)
      return res.status(400).json({ status: "error" });

    const decoded = Buffer.from(refreshToken, "base64").toString("utf8");

    const token = Buffer.from(
      decoded.replace(
        /(_token=)[^&]*/,
        `$1${Buffer.from(clientData).toString("base64")}`
      )
    ).toString("base64");

    res.json({
      status: "success",
      message: "Token is valid.",
      token,
      url: "",
      accountType: "growtopia",
    });
  } catch {
    res.status(500).json({ status: "error" });
  }
});

app.get("/", (req, res) => {
  res.send("Connected!");
});

/* 🚨 SERVERLESS EXPORT (listen YOK) */
export default app;
