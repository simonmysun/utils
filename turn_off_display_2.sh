#!/bin/sh
vbetool dpms off
while true;
do
    read key;
    echo $key;
    if [[ $key = "q" ]] || [[ $key = "Q" ]];
    then
        break;
    fi;
done;
vbetool dpms on
