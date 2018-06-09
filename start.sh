cd "$(dirname "$0")"

touch log

echo '------' >> log
date >> log
echo '------' >> log

./run.sh 'turnoff' >> log &
