
const express = require('express')
const getDnsServers = require('dns').getServers
const expressVersion = require('./node_modules/express/package.json').version
const app = express()
const PORT = process.env.PORT || 3000;

// respond to everything with some info
app.get('*', (req, res) => res.send({
  version: `Node (${process.version}) / Express (${expressVersion})`,
  ['x-forwarded-for']: req.headers['x-forwarded-for'],
  remoteAddress : req.connection.remoteAddress,
  uri: req.url,
  headers: req.headers,
  dns: getDnsServers()
}))

app.listen(PORT, () => console.log(`Example app listening on port ${PORT}!`))