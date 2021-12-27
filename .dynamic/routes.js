const os = require('os')
const fs = require('fs')
const path = require('path')
const SMTPServer = require('smtp-server').SMTPServer
const simpleParser = require('mailparser').simpleParser
const sendMail = require('./sendMail')

module.exports = app => {
  // We don’t have any custom routes. We’re just using this as a convenient
  // location to carry out one-time global initialisation for the
  // SMTP server.

  console.log('   📬    ❨web0❩ Starting SMTP server.')

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

  const forwardEmailWithSessionIdToHumans = message => {
    const text = `Hello ${message.from.value[0].name.split(' ')[0]},

Thanks for writing in.

I’m CCing Laura and Aral at Small Technology Foundation so you can talk to a human being.

Lots of love,
Computer @ web0.small-web.org

> From: ${message.from.value[0].name} <${message.from.value[0].address}>
> To: ${message.to.value[0].address}${message.cc != undefined ? `\n> CC: ${message.cc}` : ''}
> Sent: ${message.date}
>
${message.text.split('\n').map(line => `> ${line}`).join('\n')}
`
    try {
      sendMail(message.from.value[0].address, `FWD: ${message.subject}`, text, 'hello@small-tech.org')
    } catch (error) {
      console.error(error)
    }
  }

  const onConnect = (session, callback) => {
    console.log('   📬    ❨web0❩ Starting new session with email client.')
    console.log(session)

    // Always accept the connection.
    callback()
  }

  const onMailFrom = (address, session, callback) => {
    console.log('   📬    ❨web0❩ Got mail from command.')
    console.log('address', address)
    console.log('session', session)

    // Accept all addresses that pass Nodemailer’s own cursory tests.
    callback ()
  }

  const onRcptTo = (address, session, callback) => {
    // First check size.
    // TODO.
    console.log('   📬    ❨web0❩ Got rcpt to command.')

    // There’s only one account here.
    return address.address === 'computer@web0.small-web.org' ?
      callback() :
      callback(new Error("Address not found."))
  }

  // Called when a readable stream is available for the email.
  const onData = async (stream, session, callback) => {

    console.log('onData: session =', session)

    const sessionId = session.id

    // Persist session in local memory.
    let message
    try {
      message =  await simpleParser(stream)
    } catch (error) {
      return console.error(error)
    }

    forwardEmailWithSessionIdToHumans(message)
  }

  const onClose = session => {
    console.log('   📬    ❨web0❩ Email client closed (got quit command).')
    console.log('session', session)
  }

  const server = new SMTPServer({
    banner,
    disabledCommands,
    cert,
    key,
    size,
    onConnect,
    onMailFrom,
    onRcptTo,
    onData,
    onClose
  })

  server.on('error', error => {
    // TODO: Handle errors better.
    console.error('[SMTP Server Error] ', error.message)
  })

  // Clean up the mail server when the main server is shutting down.
  app.site.server.on('close', async () => {
    console.log('   📬    ❨web0❩ Main server shutdown detected, asking mail server to close.')
    server.close(() => {
      console.log('   📬    ❨web0❩ Mail server closed.')
    })
  })

  server.listen(25)
}
