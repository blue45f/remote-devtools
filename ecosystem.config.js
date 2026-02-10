module.exports = {
  apps: [
    {
      name: 'nest',

      // APP env var must be set to 'internal' or 'external'
      script: `dist/apps/remote-platform-${process.env.APP}/main.js`,

      exec_mode: 'fork',
      instances: 1,
      max_memory_restart: '512M',

      // Restart policies
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',
      restart_delay: 5000,

      // Disable file watching in production
      watch: false,

      // Logging
      merge_logs: true,
      error_file: '/app/logs/stderr.log',
      out_file: '/app/logs/stdout.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',

      // Environment
      env: {
        NODE_ENV: 'production',
      },
    },
  ],
};
