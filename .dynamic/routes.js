const os = require('os')
const fs = require('fs')
const path = require('path')
const SMTPServer = require('smtp-server').SMTPServer

module.exports = app => {
  // We don’t have any custom routes. We’re just using this as a convenient
  // location to carry out one-time global initialisation for the
  // SMTP server.

  console.log('   🔵    ❨web0❩ Starting SMTP server.')

  const tlsCertificatePath = path.join(os.homedir(), '.small-tech.org', 'site.js', 'tls', 'global', 'production', os.hostname())
  const keyPath = path.join(tlsCertificatePath, 'certificate-identity.pem') // Secret key path.
  const certPath = path.join(tlsCertificatePath, 'certificate.pem')

  //
  // SMTP Server configuration.
  //

  const key = fs.readFileSync(keyPath)
  const cert = fs.readFileSync(certPath)
  // const secure = true
  const size = 51200
  const banner = 'Welcome to the web0 SMTP Server'
  const disabledCommands = ['AUTH']

  // There’s no reason for anyone to sign into our simple server.
  const onAuth = (auth, session, callback) => {
    callback(new Error("Authentication is not supported."))
  }

  const onRcptTo = (address, session, callback) => {
    // First check size.
    // TODO.

    // There’s only one account here.
    return address.address === 'computer@web0.small-web.org' ?
      callback() :
      callback(new Error("Address not found."))
  }

  const onData = (stream, session, callback) => {
    stream.pipe(process.stdout)
    stream.on('end', callback)
  }

  const server = new SMTPServer({
    size,
    // secure,
    disabledCommands,
    key,
    cert,
    onAuth,
    onRcptTo,
    onData
  })

  server.on('error', error => {
    // TODO: Handle errors better.
    console.error('[SMTP Server Error] ', error.message)
  })

  // Clean up the mail server when the main server is shutting down.
  app.site.server.on('close', async () => {
    console.log('   🔵    ❨web0❩ Main server shutdown detected, asking mail server to close.')
    server.close(() => {
      console.log('   🔵    ❨web0❩ Mail server closed.')
    })
  })

  server.listen(25)
}
