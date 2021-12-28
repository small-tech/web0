module.exports = function redirectToError(response, errorMessage) {
  response.redirect(`/error?message=${encodeURIComponent(errorMessage)}`)
}
