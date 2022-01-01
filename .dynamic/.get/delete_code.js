const redirectToError = require('../redirectToError')
const slugify = str => require('slugify')(str, {lower: true, strict: true})

const template = `${require('../header-template')('Your signature has been removed')}</title>

<h2>Signature removed</h2>

<p>Your signature for {{signatory}} as well as your linked data (your name and email address) has been removed.</p>

${require('../footer-template')()}
`

module.exports = (request, response) => {
  const code = request.params.code
  console.log(`Asking to delete signature with code ${code}`)

  // Make sure the code is the shape we expect it to be
  // before going any further.
  if (code.length !== 32 || isNaN(parseInt('0x' + code))) {
    return redirectToError(response, 'Invalid confirmation code.')
  }

  let signatoryIndex = -1
  const signatory = db.confirmedSignatories.find((signatory, index) => {
    // Signatory could be undefined if it has been deleted as we aren’t
    // currently compacting the array structure.
    if (signatory !== undefined && signatory.id === code) {
      signatoryIndex = index
      return true
    }
    return false
  })

  if (signatory) {
    // Delete the signatory request.
    delete db.confirmedSignatories[signatoryIndex]

    // Also delete the code to email map as it is no longer necessary.
    delete db.confirmationCodesToSignatoryEmails[code]

    // Inform the person that their signature has been deleted.
    const page = template.replace('{{signatory}}', signatory.signatory)
    return response.html(page)
  } else {
    redirectToError(response, 'Signatory not found.')
  }
}
