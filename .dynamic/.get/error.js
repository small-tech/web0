const errorTemplate = `<!DOCTYPE html>
<html lang='en'>
<head>
  <meta charset='UTF-8'>
  <meta http-equiv='X-UA-Compatible' content='IE=edge'>
  <meta name='viewport' content='width=<device-width>, initial-scale=1.0'>
  <title>web0 manifesto error</title>
  <link rel='stylesheet' href='styles.css'>
</head>
<body>
  <section id='manifesto'>
    <h1><span class='web0'>web0</span> manifesto</h1>
    <h2 class='error'>Oops!</h2>
    <p>{{error_message}}</p>
    <p><a href='/'>Back.</a></p>
  </section>
  <footer>
    <p>Made with ♥ by <a href='https://small-tech.org'>Small Technology Foundation</a></p> <p><strong>Like this? <a href='https://small-tech.org/fund-us'>Fund us!</a></strong></p>
  </footer>
</body>
</html>`

module.exports = (request, response) => {
  console.log(request.query.message)
  const errorMessage = request.query.message
    .replace(/</g, '&lt;')           // No HTML, please, we’re British!
    .replace(/>/g, '&gt;')           // (While we’re all for vaccinations,
                                     // this is not the kind of injection we enjoy.) ;)
    .replace(/&lt;p&gt;/g, "<p>")    // OK, ok, paragraph tags are allowed…
    .replace(/&lt;\/p&gt;/g, "</p>") // Happy now?

    response.html(errorTemplate.replace('{{error_message}}', errorMessage))
}
