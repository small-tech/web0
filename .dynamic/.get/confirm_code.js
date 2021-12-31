const redirectToError = require('../redirectToError')
const slugify = str => require('slugify')(str, {lower: true, strict: true})
const sendMail = require('../sendMail')

const template = `<!DOCTYPE html>
<html lang='en'>
<head>
  <meta charset='UTF-8'>
  <meta http-equiv='X-UA-Compatible' content='IE=edge'>
  <meta name='viewport' content='width=<device-width>, initial-scale=1.0'>
  <title>web0 manifesto: Thank you for signing!</title>
  <link rel='stylesheet' href='/styles.css'>
</head>
<body>
  <section id='manifesto'>
    <h1><span class='web0'>web0</span> manifesto</h1>
    <h2>Thank you!</h2>
    <p>Your signature has now been added to the <span class='web0'>web0</span> manifesto.</p>
    <p><a href='/#{{signature_id}}'>View your signature.</a></p>
  </section>
  <footer>
    <p>Made with ♥ by <a href='https://small-tech.org'>Small Technology Foundation</a></p> <p><strong>Like this? <a href='https://small-tech.org/fund-us'>Fund us!</a></strong></p>
  </footer>
</body>
</html>
`

module.exports = async (request, response) => {
  const code = request.params.code
  console.log(`Asking to confirm signature with code ${code}`)

  // Make sure the code is the shape we expect it to be
  // before going any further.
  if (code.length !== 32 || isNaN(parseInt('0x' + code))) {
    return redirectToError(response, 'Invalid confirmation code.')
  }

  const signatoryEmail = db.confirmationCodesToSignatoryEmails[code]

  if (signatoryEmail) {
    const signatory = db.pendingSignatories[signatoryEmail]

    if (signatory) {
      // Move the signatory from the pending list to the confirmed list and
      // redirect to the index.
      db.confirmedSignatories.push(signatory)

      // Clean up.
      delete db.pendingSignatories[signatoryEmail]
      delete db.confirmationCodesToSignatoryEmails[code]

      // Thank the person for signing.
      const page = template.replace('{{signature_id}}', slugify(signatory.signatory))
      response.html(page)

      // Send an email to confirm and provide a link where the person can delete
      // their signature if they want to in the future. (Doing so will also
      // delete their data from our database.)
      const text = `Hello ${signatory.name.split(' ')[0]},

Thank you for signing the web0 manifesto on behalf of ${signatory.signatory} (${signatory.link}).

View your signature at:

https://web0.small-web.org/#${slugify(signatory.signatory)}

If you ever want to remove your signature and related data that’s not display (your name and email address) from the manifesto in the future, please use the link below:

https://web0.small-web.org/delete/${code}

Thank you.

Computer @ web0.small-web.org
Sent on behalf of the humans at Small Technology Foundation.
--
Want to talk to a human being?
Just hit reply and I’ll CC in the folks at hello@small-tech.org for you.
https://small-tech.org`
      try {
        const result = await sendMail(signatoryEmail, 'Thank you for signing the web0 manifesto!', text)
      } catch (error) {
        console.error(`Could not send thank you email to ${signatoryEmail}`, error)
      }
    } else {
      redirectToError(response, 'Signatory already confirmed.')
    }
  } else {
    return redirectToError(response, 'Signatory not found.')
  }
}
