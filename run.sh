#!/bin/bash -xe

ts=`node dater.js`
node index.js results '{"cityPairs": [["LON", "ROM"], ["ROM", "LON"]], "firstDate": "2019-02-01", "lastDate": "2019-02-28"}' > log 2>&1
gsutil cp results gs://crawler-flight-data/results/$ts-results
gsutil cp log gs://crawler-flight-data/log/$ts-log
rm results log
