////////////////////////////////////////////////////////////////////////////////
//
//
//
////////////////////////////////////////////////////////////////////////////////

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

// Returns a promise to send a text-only email from computer@web0.small-web.org
// with the given subject line and text, with an optional CC field.
module.exports = function sendMail (to, subject, text, cc = null) {
  return new Promise(async (resolve, reject) => {
    // Create the nodemailer message object.
    const message = {
      from: 'computer@web0.small-web.org',
      to,
      subject,
      text
    }

    // The same message has to be sent to both the person in the to field
    // and to the person in the CC field, if there is one.
    try {
      if (cc !== null) {
        message.cc = cc
        await _sendMail(cc, message)
      }
      await _sendMail(to, message)
      resolve()
    } catch (error) {
      reject(error)
    }
  })
}

function _sendMail (to, message) {
  return new Promise(async (resolve, reject) => {
    // Find the mail exchange (MX) server for the provided email address.
    const emailDomain = to.split('@')[1]
    const mx = await dns.promises.resolveMx(emailDomain)

    if (mx.length > 0) {
      // OK, mail server found.
      // DNS lookup may return MX records unsorted by priority.
      // In principle we should always talk to the mail exchange with the highest priority.
      const sortedMx = mx.sort(function(a, b) {
        if (a.priority < b.priority) {
          return -1;
        }

        if (a.priority > b.priority) {
          return 1;
        }

        return 0;
      });

      const host = sortedMx[0].exchange === 'mx.ethereal.email' ? 'smtp.ethereal.email' : sortedMx[0].exchange

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

      transporter.sendMail(message, (error, info) => {
        if (error) {
          console.error('Send email FAILED', error)
          reject(error)
        } else {
          console.info('Send email OK', info)
          resolve(info)
        }
      })
    } else {
      reject(new Error(`No mail server found for ${email} (no mail exchange record found)`))
    }
  })
}
