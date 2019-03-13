#!/bin/sh

while true
do
    echo 'Try traceroute' | ts '[%H:%M:%S %d-%m-%Y]'
    traceroute 104.236.76.45 | ts '[%H:%M:%S %d-%m-%Y]'
    echo 'Done traceroute' | ts '[%H:%M:%S %d-%m-%Y]'
    sleep 10
done

