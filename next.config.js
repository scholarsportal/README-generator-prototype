/** @type {import('next').NextConfig} */

// Two builds come out of this one config.
//
//   NEXT_PUBLIC_DEMO unset  → the external tool. Server-rendered, API routes
//                             live, deployed as now. Nothing below applies.
//   NEXT_PUBLIC_DEMO=1      → the static demo for GitHub Pages.
//
// Pages serves a project site from /<repo>/, so basePath has to match the
// repository name or every asset 404s. Set NEXT_PUBLIC_BASE_PATH to '' if the
// site ever moves to a custom domain or a <user>.github.io repository, both of
// which serve from the root.
//
// Static export cannot build while app/api/ exists: those route handlers read
// request.url, so Next treats them as dynamic and refuses to export them. The
// Pages workflow deletes that directory in its own checkout before building —
// see .github/workflows/pages.yml. Nothing in the repository changes.

const demo = process.env.NEXT_PUBLIC_DEMO === '1'
const basePath =
  process.env.NEXT_PUBLIC_BASE_PATH !== undefined
    ? process.env.NEXT_PUBLIC_BASE_PATH
    : '/README-generator-prototype'

// Swap the fixtures for a stub in the external-tool build. import() makes
// webpack emit a chunk before it eliminates the dead branch, so without this
// the sample dataset ships (unused, never downloaded, but present) in the
// production deployment.
const replaceFixtures = {
  webpack(config, { webpack }) {
    if (!demo) {
      config.plugins.push(
        new webpack.NormalModuleReplacementPlugin(
          /lib[\\/]demo[\\/]fixtures$|[.][/]demo[/]fixtures$/,
          require('path').resolve(__dirname, 'lib/demo/fixtures.stub.ts')
        )
      )
    }
    return config
  },
}

const nextConfig = demo
  ? {
      output: 'export',
      basePath,
      // Without this, next/image needs the optimizer, which needs a server.
      images: { unoptimized: true },
      // Pages serves /path/ as /path/index.html; without trailing slashes a
      // deep link can 404.
      trailingSlash: true,
    }
  : replaceFixtures

module.exports = nextConfig
