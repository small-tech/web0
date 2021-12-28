const crypto = require('crypto')
const sendMail = require('../sendMail')

// Initialise the JSDB database table if if doesn’t already exist.
if (db.pendingSignatories == undefined) {
  db.pendingSignatories = {}
  db.confirmationCodesToSignatoryEmails = {}
  db.confirmedSignatories = []
}

function redirectToError(response, errorMessage) {
  response.redirect(`/error?message=${encodeURIComponent(errorMessage)}`)
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
    console.info(result)
    return response.redirect('/step2.html')
  } catch (error) {
    return redirectToError(response, error)
  }
}
