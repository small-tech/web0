module.exports = (request, response) => {
  const code = request.params.code
  console.log(`Asking to confirm signature with code ${code}`)

  const signatoryEmail = db.confirmationCodesToSignatoryEmails[code]

  if (signatoryEmail) {
    // Move the signatory from the pending list to the confirmed list and
    // redirect to the index.
    db.confirmedSignatories.push(db.pendingSignatories[signatoryEmail])

    // Clean up.
    delete db.pendingSignatories[signatoryEmail]
    delete db.confirmationCodesToSignatoryEmails[code]

    // TODO: Display a success message too.
    response.redirect('/')
  } else {
    response.status(404).end('Signatory not found.')
  }
}
