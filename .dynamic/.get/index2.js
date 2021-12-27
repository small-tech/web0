const fs = require('fs')

const template = fs.readFileSync('.dynamic/index-template.html')

module.exports = (request, response) => {
  response.html(template)
}
