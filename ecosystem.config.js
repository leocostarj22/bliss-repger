module.exports = {
  apps : [
    {
      name   : "bliss-queue",
      script : "artisan",
      interpreter: "php",
      args   : "queue:work --tries=3 --sleep=3 --max-time=3600",
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "1G",
      env: {
        APP_ENV: "production"
      }
    },
    {
      name   : "bliss-reverb",
      script : "artisan",
      interpreter: "php",
      args   : "reverb:start",
      instances: 1,
      autorestart: true,
      watch: false,
      env: {
        APP_ENV: "production"
      }
    }
  ]
}