module.exports = {
  apps: [
    {
      name: "thinkmtb-order",
      script: "npm",
      args: "run start",
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "500M",
      restart_delay: 3000,
      max_restarts: 10,
      env: {
        NODE_ENV: "production",
        PORT: 3000,
      },
    },
  ],
};
