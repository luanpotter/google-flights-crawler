#!/bin/bash -xe

folder=results-`node dater.js`
mkdir -p $folder

function finish {
    gsutil cp $folder/log gs://crawler-flight-data/$folder/log
    rm -r $folder
}
trap finish EXIT

node index.js $folder '{"cityPairs": [["LON", "ROM"], ["ROM", "LON"]], "firstDate": "2019-02-01", "lastDate": "2019-02-28"}' > $folder/log 2>&1
