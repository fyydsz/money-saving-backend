module.exports = {
  apps: [
    {
      name: "vaultin-backend",
      script: "src/index.ts",
      interpreter: "bun",
      env: {
        NODE_ENV: "production",
        PORT: 8000,
        BETTER_AUTH_URL: "https://api.vaultin.web.id",
      },
      watch: false,
      max_memory_restart: "500M",
      restart_delay: 3000,
      autorestart: true,
      time: true,
    },
  ],
};
