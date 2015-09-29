# Install guide

This is a simple guide how to install and use Tracker for your Slack 
organization. It's easy and it shouldn't take you more than 15 minutes. If you
want to improve this guide, send us PR please.

## Requirements

- Server with SSL - Foursquare push requires HTTPS, this project is Heroku ready
so we suggest to go with that option if you don't have SSL
- Node version 4+ - We use Koa framework that is based on generators, this 
project would probably work with iojs or 0.10.x ans 0.12.x node versions with
harmony flag, but it's not tested with them.
- Slack organization
- Foursquare account

## Foursquare

First you'll need to create an app on Foursquare and to get the tokens.
If you know how to get "Client ID", "Client Secret" and "Push secret" you can 
[skip this section](#Slack)
 
Here's how to get the tokens:

- Go to [Foursquare for developers](https://developer.foursquare.com)
- Then go to "My Apps" and click on "Create a new app button"
- Fill out everything in "Web addresses" section and set 
`https://yoursite.com/callback` as "Redirect URI(s)"
- Select "Push checkins by this app's users" in "Push API Notifications"
dropdown and then add `https://yoursite.com/push` as "Push url"
- Save the app and copy "Client ID", "Client Secret" and "Push secret"

`https://yoursite.com/` should be a url of the tracker app, it requires SSL 
because Foursquare's Push API requires it, if you don't have it check Heroku
section in this guide.

## Slack

## Setup on your server

## Setup on Heroku

[TBA]
