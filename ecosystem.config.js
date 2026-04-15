module.exports = {
  apps: [
    {
      name: "bso_apis",
      script: "server.js",
      autorestart: true,
      restart_delay: 20000,
      max_restarts: 50,
      min_uptime: "10s",
      exp_backoff_restart_delay: 20000,
      env: {
        NODE_ENV: "production",
      },
    },
  ],
};
