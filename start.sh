cd "$(dirname "$0")"

touch nohuplog
echo '------' >> nohuplog
date >> nohuplog
echo '------' >> nohuplog

./run.sh >> nohuplog

echo '------' >> nohuplog
