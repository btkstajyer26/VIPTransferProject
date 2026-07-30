const fs = require('fs');
const os = require('os');
const path = require('path');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const ENV_PATH = path.join(PROJECT_ROOT, '.env');
const API_PORT = 8080;

function isUsableIPv4(address) {
  return (
    address.family === 'IPv4' &&
    !address.internal &&
    !address.address.startsWith('169.254.') &&
    !address.address.startsWith('172.21.') &&
    !address.address.startsWith('172.22.') &&
    !address.address.startsWith('192.168.56.')
  );
}

function findLanIp() {
  const interfaces = os.networkInterfaces();

  // Önce gerçek Wi-Fi adaptörlerini tercih et
  const preferredNames = Object.keys(interfaces).filter((name) =>
    /wi-?fi|wireless|wlan/i.test(name),
  );

  for (const name of preferredNames) {
    const address = interfaces[name]?.find(isUsableIPv4);

    if (address) {
      return address.address;
    }
  }

  // Wi-Fi adı bulunamazsa kullanılabilir özel ağ adresini ara
  for (const addresses of Object.values(interfaces)) {
    const address = addresses?.find(
      (item) =>
        isUsableIPv4(item) &&
        (item.address.startsWith('192.168.') ||
          item.address.startsWith('10.') ||
          /^172\.(1[6-9]|2\d|3[01])\./.test(item.address)),
    );

    if (address) {
      return address.address;
    }
  }

  return null;
}

function updateEnv() {
  const lanIp = findLanIp();

  if (!lanIp) {
    console.error(
      'Aktif LAN/Wi-Fi IPv4 adresi bulunamadı. Ağ bağlantısını kontrol edin.',
    );
    process.exit(1);
  }

  const apiUrl = `http://${lanIp}:${API_PORT}`;
  const key = 'EXPO_PUBLIC_API_BASE_URL';

  let envContent = fs.existsSync(ENV_PATH)
    ? fs.readFileSync(ENV_PATH, 'utf8')
    : '';

  const lineRegex = new RegExp(`^${key}=.*$`, 'm');

  if (lineRegex.test(envContent)) {
    envContent = envContent.replace(lineRegex, `${key}=${apiUrl}`);
  } else {
    envContent = `${envContent.trim()}\n${key}=${apiUrl}\n`.trimStart();
  }

  fs.writeFileSync(ENV_PATH, envContent, 'utf8');

  console.log(`API adresi güncellendi: ${apiUrl}`);
}

updateEnv();