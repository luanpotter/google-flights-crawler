# google-flights-crawler

These are some utilities to crawl Google Flights.

## crawler.js

This file contains the basic API to interact with the website using puppeteer. Create a new Crawler object passing a puppeteer page and you can easily interact with the page (set fields values, search, query, etc).

## index.js

This is an example runner, it takes a pattern generator for the inputs, generates all possible combinations and run in a pool of several puppeteers (all configurable). It saves every bit of progress on disk and on GCS on the directory provided. It retry individually when any error occur.

## run.sh

This performs a complete run: create a dir with current timestamp, run index safely for that dir and waits for finished. It's trapped, so whether it succeeds or not, it deletes the tmp folder and saves the whole log to GCS and also turnoff the machine if desired.

## start.sh

This comamnd is to be run from outside via ssh. It saves it's own log on disk, cd's to the appropriate folder and run run.sh for 10 threads and with turnoff on. Be careful, if you run in your own machine it will turn it down after finished. Run only via SSH ona GCE machine.

## gcloud.sh

This starts a GCE machine and run start.sh there (as intended). Both machines need to have the source. It won't run npm install for you. This can be easily added to your cron or to the cron of a machine that you leave always on.