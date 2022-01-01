const redirectToError = require('../redirectToError')
const slugify = str => require('slugify')(str, {lower: true, strict: true})

const template = `
  ${require('../header-template')('Your request has been cancelled')}

  <h2>Request cancelled</h2>

  <p>Your request to sign the web0 manifesto on behalf of {{signatory}} has been cancelled as per your instructions.</p>

  ${require('../footer-template')()}
`

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

      // Inform person that the request has been cancelled.
      const page = template.replace('{{signatory}}', signatory.signatory)
      return response.html(page)
    } else {
      redirectToError(response, 'Sorry, it looks like the signatory has already been confirmed. TODO: Would you like to remove the signatory from the manifesto?')
    }
  } else {
    return redirectToError(response, 'Signatory not found.')
  }
}
