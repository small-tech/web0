const nodemailer = require('nodemailer')
const dns = require('dns')
const fs = require('fs')
const os = require('os')
const path = require('path')

//
// SMTP constants.
//

// DKIM
const privateKeyPath = path.join(os.homedir(), '.small-tech.org', 'web0.small-web.org', 'dkim_private.pem')
const privateKey = fs.readFileSync(privateKeyPath).toString('utf-8')
const domainName = 'web0.small-web.org'
const keySelector = 'dkim'

const port = 25
const direct = true
const requireTLS = true

module.exports = async function (request, response) {
  const signatory = request.body.signatory
  const link = request.body.link
  const name = request.body.name
  const email = request.body.email

  // Basic validation on inputs.
  if (signatory == undefined || link == undefined || name == undefined || email == undefined) {
    response.redirect('/')
    return
  }

  // Find the mail exchange (MX) server for the provided email address.
  const emailDomain = email.split('@')[1]
  const mx = await dns.promises.resolveMx(emailDomain)

  if (mx.length > 0) {
    // OK, mail server found.
    // Just use the first server returned.
    const host = mx[0].exchange === 'mx.ethereal.email' ? 'smtp.ethereal.email' : mx[0].exchange

    // Create transporter to talk directly to mail server for provided email address.
    const transporter = nodemailer.createTransport({
      host,
      direct,
      requireTLS,
      port,
      dkim: {
        domainName,
        keySelector,
        privateKey
      }
    })

    const text = `Hello ${name.split(' ')[0]},

You (or someone who gave us your email address) has asked to sign the web0 manifesto (https://web0.small-web.org) on behalf of ${signatory}.

If this is not you, please ignore this email.

If this is you and you want to confirm your signature, please follow the link below:

https://web0.small-web.org

Thank you.

Computer @ web0 manifesto
Sent on behalf of the humans at Small Technology Foundation.
--
Want to talk to a human being?
Email us at hello@small-tech.org
https://small-tech.org`

    // Create email message.
    const message = {
      from: 'computer@web0.small-web.org',
      to: email,
      subject: 'web0 manifesto signature confirmation request',
      text
    }

    transporter.sendMail(message, (error, info) => {
      if (error) {
        console.log(error)
        response.redirect('/')
      } else {
        response.redirect('/step2.html')
        console.log(info)
      }
    })
  } else {
    console.log(`No mail server found for ${email} (no mail exchange record found)`)
    response.redirect('/')
    return
  }
}
