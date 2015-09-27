'use strict'

const koa     = require('koa')
    , router  = require('koa-route')
    , request = require('koa-request')
    , config  = require('./config.json')
    , app     = koa()

let home = function * () {
  this.body =
`JS Belgrade Tracker

Usage:

- Go to "/connect" to signup
- Checkin on Foursquare

This service tracks all Foursqare checkins for authenticated users and posts
them to JS Belgrade Slack in #tracker channel.
Idea is to easily let the others know that you are somewhere and that they can
join for a hacking or just a beer or coffee.

Useful links*:

1. JS Belgrade website: http://jsbelgrade.org
2. Slack: http://slack.jsbelgrade.org
3. Github: https://github.com/JSBelgrade
4. Twitter: https://twitter.com/JSBelgrade
5. Tracker source: https://twitter.com/JSBelgrade

* Yes, links are not clickable. To fix that visit #5 and send PR.`
}

let connect = function * (next) {
  yield next

  let url = 'https://foursquare.com/oauth2/authenticate'
          + '?client_id=' + config.foursquare.clientID
          + '&response_type=code'
          + '&redirect_uri='
          + encodeURIComponent(config.server.baseUrl + '/callback')

  this.status = 302
  this.redirect(url)
  this.body = 'Redirecting to foursquare'
}

let connectCallback = function * (next) {

  yield next

  let query = this.request.querystring.split('=')

  let url = 'https://foursquare.com/oauth2/access_token'
          + '?client_id=' + config.foursquare.clientID
          + '&client_secret=' + config.foursquare.clientSecret
          + '&grant_type=authorization_code'
          + '&redirect_uri='
          + encodeURIComponent(config.server.baseUrl + '/callback')
          + '&code=' + query[1]

  let response = yield request({url: url})
    
  let info = JSON.parse(response.body)

  this.body = info.access_token
}

let fsPush = function * () {
  this.body = 'Tracker connect callback'
}

// Routes

// Home page
app.use(router.get('/', home))

// Connect/signup page
app.use(router.get('/connect', connect))

// Connect callback page
app.use(router.get('/callback', connectCallback))

// foursquare checkin push page
app.use(router.post('/push', fsPush))

// Create server
app.listen(config.server.port)
console.log('listening on port 3000')
