const path = require('path')

const { readFile, fileExist, chmod } = require('./fs.utils')
const { execFile } = require('./process.utils')
const { log } = require('./log.utils')

module.exports = exports = configFilename => {
  return (scriptName, options) => {
    if (!fileExist(configFilename)) {
      log({ type: 'error', message: 'No configuration file. You need to run the init command before.' })
      return
    }

    readFile(configFilename)
      .then(data => JSON.parse(data).folder_path)
      .then(folderPath => {
        const extentions = ['.js', '.sh', '']
        for (const ext of extentions) {
          const scriptPath = path.join(folderPath, 'scripts', scriptName + ext)
          if (fileExist(scriptPath)) {
            return scriptPath
          }
        }
        
        throw new Error('script_not_exist')
      })
      .then(scriptPath => chmod(scriptPath, '0700').then(() => scriptPath))
      .then(scriptPath => {
        log({ type: 'info', message: `Running "${scriptName}" script.` })

        const child = execFile(scriptPath)
        child.stdout.on('data', data => {
          log({ message: data.trim() })
        })
        child.stderr.on('data', data => {
          log({ type: 'error', message: data.trim(), prefix: '' })
        })

        return child.toPromise()
      })
      .then(
        () => log({ type: 'success', message: `"${scriptName}" script execution is finished.` }), 
        error => {
          if (error.code === 'EACCES') {
            throw new Error('script_no_permission')
          }
          
          throw error
        }
      )
      .catch(error => {
        switch (error.message) {
          case 'script_not_exist':
            log({ type: 'error', message: `Script "${scriptName}" doesn't exist.` })
            break
          case 'script_no_permission':
            log({ type: 'error', message: `Bad permission on "${scriptName}" script.`, prefix: ' Fail ' })
            break
          default:
            log({ type: 'error', message: 'An error occured.', prefix: ' Fail ' })
        }
      })
  }
}
