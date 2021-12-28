const crypto = require('crypto')
const sendMail = require('../sendMail')

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
  if (signatory == undefined || link == undefined || name == undefined || email == undefined) {
    return response.redirect('/')
  }

  // Ensure signatory with given email is not waiting for confirmation.
  if (db.pendingSignatories[email] != undefined) {
    // TODO: Handle better.
    console.error(`A request to sign with email ${email} already exists, pending confirmation.`)
    return response.redirect('/')
  }

  // Ensure confirmed signatory with given email does not exist.
  if (db.confirmedSignatories[email] != undefined) {
    // TODO: Handle better.
    console.error(`Person/organisation with ${email} is already a signatory.`)
    return response.redirect('/')
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
    response.redirect('/step2.html')
  } catch (error) {
    console.error(error)
    response.redirect('/')
  }
}
