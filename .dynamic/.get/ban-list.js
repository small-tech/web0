const header = require('../header-template')(/* title */ null, /* link to home? */ false)
const footer = require('../footer-template')(/* close section tag */ false)

module.exports = (request, response) => {
  response.html(`${header}
<h2>Ban list</h2>
<p>This is a list of email addresses that have spammed the web0 manifesto. Please feel free to do whatever you like with them (e.g., add them to the block lists of your own apps to protect your own sites from spam, etc.)</p>
<textarea class='spammers'>${db.banned.join(', \n')}</textarea>
${footer}`)
}
