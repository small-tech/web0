const template = `
${require('../header-template')('Error!')}

<h2 class='error'>Oops!</h2>

<p>{{error_message}}</p>

<p><a href='/'>Back.</a></p>

${require('../footer-template')()}
`

module.exports = (request, response) => {
  console.log(request.query.message)
  const errorMessage = request.query.message
    .replace(/</g, '&lt;')                              // No HTML, please, we’re British!
    .replace(/>/g, '&gt;')                              // (While we’re all for vaccinations,
                                                        // this is not the kind of injection we enjoy.) ;)
    .replace(/&lt;p&gt;/g, "<p>")                       // OK, ok, paragraph tags are allowed…
    .replace(/&lt;\/p&gt;/g, "</p>")                    // Happy now?
    .replace(/web0/g, "<span class='web0'>web0</span>") // Branding, innit?

    response.html(template.replace('{{error_message}}', errorMessage))
}
