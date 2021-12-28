const fs = require('fs')
const path = require('path')

const template = fs.readFileSync(path.join(__dirname, '..', 'index-template.html'), 'utf-8')

module.exports = (request, response) => {
  let page
  if (db.confirmedSignatories.length === 0) {
    page = template.replace("<ul id='signatories'></ul>", "<ul id='signatories'><li>No one yet, why not be the first?</li></ul>")
  } else {
    const signatoryListItems = db.confirmedSignatories.reduce((listItems, signatory) => {
      listItems += `\n<li><a href='${signatory.link}'>${signatory.signatory}</a></li>`
    }, '')

    const signatoryList = `<ul id='signatories'>${signatoryListItems}</ul>`
    page = template.replace("<ul id='signatories'></ul>", signatoryList)
  }

  response.html(page)
}
