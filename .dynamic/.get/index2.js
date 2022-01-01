const fs = require('fs')
const path = require('path')
const slugify = str => require('slugify')(str, {lower: true, strict: true})

const template = fs.readFileSync(path.join(__dirname, '..', 'index-template.html'), 'utf-8')

module.exports = (request, response) => {
  let signatoryListItems = ''
  if (db.confirmedSignatories.length > 0) {
    // Build signatories list and add it to the page.
    signatoryListItems = db.confirmedSignatories.reduce((listItems, signatory) => {
      return listItems += `\n<li id='${slugify(signatory.signatory)}'><a href='${signatory.link}' rel='nofollow'>${signatory.signatory}</a></li>`
    }, '')
  }

  if (signatoryListItems === '') {
    // No signatories yet, display a message asking someone to be the first :)
    signatoryListItems = '<li>No one yet, why not be the first?</li>'
  }

  const signatoryList = `<ul id='signatories'>${signatoryListItems}</ul>`
  const page = template.replace("<ul id='signatories'></ul>", signatoryList)

  response.html(page)
}
