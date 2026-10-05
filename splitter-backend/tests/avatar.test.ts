import { test } from "node:test";
import assert from "node:assert/strict";
import { resolveAvatarUrl, avatarKeyFromStored, publicBaseUrl } from "../src/utils/avatar.js";
import { detectImageType } from "../src/utils/imageType.js";

const req = (host = "192.168.1.7:3001", protocol = "http") => ({ protocol, get: (h: string) => (h === "host" ? host : undefined) }) as any;

test("relative stored paths resolve against the request origin", () => {
  assert.equal(resolveAvatarUrl("/static/avatars/1/v1/avatar.jpg", req()), "http://192.168.1.7:3001/static/avatars/1/v1/avatar.jpg");
});

test("legacy localhost / LAN absolute URLs are rebased so phones can load them", () => {
  assert.equal(
    resolveAvatarUrl("http://localhost:3001/static/avatars/1/v1/avatar.png", req("10.0.0.5:3001")),
    "http://10.0.0.5:3001/static/avatars/1/v1/avatar.png"
  );
  assert.equal(
    resolveAvatarUrl("http://192.168.0.9:3001/static/avatars/1/v1/avatar.png", req("api.example.com", "https")),
    "https://api.example.com/static/avatars/1/v1/avatar.png"
  );
});

test("CDN URLs and empty values", () => {
  assert.equal(resolveAvatarUrl("https://cdn.example.com/avatars/1/v1/avatar.webp", req()), "https://cdn.example.com/avatars/1/v1/avatar.webp");
  assert.equal(resolveAvatarUrl(null, req()), null);
  assert.equal(resolveAvatarUrl("   ", req()), null);
  assert.equal(resolveAvatarUrl("not a url", req()), null);
});

test("PUBLIC_BASE_URL wins over the request", () => {
  process.env.PUBLIC_BASE_URL = "https://api.example.com/";
  assert.equal(publicBaseUrl(req()), "https://api.example.com");
  delete process.env.PUBLIC_BASE_URL;
});

test("avatarKeyFromStored extracts our keys only", () => {
  assert.equal(avatarKeyFromStored("/static/avatars/12/v99/avatar.jpg"), "avatars/12/v99/avatar.jpg");
  assert.equal(avatarKeyFromStored("https://cdn.x.com/avatars/12/v99/avatar.webp"), "avatars/12/v99/avatar.webp");
  assert.equal(avatarKeyFromStored("https://placehold.co/128x128?text=Avatar"), null);
  assert.equal(avatarKeyFromStored(null), null);
});

test("detectImageType uses magic bytes", () => {
  assert.equal(detectImageType(Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0]))?.mime, "image/jpeg");
  assert.equal(detectImageType(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0]))?.ext, ".png");
  assert.equal(detectImageType(Buffer.from("RIFF\0\0\0\0WEBPVP8 "))?.mime, "image/webp");
  assert.equal(detectImageType(Buffer.from("GIF89a...."))?.mime, "image/gif");
  assert.equal(detectImageType(Buffer.from("ftypheic....")), null); // HEIC is not accepted by the server
  assert.equal(detectImageType(Buffer.from("<script>alert(1)</script>")), null);
});
