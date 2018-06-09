cd "$(dirname "$0")"

touch log

echo '------' >> log
date >> log
echo '------' >> log

sh -c "( ( nohup ./run.sh 10 'turnoff' &>> log < /dev/null) & )"