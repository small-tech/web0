const crypto = require('crypto')
const sendMail = require('../sendMail')
const redirectToError = require('../redirectToError')
const urlExists = require('url-exist')

const emailBlacklist = [
  // Disposable temporary email addresses.
  'sharklasers.com'
]

const headerTemplate = `
  ${require('../header-template')('Please wait, sending you a confirmation email…')}

  <section id='progress'>
    <h2><img class='spinner' src='/spinner.svg'>Please wait…</h2>
    <p>We’re sending you a message at {{email_address}} to confirm your email address.</p>
  </section>
`

const fadeOutProgressMessageTemplate = `
  <style>#progress { opacity: 0; }</style>
`

const hideProgressMessageTemplate = `
  <style>#progress { display: none; }</style>
`

const fadeInConfirmationEmailResultTemplate = `
  <style>#confirmationEmailResult { opacity: 1; }</style>
`

const successTemplate = `
      <section id='confirmationEmailResult'>
        <h2>Email sent!</h2>
        <p>Please check your inbox and follow the link there to finish signing the <span class='web0'>web0</span> manifesto.</p>
        <p>Thanks!</p>
      </section>
`

const failureTemplate = (error, signatory, link, name, email) => `
      <section id='confirmationEmailResult'>
        <h2 class='error'>Sorry, we could not email you.</h2>
        <p>We got the following error message from your email server:</p>
        <pre><code>${error}</code></pre>

        <h3>Greylist error?</h3>

        <form method='POST' action='/sign' class='greylistError'>

          <p>If the error looks like <a href='https://en.wikipedia.org/wiki/Greylisting_(email)'>a greylisting error</a>, you can <strong>try waiting a while before retrying the request using the button below.</strong></p>

          <p>Please also contact your email provider and ask them to reconsider using greylisting. <a href='https://en.wikipedia.org/wiki/Greylisting_(email)#Disadvantages'>It is no longer effective against spam</a> but it does make life harder for transactional emails like this.</p>

          <input type='hidden' name='signatory' value='${signatory}'>
          <input type='hidden' name='link' value='${link}'>
          <input type='hidden' name='name' value='${name}'>
          <input type='hidden' name='email' value='${email}'>

          <input type='submit' value='Retry'>

        </form>

        <h3>Blacklist error?</h3>

        <p>If it looks like your server has blacklisted us, please contact your email provider and ask them to remove us from their blacklist.</p>

        <p>(This site is hosted on <a href='https://https://www.hetzner.com/'>Hetzner</a> and it’s possible that they’ve blacklisted a URL or IP address from Hetzner that was used for nefarious purposes in the past.)</p>
      </section>
`

const footerTemplate = `
      <p><a href='/'>Back.</a></p>
    ${require('../footer-template')()}
`

// This is the loose regular expression used in the HTML5 standard
// extended to require a top-level domain.
const validEmailRegExp = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/

