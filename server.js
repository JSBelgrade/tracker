'use strict'

const koa        = require('koa')
    , router     = require('koa-route')
    , request    = require('koa-request')
    , bodyParser = require('koa-body-parser')
    , Slack      = require('slack-client')
    , app        = koa()

  // Check if "config.json" exists
  try {
    // And require it
    var config = require('./config.json')
  } catch (ex) {
    // Or just hope that you have environment variables :D
  }

// Options:
// Getting them from an API or config file
let port         = process.env.PORT || config.server.port
  , clientID     = process.env.FS_CLIENT_ID || config.foursquare.clientID
  , clientSecret = process.env.FS_CLIENT_SECRET || config.foursquare.clientSecret
  , baseUrl      = process.env.BASE_URL || config.server.baseUrl
  , triggerWords = process.env.WORDS || config.foursquare.triggerWords
  , callbackUrl  = encodeURIComponent(`${baseUrl}/callback`)
  , slackToken   = process.env.SLACK_TOKEN || config.slack.token
  , slackChannel = process.env.SLACK_CHANNEL || config.slack.channel

triggerWords = triggerWords.split(',')

// Middlewares
app.use(bodyParser())

// Slack bot
let slack = new Slack(slackToken, true, true)

slack.login()

// Pages:

// Home page
let home = function * () {
  // Just print a static content
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
5. Tracker source: https://github.com/JSBelgrade/tracker

* Yes, links are not clickable. To fix that visit #5 and send PR.`
}

// Connect
let connect = function * () {
  // Generate Foursquare auth url
  let url = 'https://foursquare.com/oauth2/authenticate'
          + '?client_id=' + clientID
          + '&response_type=code'
          + '&redirect_uri=' + callbackUrl

  // Set status 302 and redirect user
  this.status = 302
  this.redirect(url)
  this.body = 'Redirecting to Foursquare'
}

// Connect callback page
let connectCallback = function * () {
  // Parse query string
  // todo: do this better
  let query = this.request.querystring.split('=')

  // Generate Forsquare access token url
  let url = 'https://foursquare.com/oauth2/access_token'
          + '?client_id=' + clientID
          + '&client_secret=' + clientSecret
          + '&grant_type=authorization_code'
          + '&redirect_uri=' + callbackUrl
          + '&code=' + query[1]

  // Send request
  let response = yield request({url: url})
  
  // Parse response
  let info = JSON.parse(response.body)

  // Get user info from Foursquare
  let fsApiUrl = 'https://api.foursquare.com/v2/users/self'
  let version = new Date().toISOString().substr(0, 10).replace(/\-/g, '')
  let fsUserUrl = `${fsApiUrl}?oauth_token=${info.access_token}&v=${version}`
  let userInfoResponse = yield request({url: fsUserUrl})
  let userInfo = JSON.parse(userInfoResponse.body)

  let user = userInfo.response.user.firstName
           + ' '
           + userInfo.response.user.lastName

  // Post message to Slack
  let slackMessage = `${user} just joined!`
  slack.getChannelByName(slackChannel).send(slackMessage)

  // And print the response
  this.body =
`Hey, ${user},
you are successfully connected to JS Belgrade tracker.

Your access token is ${info.access_token}.`
}

// Push page
let fsPush = function * () {
  let rawCheckin = this.request.body.split('&')[0]
  let rawUser = this.request.body.split('&')[1]

  let checkin = JSON.parse(decodeURIComponent(rawCheckin.split('=')[1]))

  let shouldIPostIt = false

  triggerWords.forEach(word => 
    shouldIPostIt =
      checkin.shout.toLowerCase().indexOf(word.toLowerCase()) >= 0 || shouldIPostIt)

  let message = `Nope :(`

  if (shouldIPostIt) {
    let venue = checkin.venue
    // let url = venue.url + '/v/' + venue.storeId + '/' + venue.id + '/'
    message = `*${checkin.user.firstName} ${checkin.user.lastName}* just checked in at *${venue.name}*, ${venue.location.formattedAddress.join(', ')}
> ${checkin.shout}`
    slack.getChannelByName(slackChannel).send(message)
  }

  this.status = 200
  this.body = message
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
app.listen(port)
console.log(`listening on port ${port}`)
