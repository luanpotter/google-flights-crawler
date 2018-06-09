#!/bin/bash

server=$1
gcloud compute instances start --zone us-central1-c $server
gcloud compute ssh --zone us-central1-c $server  -- 'sh -c nohup /home/luan/projects/google-flights-crawler/start.sh'