// Check for URL syntax (very loosely; as a simple first test).
// Mirrored from the client-side.
const validUrlRegExp = /^https:\/\/[^ "<>%{}|\\^`]+\.[^ "<>%{}|\\^`]+$/

function htmlEncode (text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function delay (timeInMs) {
  return new Promise ((resolve, reject) => {
    setTimeout(() => {
      resolve()
    }, timeInMs)
  })
}

// Initialise the JSDB database table if if doesn’t already exist.
if (db.pendingSignatories == undefined) {
  db.pendingSignatories = {}
  db.confirmationCodesToSignatoryEmails = {}
  db.confirmedSignatories = []
}

module.exports = async function (request, response) {
  let signatory = request.body.signatory
  let link = request.body.link
  const name = request.body.name
  const email = request.body.email

  // Basic validation on inputs.
  if (signatory === '' || link === '' || name === '' || email === '') {
    return redirectToError(response, 'All form fields are required.')
  }

  // Check lengths.
  if (signatory.length > 93) { return redirectToError(response, 'Signatory name too long (max 93 characters).') }
  if (name.length > 93) { return redirectToError(response, 'Name too long (max 93 characters)') }
  if (email.length > 254) { return redirectToError(response, 'Email too long (max 254 characters') }
  if (link.length > 256) { return redirectToError(response, 'Link too long (max 256 characters') }

  // Make sure signatory name doesn’t contain HTML.
  // (We don’t want any silly alerts popping up.)
  signatory = htmlEncode(signatory)

  // Basic email validation.
  if (validEmailRegExp.exec(email) === null) {
    return redirectToError(response, `Sorry, that does not look like a valid email address (${email}).`)
  }

  // Ensure signatory with given email is not waiting for confirmation.
  if (db.pendingSignatories[email] != undefined) {
    return redirectToError(response, `A request to sign the web0 manifesto with that email address (${email}) already exists, pending confirmation.

    <p>Please follow the link in the email we sent you to finalise your submission.</p>`)
  }

  // Apply email blacklist.
  emailBlacklist.forEach(blackListedDomain => {
    if (email.indexOf(blackListedDomain) !== -1) {
      return redirectToError(response, `Sorry, we don’t accept submissions with email addresses from ${blackListedDomain}.`)
    }
  })

  // Apply ban list.
  db.banned.forEach(bannedEmail => {
    if (email === bannedEmail) {
      return redirectToError(response, `Sorry, that email address has been banned.`)
    }
  })

  // Basic URL massaging (we only accept https because it’s three days to 2022
  // for goodness’ sake), validation, and sanitisation.
  link = link.startsWith('http://') ? link.replace('http://', 'https://') : link
  link = link.startsWith('https://') ? link : `https://${link}`

  // Validate the link using a regular expression as the first step.
  if (validUrlRegExp.exec(link) === null) {
    return redirectToError(response, `Sorry, that does not look like a valid web address (${link}).`)
  }

  // Next validate the URL by creating a URL object from it.
  let url
  try {
    url = new URL(link)
  } catch (error) {
    return redirectToError(response, `Sorry, the link you provided (${link}) isn’t a valid URL.`)
  }

  // OK, let’s re-form the URL to keep only the protocol, hostname, pathname, and hash (if any).
  // In other words, a URL here really doesn’t need port, parameters, etc.
  link = `${url.protocol}//${url.hostname}${url.pathname}${url.hash}`

  // Now, finally, let’s make sure this URL is reachable.
  const linkIsReachable = await urlExists(link)

  if (!linkIsReachable) {
    return redirectToError(response, `Sorry, our sanitised version of the link you provided (${link}) isn’t loading for us.`)
  }

  // Start streaming the response so the person sees progress as we
  // attempt to send them the confirmation email.
  response.type('html')
  response.write(headerTemplate.replace('{{email_address}}', email))

  // Create a random hash for the validation URL
  // and map that to the pending signatory.
  const confirmationCode = crypto.randomBytes(16).toString('hex')

  // Email text.
  const text = `Hello ${name.split(' ')[0]},

You (or someone who gave us your email address) has asked to sign the web0 manifesto on behalf of:

${signatory} (${link})

If this wasn’t you, please ignore this email.

Please use the following link to confirm your signature:

https://web0.small-web.org/confirm/${confirmationCode}

You can also cancel your request using the link below:

https://web0.small-web.org/cancel/${confirmationCode}

Thank you.

Computer @ web0.small-web.org
Sent on behalf of the humans at Small Technology Foundation.
--
Want to talk to a human being?
Just hit reply and I’ll CC in the folks at hello@small-tech.org for you.
https://small-tech.org`

  try {
    // Send email.
    const result = await sendMail(email, 'web0 manifesto signature confirmation request', text)

    // OK, email sent successfully, now persist the records in the database.
    db.confirmationCodesToSignatoryEmails[confirmationCode] = email

    // Create the signatory object and persist it in the database.
    db.pendingSignatories[email] = {
      id: confirmationCode,
      signatory,
      email,
      name,
      link,
      date: new Date()
    }

    // Start fading out the progress message and wait for it complete
    // before removing it from the DOM and fading in the result message.
    // Yes, we’re animating using the HTTP stream and CSS animations
    // without any client-side JavaScript ;)
    response.write(fadeOutProgressMessageTemplate)
    await delay(1000)
    response.write(hideProgressMessageTemplate)
    response.write(successTemplate)
  } catch (error) {
    // Start fading out the progress message and wait for it complete
    // before removing it from the DOM and fading in the error message.
    response.write(fadeOutProgressMessageTemplate)
    await delay(1000)
    response.write(hideProgressMessageTemplate)
    response.write(failureTemplate(error, signatory, link, name, email))
  }
  await delay(100)
  response.write(fadeInConfirmationEmailResultTemplate)
  response.write(footerTemplate)
  response.end()
}
