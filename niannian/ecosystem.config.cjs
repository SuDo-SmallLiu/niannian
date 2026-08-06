const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env.local'), override: true });

module.exports = {
  apps: [
    {
      name: 'niannian',
      cwd: __dirname,
      script: 'npm',
      args: 'run start',
      env: {
        NODE_ENV: 'production',
        ...process.env,
      },
    },
  ],
};
