module.exports = name => ({
    base: "./src/plugins",
    out: "./Plugins/" + name,
    copyToBD: true,
    addInstallScript: true
});