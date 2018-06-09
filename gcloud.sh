#!/bin/bash

server=$1

function finish {
  gcloud compute instances stop $server
}
trap finish EXIT

gcloud compute instances start $server
gcloud compute ssh $server  -- '/home/luan/projects/google-flights-crawler/start.sh'
