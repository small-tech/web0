const template = `<!DOCTYPE html>
<html lang='en'>
<head>
  <meta charset='UTF-8'>
  <meta http-equiv='X-UA-Compatible' content='IE=edge'>
  <meta name='viewport' content='width=<device-width>, initial-scale=1.0'>
  <title>web0 manifesto: Your request has been cancelled</title>
  <link rel='stylesheet' href='/styles.css'>
</head>
<body>
  <section id='manifesto'>
    <h1><span class='web0'>web0</span> manifesto</h1>
    <h2>Request cancelled</h2>
    <p>Your request to sign the web0 manifesto on behalf of {{signatory}} has been cancelled as per your instructions.</p>
  </section>
  <footer>
    <p>Made with ♥ by <a href='https://small-tech.org'>Small Technology Foundation</a></p> <p><strong>Like this? <a href='https://small-tech.org/fund-us'>Fund us!</a></strong></p>
  </footer>
</body>
</html>
`

const redirectToError = require('../redirectToError')
const slugify = str => require('slugify')(str, {lower: true, strict: true})

module.exports = (request, response) => {
  const code = request.params.code
  console.log(`Asking to cancel signature with code ${code}`)

  // Make sure the code is the shape we expect it to be
  // before going any further.
  if (code.length !== 32 || isNaN(parseInt('0x' + code))) {
    return redirectToError(response, 'Invalid confirmation code.')
  }

  const signatoryEmail = db.confirmationCodesToSignatoryEmails[code]

  if (signatoryEmail) {
    const signatory = db.pendingSignatories[signatoryEmail]

    if (signatory) {
      // Cancel the signatory request.
      delete db.pendingSignatories[signatoryEmail]

      // Also delete the code to email map as it is no longer necessary.
      delete db.confirmationCodesToSignatoryEmails[code]
      
      // Note: we do NOT delete the entry in db.confirmationCodesToSignatoryEmails
      // as we will use it again if the person ever wants to delete their signature
      // in the future.

      // Thank the person for signing.
      const page = template.replace('{{signatory}}', slugify(signatory.signatory))
      return response.html(page)
    } else {
      redirectToError(response, 'Sorry, it looks like the signatory has already been confirmed. TODO: Would you like to remove the signatory from the manifesto?')
    }
  } else {
    return redirectToError(response, 'Signatory not found.')
  }
}
