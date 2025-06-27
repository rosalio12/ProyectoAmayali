const os = require("os")

function getAllIPs() {
  const interfaces = os.networkInterfaces()
  const ips = []

  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === "IPv4" && !iface.internal) {
        ips.push({
          iface: name,
          ip: iface.address,
          suggested_url: `http://${iface.address}:3000/api`,
        })
      }
    }
  }

  return ips
}

console.log("🔍 Buscando IPs disponibles...")
const ips = getAllIPs()

if (ips.length === 0) {
  console.log("❌ No se encontraron interfaces de red")
  console.log("💡 Usa http://localhost:3000/api para pruebas locales")
} else {
  console.log("📋 IPs encontradas:")
  ips.forEach((ip, index) => {
    console.log(`   ${index + 1}. ${ip.iface}: ${ip.ip}`)
    console.log(`      URL sugerida: ${ip.suggested_url}`)
  })

  console.log("\n🔧 Para React Native, actualiza apiService.js con:")
  console.log(`const API_BASE_URL = "${ips[0].suggested_url}"`)
}
