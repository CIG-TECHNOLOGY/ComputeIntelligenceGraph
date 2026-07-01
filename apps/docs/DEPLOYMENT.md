# Documentation Deployment

## Overview

The CIG Documentation is deployed to GitHub Pages at `/documentation` path as part of a unified deployment workflow that also includes the landing page.

## Deployment Architecture

```
GitHub Pages
├── Landing Page (root)
│   └── https://cig-technology.github.io/ComputeIntelligenceGraph/
└── Documentation (/documentation)
    └── https://cig-technology.github.io/ComputeIntelligenceGraph/documentation/
```

## Build Process

### Local Build

```bash
# Build documentation
pnpm --filter @cig/docs build

# Output directory
apps/docs/build/
```

### CI/CD Build

The GitHub Actions workflow automatically:

1. Detects changes to `apps/docs/**`
2. Installs dependencies
3. Builds documentation with `pnpm --filter @cig/docs build`
4. Copies output to `deploy/documentation/`
5. Deploys to GitHub Pages

## Deployment Triggers

Documentation is deployed when:

1. **Changes pushed to main** - If `apps/docs/**` changed
2. **Git tag created** - Always (v*.*.*)
3. **GitHub Release published** - Always
4. **Manual workflow dispatch** - Always

## Accessing Documentation

After deployment:

- **URL**: https://cig-technology.github.io/ComputeIntelligenceGraph/documentation/
- **Sections**: Getting Started, Architecture, API Reference, User Guide, Developer Guide, Troubleshooting, Resources

## Configuration

### Docusaurus Config

File: `apps/docs/docusaurus.config.ts`

Key settings:
- `url`: https://docs.cig.lat (for custom domain)
- `baseUrl`: / (served at root of docs subdirectory)
- `organizationName`: edwardcalderon
- `projectName`: ComputeIntelligenceGraph

### GitHub Pages Config

File: `.github/workflows/deploy-landing.yml`

Key settings:
- Docs output copied to `deploy/documentation/`
- Deployed as part of unified workflow
- Served at `/documentation` path

## Content Structure

```
apps/docs/
├── docs/
│   └── en/
│       ├── getting-started/
│       ├── architecture/
│       ├── api-reference/
│       ├── user-guide/
│       ├── developer-guide/
│       ├── troubleshooting/
│       ├── changelog/
│       └── faq/
├── src/
│   ├── components/
│   ├── css/
│   └── pages/
├── static/
│   └── img/
├── docusaurus.config.ts
├── sidebars.ts
└── package.json
```

## Local Development

### Start Dev Server

```bash
pnpm --filter @cig/docs dev
```

Server runs at: http://localhost:3000

### Build for Production

```bash
pnpm --filter @cig/docs build
```

Output: `apps/docs/build/`

### Serve Built Site

```bash
pnpm --filter @cig/docs serve
```

## Deployment Checklist

Before deploying documentation:

- [ ] All markdown files are valid
- [ ] All links are correct (internal and external)
- [ ] All images have alt text
- [ ] Code examples are tested
- [ ] Mermaid diagrams render correctly
- [ ] Search functionality works
- [ ] Responsive design tested on mobile
- [ ] Dark mode works correctly
- [ ] Accessibility standards met

## Troubleshooting

### Documentation Not Showing

1. Check GitHub Actions logs
2. Verify `apps/docs/build/` exists
3. Verify `deploy/documentation/` was created
4. Check GitHub Pages settings

### Broken Links

1. Run link validation: `pnpm --filter @cig/docs build`
2. Check console output for broken links
3. Fix links in markdown files
4. Rebuild and redeploy

### Stale Content

1. Clear browser cache
2. Hard refresh (Ctrl+F5 or Cmd+Shift+R)
3. Wait 5-10 minutes for CDN update
4. Check GitHub Pages deployment status

### Build Failures

1. Check GitHub Actions logs for errors
2. Run `pnpm install --frozen-lockfile` locally
3. Run `pnpm --filter @cig/docs build` locally
4. Fix any build errors
5. Push to main to redeploy

## Performance

The documentation is optimized for performance:

- **Static Generation**: All pages pre-rendered at build time
- **Code Splitting**: Automatic code splitting for faster loads
- **Image Optimization**: Automatic image compression
- **Caching**: Service worker support for offline access
- **Lighthouse Score**: 90+ on all metrics

## Security

The documentation deployment includes:

- **HTTPS**: All content served over HTTPS
- **Security Headers**: Content Security Policy and other headers
- **No Server-Side Code**: Static files only (no vulnerabilities)
- **Dependency Scanning**: npm audit in CI/CD pipeline

## Future Enhancements

Potential improvements:

1. **Multi-Language Support**: Full i18n with 7 languages
2. **GCloud CDN**: Optional CDN for faster global delivery
3. **Custom Domain**: docs.cig.lat with DNS configuration
4. **Analytics**: Track documentation usage
5. **Versioning**: Support multiple documentation versions
6. **Search Analytics**: Track popular search queries

## Related Documentation

- Deployment Guide: `.github/DEPLOYMENT_GUIDE.md`
- Quick Start: `.github/DEPLOYMENT_QUICK_START.md`
- Workflow: `.github/workflows/deploy-landing.yml`
- Docusaurus Docs: https://docusaurus.io/
