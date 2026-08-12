const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '.env.local'), override: true });

const meloVenvPython = path.join(__dirname, 'services/narration/.venv/bin/python3');
const meloPython = fs.existsSync(meloVenvPython) ? meloVenvPython : process.env.MELO_PYTHON;

const sharedEnv = {
  NODE_ENV: 'production',
  HF_ENDPOINT: process.env.HF_ENDPOINT || 'https://hf-mirror.com',
  NUMBA_CACHE_DIR: path.join(__dirname, '.cache', 'numba'),
  ...(meloPython ? { MELO_PYTHON: meloPython } : {}),
  ...process.env,
};

/** 双进程模式：Web 禁内置 Worker，由 niannian-worker 消费队列 */
const dualProcess = process.env.NIANNIAN_DUAL_PROCESS === '1';

const apps = [
  {
    name: 'niannian',
    cwd: __dirname,
    script: 'npm',
    args: 'run start',
    env: {
      ...sharedEnv,
      ...(dualProcess ? { NIANNIAN_DISABLE_JOB_WORKER: '1' } : {}),
    },
  },
];

if (dualProcess) {
  apps.push({
    name: 'niannian-worker',
    cwd: __dirname,
    script: 'npm',
    args: 'run worker',
    env: sharedEnv,
    autorestart: true,
  });
}

module.exports = { apps };
