// Slugifies the passed text (so it can be used in element IDs, etc.)
// e.g., Hello There Sunshine becomes hello-there-sunshine
module.exports = function (text) {
  return text
    .toLowerCase()
    .replace(/\s/g, '-')
}
