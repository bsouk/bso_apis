const path = require("path");

const appDir = __dirname;

module.exports = {
  apps: [
    {
      name: "bso_apis",
      script: path.join(appDir, "server.js"),
      cwd: appDir,
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      watch: false,
      max_restarts: 20,
      min_uptime: "10s",
      restart_delay: 5000,
      max_memory_restart: "1G",
      merge_logs: true,
      time: true,
      out_file: path.join(appDir, "logs/pm2-out.log"),
      error_file: path.join(appDir, "logs/pm2-error.log"),
      env: {
        NODE_ENV: "production",
      },
    },
  ],
};
