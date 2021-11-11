#!/bin/bash

if [ $# -eq 0 ]
then
    cat <<EOF
Usage: disco.sh $ip $step $interval

ip list:
    97: D2FB56 Bedroom Sun
    99: D2FBD2 Home Office Table
    96: D2FB0C Bedroom Ceiling Guo
    98: D3EDA0 Bedroom Table Guo
step can be 1, 37
interval can be 0 or 1
EOF
    exit
fi

ip=$1
step=$2 # 37 or 1
interval=$3

x=0
while :
do
    x=$(( ($x + $step) % 360 ));
    curl -s -S "http://admin:3.1415926@192.168.15.$ip/?m=1&h0=$x&n0=100&d0=100" > /dev/null;
    sleep $interval
done
