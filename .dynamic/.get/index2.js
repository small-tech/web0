const fs = require('fs')
const path = require('path')

const template = fs.readFileSync(path.join(__dirname, '..', 'index-template.html'), 'utf-8')

module.exports = (request, response) => {
  let page
  if (db.confirmedSignatories.length === 0) {
    // No signatories yet, display a message asking someone to be the first :)
    page = template.replace("<ul id='signatories'></ul>", "<ul id='signatories'><li>No one yet, why not be the first?</li></ul>")
  } else {
    // Build signatories list and add it to the page.
    const signatoryListItems = db.confirmedSignatories.reduce((listItems, signatory) => {
      return listItems += `\n<li><a href='${signatory.link}'>${signatory.signatory}</a></li>`
    }, '')

    const signatoryList = `<ul id='signatories'>${signatoryListItems}</ul>`
    page = template.replace("<ul id='signatories'></ul>", signatoryList)
  }

  response.html(page)
}
