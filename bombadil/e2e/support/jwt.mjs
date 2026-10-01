import { createHmac } from "node:crypto";
const b64u = (s) => Buffer.from(s).toString("base64url");
const [secret, role] = process.argv.slice(2);
const h = b64u(JSON.stringify({ alg: "HS256", typ: "JWT" }));
const p = b64u(JSON.stringify({ role, iss: "e2e", exp: Math.floor(Date.now() / 1000) + 86400 * 30 }));
console.log(`${h}.${p}.${createHmac("sha256", secret).update(`${h}.${p}`).digest("base64url")}`);
