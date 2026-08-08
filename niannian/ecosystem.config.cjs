const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '.env.local'), override: true });

const meloVenvPython = path.join(__dirname, 'services/narration/.venv/bin/python3');
const meloPython = fs.existsSync(meloVenvPython) ? meloVenvPython : process.env.MELO_PYTHON;

module.exports = {
  apps: [
    {
      name: 'niannian',
      cwd: __dirname,
      script: 'npm',
      args: 'run start',
      env: {
        NODE_ENV: 'production',
        HF_ENDPOINT: process.env.HF_ENDPOINT || 'https://hf-mirror.com',
        NUMBA_CACHE_DIR: path.join(__dirname, '.cache', 'numba'),
        ...(meloPython ? { MELO_PYTHON: meloPython } : {}),
        ...process.env,
      },
    },
  ],
};
