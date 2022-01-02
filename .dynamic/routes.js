const os = require('os')
const fs = require('fs')
const path = require('path')
const SMTPServer = require('smtp-server').SMTPServer
const simpleParser = require('mailparser').simpleParser
const sendMail = require('./sendMail')

const redirectToError = require('./redirectToError')

const crypto = require('crypto')

const header = require('./header-template')
const footer = require('./footer-template')

// Create a cryptographically-secure path for the admin route
// and save it in a table called admin in the built-in JSDB database.
if (db.admin === undefined) {
  db.admin = {}
  db.admin.route = crypto.randomBytes(16).toString('hex')
}

module.exports = app => {
  // This is where we define the secret admin route and carry out one-time
  // global initialisation for the SMTP server.

  // Add admin route using cryptographically-secure secret path.
  app.get(`/admin/${db.admin.route}`, (request, response) => {

    const signatories = []
    let signatoryCount = 0
    db.confirmedSignatories.forEach(signatory => {
      signatoryCount++
      signatories.push(
        `<tr>
          <td>${signatoryCount}</td>
          <td>${signatory.signatory.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</td>
          <td><a href='${signatory.link}'>${signatory.link}</a></td>
          <td>${signatory.name}</td>
          <td><a href='mailto: ${signatory.email}'>${signatory.email}</a></td>
          <td><a class='deleteLink' href='/admin/${db.admin.route}/confirm-delete/${signatory.id}' nofollow>❌</a></td>
        </tr>`
      )
    })

    response.html(`
      ${header()}
      <h2>Admin page</h2>
      <p>📈 <a href='https://${app.site.prettyLocation()}${app.site.stats.route}'>Site statistics</a></p>
      <h3>Signatories</h3>
      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>Signatory</th>
            <th>Link</th>
            <th>Name</th>
            <th>Email</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          ${signatories.join('\n')}
        </tbody>
      </table>
      ${footer()}
    `)
  })

  function findSignatoryWithId (id) {
    let _index = null
    const signatory = db.confirmedSignatories.find((value, index) => {
      if (value) {
        if (value.id === id) {
          _index = index
          return true
        }
      }
    })
    return [signatory, _index]
  }

  // Add GET route to confirm deletion of signatory.
  app.get(`/admin/${db.admin.route}/confirm-delete/:id`, (request, response) => {

    const id = request.params.id
    const [signatory] = findSignatoryWithId(id)

    response.html(`
      ${header()}
      <h2>Admin page</h2>
      <p>📈 <a href='https://${app.site.prettyLocation()}${app.site.stats.route}'>Site statistics</a></p>
      <h3>Signatories</h3>
      <p><strong>💀 Do you really want to delete the following signatory?</strong></p>
      <form method='POST' action='/admin/${db.admin.route}/delete/${id}' class='deleteConfirmation'>
        <ul class='signatoryDetails'>
          <li><strong>Signatory</strong> ${signatory.signatory.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</li>
          <li><strong>Link</strong> ${signatory.link}</li>
          <li><strong>Name</strong> ${signatory.name}</li>
          <li><strong>Email</strong> ${signatory.email}</li>
        </ul>
        <input type='hidden' name='id' value='${id}'></input>
        <input type='submit' value='💀 Delete'></input>
      </form>
      ${footer()}
    `)
  })

  // Add POST route to actually delete signatory.
  app.post(`/admin/${db.admin.route}/delete/:id`, (request, response) => {
    const id = request.body.id

    if (id == undefined) {
      return redirectToError(response, 'Nothing to delete.')
    }

    const [signatory, index] = findSignatoryWithId(id)

    if (index === null) {
      return redirectToError(response, 'Signatory not found.')
    }

    delete db.confirmedSignatories[index]

    response.html(`
      ${header()}
      <h2>Admin page</h2>
      <p>📈 <a href='https://${app.site.prettyLocation()}${app.site.stats.route}'>Site statistics</a></p>
      <h3>Signatories</h3>
      <p>Signatory ${signatory.signatory.replace(/</g, '&lt;').replace(/>/g, '&gt;')} (${signatory.link}) submitted by ${signatory.name} (${signatory.email}) has been deleted.</p>
      <p><a href='/admin/${db.admin.route}/'>Back to signatory list</a></p>
      ${footer()}
    `)
  })

  // Output admin path to logs so we know what it is.
  // (If someone has ssh access to our server to see this all is already lost anyway.)
  console.log(`   🔑️    ❨web0❩ Admin page is at /admin/${db.admin.route}`)

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

  const getNameFromAddressObject = addressObject => {
    let name = ''
    if (addressObject.name != undefined) {
      const names = addressObject.name.split(' ')
      name = ` ${names.length > 0 ? names[0] : addressObject.name}`
    }
    return name
  }

  const forwardEmailWithSessionIdToHumans = (message, envelope) => {

    // Sanity check. Ensure the mail envelope is correct before continuing.
    if (envelope == undefined || envelope.mailFrom == undefined || envelope.rcptTo == undefined || envelope.rcptTo.length === 0) {
      return console.error('Cannot forward email. Message envelope is wrong.', envelope)
    }

    const fromAddress = envelope.mailFrom.address
    const toAddress = envelope.rcptTo[0].address

    const fromName = message.from == undefined ? '' : getNameFromAddressObject(message.from)
    const toName = message.to == undefined ? '' : getNameFromAddressObject(message.to)

    const subject = message.subject == undefined ? '(no subject)' : message.subject

    const ccHeader = message.cc == undefined ? '' : `\n> CC: ${message.cc}`
    const messageDateHeader = message.date == undefined ? '' : `\n> Date: ${message.date}`

    const text = `Hello${fromName},

Thanks for writing in.

I’m CCing Laura and Aral at Small Technology Foundation so you can talk to a human being.

Lots of love,
Computer @ web0.small-web.org

> From:${fromName} <${fromAddress}>
> To:${toName} ${toAddress}${ccHeader}${messageDateHeader}
> Subject: ${subject}
>
${message.text.split('\n').map(line => `> ${line}`).join('\n')}
`
    try {
      sendMail(/* to */ fromAddress, `FWD: ${subject}`, text, 'hello+web0@small-tech.org')
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

    // Save the envelope here because it will have changed by the
    // time we get past the async await of the parser.
    const envelope = session.envelope

    // Persist session in local memory.
    let message
    try {
      message =  await simpleParser(stream)
    } catch (error) {
      console.error(error)
      return callback(error)
    }

    console.log('message', message)

    // Acknowledge that we’ve received the message.
    callback()

    forwardEmailWithSessionIdToHumans(message, envelope)
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
