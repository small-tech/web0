template = `<!DOCTYPE html>
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
    <p>Your signature has now been added to the web0 manifesto.</p>
    <p><a href='/#{{signature_id}}'>View your signature.</a></p>
  </section>
  <footer>
    <p>Made with ♥ by <a href='https://small-tech.org'>Small Technology Foundation</a></p> <p><strong>Like this? <a href='https://small-tech.org/fund-us'>Fund us!</a></strong></p>
  </footer>
</body>
</html>
`

const slugify = require('../slugify')
const redirectToError = require('../redirectToError')

module.exports = (request, response) => {
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

    // Move the signatory from the pending list to the confirmed list and
    // redirect to the index.
    db.confirmedSignatories.push(signatory)

    // Clean up.
    delete db.pendingSignatories[signatoryEmail]
    delete db.confirmationCodesToSignatoryEmails[code]

    // Thank the person for signing.
    const page = template.replace('{{signature_id}}', slugify(signatory.signatory))
    return response.html(page)
  } else {
    return redirectToError(response, 'Signatory not found.')
  }
}
