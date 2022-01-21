module.exports = (request, response) => {
  response
    .contentType('text/plain')
    .end(db.banned.join(', \n'))
}
