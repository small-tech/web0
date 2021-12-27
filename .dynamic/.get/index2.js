const fs = require('fs')
const path = require('path')

const template = fs.readFileSync(path.join(__dirname, '..', 'index-template.html'))

module.exports = (request, response) => {
  response.html(template)
}
