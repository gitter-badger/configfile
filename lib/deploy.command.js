const path = require('path')
const fs = require('fs')

const { readFile, fileExist } = require('./fs.utils')
const { log } = require('./log.utils')

module.exports = exports = configFilename => {
  return (modules, options) => {
    if (!fileExist(configFilename)) {
      log({ type: 'error', message: 'No configuration file. You need to run the init command before.' })
      return
    }

    readFile(configFilename)
      .then(data => JSON.parse(data).folder_path)
      .then(processModuleData(modules))
      .then(files => {
        const dirs = files
          .map(file => path.dirname(file.to))
          .filter(dir => !fileExist(dir))

        return dirs
      })
      .then(data => console.log(JSON.stringify(data, null, 2)))
  }
}

function processModuleData(moduleNames) {
  return folderPath => {
    return moduleNames
      .map(name => {
        const addr = path.join(folderPath, 'files', name)
        const file = fs.readFileSync(path.join(addr, 'settings.json'))

        let settings = []
        try {
          settings = JSON.parse(file)
        } catch(e) {
          log({ type: 'warn', message: `Not able to load settings file for "${name}" module.` })
        }

        return { name, folder: addr, settings }
      })
      .filter(moduleConf => moduleConf.settings.length > 0)
      .map(moduleConf => {
        return moduleConf.settings
          .filter(file => file.global)
          .map(file => ({
            from: path.resolve(moduleConf.folder, file.filename),
            to: path.resolve(file['target-path'].replace('~', process.env.HOME))
          }))
      })
      .reduce((files, modules) => {
        for (const file of modules) {
          files.push(file)
        }

        return files
      }, [])
  }
}