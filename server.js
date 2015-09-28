'use strict'

const koa        = require('koa')
    , router     = require('koa-route')
    , request    = require('koa-request')
    , bodyParser = require('koa-body-parser')
    , views      = require('koa-views')
    , serve      = require('koa-static-folder')
    , favicon    = require('koa-favicon')
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
let port          = process.env.PORT || config.server.port
  , clientID      = process.env.FS_CLIENT_ID || config.foursquare.clientID
  , clientSecret  = process.env.FS_CLIENT_SECRET || config.foursquare.clientSecret
  , pushSecret    = process.env.FS_PUSH_SECRET || config.foursquare.pushSecret
  , baseUrl       = process.env.BASE_URL || config.server.baseUrl
  , triggerWords  = process.env.WORDS || config.foursquare.triggerWords
  , callbackUrl   = encodeURIComponent(`${baseUrl}/callback`)
  , slackToken    = process.env.SLACK_TOKEN || config.slack.token
  , slackApiToken = process.env.SLACK_API_TOKEN || config.slack.apiToken
  , slackOrg      = process.env.SLACK_ORG || config.slack.orgName
  , slackChannel  = process.env.SLACK_CHANNEL || config.slack.channel

// Parse trigger words
triggerWords = triggerWords.split(',')

// Middlewares
app.use(views('templates', {
  map: {
    html: 'mustache'
  }
}))
app.use(serve('./static'))
app.use(bodyParser())
app.use(favicon(__dirname + '/static/favicon.ico'))

// Slack bot
let slack = new Slack(slackToken, true, true)

slack.login()

// Helpers

let getUserName = (first, last) => first ? `${first} ` : '' + last ? last : ''

// Pages:

// Home page
let home = function * () {

  let response = yield request({url: `https://slack.com/api/team.info?token=${slackApiToken}`})

  let options = {
    orgIcon: JSON.parse(response.body).team.icon.image_132,
    orgName: slackOrg,
    channel: slackChannel,
    words:   triggerWords.join(', ')
  }

  // Just print a static content
  yield this.render('index', options)
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

  let usr = userInfo.response.user
  let user = getUserName(usr.firstName, usr.lastName)

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
  if (this.request.body.secret !== pushSecret) {
    this.status = 403
    this.body = '╭( ✖_✖ )╮'
    return false
  }

  // And parse it as JSON
  let checkin = JSON.parse(decodeURIComponent(this.request.body.checkin))

  // By default don't post anything to Slack
  let postIt = false

  // Than loop through all trigger words and check if they exists in checkin.shout
  // If they do, just update `postIt` to true
  triggerWords.forEach(word => {
    if (checkin.shout)
      postIt =
        checkin.shout.toLowerCase().indexOf(word.toLowerCase()) >= 0 || postIt
  })

  // Check if it should be posted
  if (postIt) {
    // Save some space in big message :)
    let venue = checkin.venue
    let user = getUserName(checkin.user.firstName, checkin.user.lastName)
    let address = venue.location.formattedAddress.join(', ')
    
    // Then generate the message
    let slackMessage = `*${user}* just checked in at *${venue.name}*, ${address}
> ${checkin.shout}`
    
    // And post it to the selected Slack channel
    slack.getChannelByName(slackChannel).send(slackMessage)
  }

  // In the end just set status 200 and some message
  this.status = 200
  this.body = `Thanks, Foursquare!`
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
