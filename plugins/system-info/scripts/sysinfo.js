import os from 'os';

const args = process.argv.slice(2);
const type = args[0] || 'all';

const getCpuInfo = () => {
  const cpus = os.cpus();
  const load = os.loadavg();
  return {
    model: cpus[0].model,
    cores: cpus.length,
    load_1m: load[0].toFixed(2),
    load_5m: load[1].toFixed(2),
    load_15m: load[2].toFixed(2),
  };
};

const getMemInfo = () => {
  const total = (os.totalmem() / 1024 / 1024 / 1024).toFixed(2);
  const free = (os.freemem() / 1024 / 1024 / 1024).toFixed(2);
  const used = (total - free).toFixed(2);
  return {
    total_gb: total,
    free_gb: free,
    used_gb: used,
    percent_used: Math.round((used / total) * 100) + '%',
  };
};

const getOsInfo = () => {
  return {
    platform: os.platform(),
    release: os.release(),
    type: os.type(),
    hostname: os.hostname(),
    arch: os.arch(),
  };
};

const getUptime = () => {
  const uptime = os.uptime();
  const hours = Math.floor(uptime / 3600);
  const minutes = Math.floor((uptime % 3600) / 60);
  return `${hours}h ${minutes}m`;
};

const data = {};

if (type === 'cpu' || type === 'all') data.cpu = getCpuInfo();
if (type === 'memory' || type === 'all') data.memory = getMemInfo();
if (type === 'os' || type === 'all') data.os = getOsInfo();
if (type === 'uptime' || type === 'all') data.uptime = getUptime();

console.log(JSON.stringify(data, null, 2));
