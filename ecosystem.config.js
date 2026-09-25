module.exports = {
  apps: [
    {
      name: "thinkmtb-order",
      script: "npm",
      args: "run start",
      instances: 1,
      exec_mode: "fork",
      cwd: "/opt/thinkmtb-order",
      autorestart: true,
      watch: false,
      max_memory_restart: "500M",
      restart_delay: 3000,
      max_restarts: 10,
      env: {
        NODE_ENV: "production",
        PORT: 3000,
        FORCE_DB_INIT: "true",
        DATABASE_URL: "postgresql://thinkmtb:postgres123@localhost:5432/thinkmtb_order",
        DB_TYPE: "postgresql",
      },
    },
  ],
};
