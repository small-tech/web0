const crypto = require('crypto')
const sendMail = require('../sendMail')
const redirectToError = require('../redirectToError')

const headerTemplate = `
  <!DOCTYPE html>
  <html lang='en'>
  <head>
    <meta charset='UTF-8'>
    <meta http-equiv='X-UA-Compatible' content='IE=edge'>
    <meta name='viewport' content='width=<device-width>, initial-scale=1.0'>
    <title>web0 manifesto: Please wait, sending you a confirmation email…</title>
    <link rel='stylesheet' href='/styles.css'>
  </head>
  <body>
    <section id='manifesto'>
      <h1><span class='web0'>web0</span> manifesto</h1>
      <p>Please wait, sending you a message at {{email_address}} to confirm your email address…</p>
`

const successTemplate = `
      <p><strong>Email sent!</strong></p>
      <p>Please check your inbox and follow the link there to finish signing the <span class='web0'>web0</span> manifesto.</p>
      <p>Thanks!</p>
`

const failureTemplate = `
      <p class='error'>Sorry, could you not email you.</p>
      <p>The error details are below:</p>
      <pre><code>{{error}}</code></pre>
`

const footerTemplate = `
      <p><a href='/'>Back.</a></p>
    </section>
    <footer>
      <p>Made with ♥ by <a href='https://small-tech.org'>Small Technology Foundation</a></p> <p><strong>Like this? <a href='https://small-tech.org/fund-us'>Fund us!</a></strong></p>
    </footer>
  </body>
  </html>
`

// Initialise the JSDB database table if if doesn’t already exist.
if (db.pendingSignatories == undefined) {
  db.pendingSignatories = {}
  db.confirmationCodesToSignatoryEmails = {}
  db.confirmedSignatories = []
}

module.exports = async function (request, response) {
  const signatory = request.body.signatory
  const link = request.body.link
  const name = request.body.name
  const email = request.body.email

  // Basic validation on inputs.
  if (signatory === '' || link === '' || name === '' || email === '') {
    return redirectToError(response, 'All form fields are required.')
  }

  // Ensure signatory with given email is not waiting for confirmation.
  if (db.pendingSignatories[email] != undefined) {
    return redirectToError(response, `A request to sign the web0 manifesto with that email address (${email}) already exists, pending confirmation.

    <p>Please follow the link in the email we sent you to finalise your submission.</p>`)
  }

  // Start streaming the response so the person sees progress as we
  // attempt to send them the confirmation email.
  response.type('html')
  response.write(headerTemplate.replace('{{email_address}}', email))

  // Create the signatory object and persist it in the database.
  db.pendingSignatories[email] = {
    signatory,
    email,
    name,
    link
  }

  // Create a random hash for the validation URL
  // and map that to the pending signatory.
  const confirmationCode = crypto.randomBytes(16).toString('hex')
  db.confirmationCodesToSignatoryEmails[confirmationCode] = email

  const text = `Hello ${name.split(' ')[0]},

You (or someone who gave us your email address) has asked to sign the web0 manifesto (https://web0.small-web.org) on behalf of ${signatory}.

If this is not you, please ignore this email.

If this is you and you want to confirm your signature, please follow the link below:

https://web0.small-web.org/confirm/${confirmationCode}

Thank you.

Computer @ web0.small-web.org
Sent on behalf of the humans at Small Technology Foundation.
--
Want to talk to a human being?
Just hit reply and I’ll CC in the folks at hello@small-tech.org for you.
https://small-tech.org`

  try {
    const result = await sendMail(email, 'web0 manifesto signature confirmation request', text)
    console.info('[[[[ CONFIRMATION EMAIL SENT OK ]]]]', result)
    response.write(successTemplate)

  } catch (error) {
    response.write(failureTemplate.replace('{{error}}', error))
  }
  response.write(footerTemplate)
  response.end()
}
