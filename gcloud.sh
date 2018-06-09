#!/bin/bash

server=$1
gcloud compute instances start $server
gcloud compute ssh $server  -- '/home/luan/projects/google-flights-crawler/start.sh'
