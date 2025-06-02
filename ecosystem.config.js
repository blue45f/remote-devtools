module.exports = {
  apps: [
    {
      name: 'nest',

      script: `dist/apps/remote-platform-${process.env.APP}/main.js`,

      exec_mode: 'fork',
      instances: 1,

      merge_logs: true,
      error_file: '/app/logs/stderr.log',
      out_file: '/app/logs/stdout.log',
    },
  ],
}
