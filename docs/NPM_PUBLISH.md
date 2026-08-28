# NPM publish — stali-cli

## Yêu cầu

- Tài khoản npm với quyền publish package `stali-cli` (public)
- GitHub Actions secret `NPM_TOKEN` (Automation token hoặc Granular với publish)

## Cấu hình GitHub

1. npm → Access Tokens → Generate (Automation recommended)
2. GitHub repo `ngocvu/stali-cli` → Settings → Secrets → Actions
3. Thêm secret `NPM_TOKEN` = token vừa tạo

## Release flow

Tag `v*.*.*` push lên `main` kích hoạt `.github/workflows/release.yml`:

1. verify (test, build, e2e, npm pack)
2. build-standalone (5 platform binaries)
3. publish → `npm publish --provenance` + GitHub Release assets

Nếu thiếu `NPM_TOKEN`, workflow vẫn tạo GitHub Release nhưng **bỏ qua** npm publish (warning).

## Kiểm tra local

```bash
bun run build
bun scripts/verify-npm-pack.ts
npm pack --dry-run
```

Cài thử từ tarball:

```bash
npm install -g ./stali-cli-3.13.0.tgz --no-fund --no-audit
stali --version
```

## Cài production (khách)

```bash
npm install -g stali-cli --no-fund --no-audit
```

Hoặc pin version:

```bash
npm install -g stali-cli@3.15.0 --no-fund --no-audit
```

### dist-tag

- `latest` — stable (`3.15.0`, …)
- `beta` — prerelease (`3.16.0-beta.1`, `3.16.0-rc.1`, …)

```bash
npm install -g stali-cli@beta
```
