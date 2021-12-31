const template = `<!DOCTYPE html>
<html lang='en'>
<head>
  <meta charset='UTF-8'>
  <meta http-equiv='X-UA-Compatible' content='IE=edge'>
  <meta name='viewport' content='width=<device-width>, initial-scale=1.0'>
  <title>web0 manifesto: Your signature has been removed</title>
  <link rel='stylesheet' href='/styles.css'>
</head>
<body>
  <section id='manifesto'>
    <h1><span class='web0'>web0</span> manifesto</h1>
    <h2>Signature removed</h2>
    <p>Your signature for {{signatory}} as well as your linked data (your name and email address) has been removed.</p>
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
  console.log(`Asking to delete signature with code ${code}`)

  // Make sure the code is the shape we expect it to be
  // before going any further.
  if (code.length !== 32 || isNaN(parseInt('0x' + code))) {
    return redirectToError(response, 'Invalid confirmation code.')
  }

  const signatoryEmail = db.confirmationCodesToSignatoryEmails[code]

  if (signatoryEmail) {
    const signatory = db.confirmedSignatories[signatoryEmail]

    if (signatory) {
      // Delete the signatory request.
      delete db.confirmedSignatories[signatoryEmail]

      // Also delete the code to email map as it is no longer necessary.
      delete db.confirmationCodesToSignatoryEmails[code]

      // Inform the person that their signature has been deleted.
      const page = template.replace('{{signatory}}', slugify(signatory.signatory))
      return response.html(page)
    } else {
      redirectToError(response, 'Signatory not found.')
    }
  } else {
    return redirectToError(response, 'Signatory not found.')
  }
}
