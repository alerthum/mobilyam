/**
 * Smoke test: verify token migration + public verify API.
 * Çalıştırma: node scripts/test-member-qr-api.js
 * Önkoşul: npm start veya dev:api (PORT 4175)
 */
const BASE = process.env.API_BASE || "http://127.0.0.1:4175";

async function main() {
  const loginRes = await fetch(`${BASE}/api/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: "mobilyaci", password: "mob2026" })
  });
  const login = await loginRes.json();
  if (!login.token) {
    console.error("Login failed", login);
    process.exit(1);
  }
  const user = (login.data?.users || [])[0];
  if (!user?.verifyToken) {
    console.error("verifyToken missing on user after login");
    process.exit(1);
  }
  console.log("OK verifyToken:", user.verifyToken.slice(0, 12) + "…");

  const verifyRes = await fetch(
    `${BASE}/api/verify/${encodeURIComponent(user.verifyToken)}`
  );
  const verify = await verifyRes.json();
  if (!verifyRes.ok || !verify.member?.statusLabel) {
    console.error("Verify API failed", verify);
    process.exit(1);
  }
  console.log("OK public verify:", verify.member.statusLabel, verify.member.company || verify.member.fullName);
  console.log("All checks passed.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
