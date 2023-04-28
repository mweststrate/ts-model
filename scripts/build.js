const fs = require("fs-extra")
const execa = require("execa")
const minimist = require("minimist")

const stdio = ["ignore", "inherit", "pipe"]
const opts = { stdio }

const {
    _: [packageName],
    target
} = minimist(process.argv.slice(2))

// build to publish needs to do more things so it's slower
// for the CI run and local testing this is not necessary
const isPublish = target === "publish"

// for running tests in CI we need CJS only
const isTest = target === "test"

const esmExtension = packageName === "mobx" ? ".mjs" : ".js"

const run = async () => {
    // TSDX converts passed name argument to lowercase for file name
    const pkgPrefix = `${packageName.toLowerCase()}.`

    const tempMove = name => fs.move(`dist/${pkgPrefix}${name}`, `temp/${pkgPrefix}${name}`)
    const moveTemp = name => fs.move(`temp/${pkgPrefix}${name}`, `dist/${pkgPrefix}${name}`)

    const build = (format, env) => {
        const args = ["build", "--name", packageName, "--format", format]
        if (env) {
            args.push("--env", env)
        }
        return execa("tsdx", args, opts)
    }

    if (isPublish) {
        await fs.emptyDir("temp")
        // build dev/prod ESM bundles that can be consumed in browser without NODE_ENV annoyance
        // and these builds cannot be run in parallel because tsdx doesn't allow to change target dir
        await build("esm", "development")
        // tsdx will purge dist folder, so it's necessary to move these
        await tempMove(`esm.development${esmExtension}`)
        await tempMove(`esm.development${esmExtension}.map`)

        // cannot build these concurrently
        await build("esm", "production")
        await tempMove(`esm.production.min${esmExtension}`)
        await tempMove(`esm.production.min${esmExtension}.map`)
    }

    await build(isTest ? "cjs" : "esm,cjs,umd").catch(err => {
        throw new Error(`build failed: ${err.stderr}`)
    })

    if (isPublish) {
        // move ESM bundles back to dist folder and remove temp
        await moveTemp(`esm.development${esmExtension}`)
        await moveTemp(`esm.development${esmExtension}.map`)
        await moveTemp(`esm.production.min${esmExtension}`)
        await moveTemp(`esm.production.min${esmExtension}.map`)
        await fs.remove("temp")
    }
}

run().catch(err => {
    console.error(err)
    process.exit(1)
})
