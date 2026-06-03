const express = require("express");
const app = express();
const http = require("http");
const bodyParser = require("body-parser");
const routes = require("./routes");
const cors = require("cors");
const { corsConfig } = require("./constant/index");
require("dotenv").config();
const mode = process.env.MODE;
const server = http.createServer(app);
const swaggerJsdoc = require("swagger-jsdoc");
const swaggerUi = require("swagger-ui-express");

const { RedisManager } = require("./connection/redis/index");
const ClickhouseManager = require("./connection/clickhouse/db");
const registerAllSubscribers = require("./utils/pubsub/registerSubscribers");

const { DBManager, ModelsInitializer } = require("./connection/db/index");
const models = require("./models");
let portNumber = process.env.APP_PORT || 3000;
const swaggerUrl =
  portNumber == 3000
    ? `http://localhost:${portNumber}`
    : process.env.BACKEND_URL;

// Swagger definition
const swaggerDefinition = {
  openapi: "3.0.0",
  info: {
    title: "Ads Share",
    version: "1.0.0",
    description: "Ads Share Backend Application",
  },
  servers: [
    {
      url: swaggerUrl,
      description: "Swagger OpenAPI Document",
    },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
      },
    },
  },
};

// Options for the swagger docs
const options = {
  swaggerDefinition,
  apis: [
    "./modules/user/routes.js",
    "./modules/userConfig/routes.js",
    "./modules/media/routes.js",
    "./modules/campaign/routes.js",
    "./modules/organization/routes.js"
  ],
};

// Initialize swagger-jsdoc
const swaggerSpec = swaggerJsdoc(options);

// Middleware
app.use(
  cors({
    origin: corsConfig.ALLOWED_ORIGIN,
    methods: corsConfig.ALLOWED_REQUEST_TYPES,
    allowedHeaders: corsConfig.ALLOWED_HEADERS,
  }),
);

app.use(bodyParser.json({ limit: "5mb" }));
app.use(bodyParser.urlencoded({ extended: true, limit: "50mb" }));
app.use("/api/v1", routes);

// Use swagger-ui-express for your app documentation endpoint
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

async function initializeApp() {
  try {
    await DBManager.connect();
    await RedisManager.connect();
    await ClickhouseManager.connect();
    ModelsInitializer.setModels(models);
    registerAllSubscribers();

    server.listen(portNumber, () => {
      console.log("Server is running on port " + portNumber);
    });
  } catch (error) {
    console.error("Failed to start server due to initialization error:", error);
    process.exit(1); // Exit process with failure
  }
}

initializeApp();
