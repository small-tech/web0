module.exports = (title = null, linkToHome = true) => `<!DOCTYPE html>
<html lang='en'>
<head>
  <meta charset='UTF-8'>
  <meta http-equiv='X-UA-Compatible' content='IE=edge'>
  <meta name='viewport' content='width=<device-width>, initial-scale=1.0'>
  <title>web0 manifesto${title ? `: ${title}` : ''}</title>
  <link rel='stylesheet' href='/styles.css'>
</head>
<body>
  <section id='manifesto'>
    <h1>${linkToHome ? "<a href='/'>" : ''}<span class='web0'>web0</span> manifesto${linkToHome ? '</a>' : ''}</h1>
`
