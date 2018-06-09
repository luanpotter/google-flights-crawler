#!/bin/bash -xe

ts=`node dater.js`
mkdir -p results-$ts

node index.js results-$ts '{"cityPairs": [["LON", "ROM"], ["ROM", "LON"]], "firstDate": "2019-02-01", "lastDate": "2019-02-28"}' > results-$ts/log 2>&1
gsutil cp results-$ts/log gs://crawler-flight-data/results-$ts/log
rm -f results-$ts
