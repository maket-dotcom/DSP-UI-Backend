module.exports = {
  apps: [
    {
      name: "backend-prod",
      script: "./index.js",
      exec_mode: "fork",
      interpreter: "node@21.7.2",
      env: {
        NODE_ENV: "prod"
      }
    }
  ]
};
