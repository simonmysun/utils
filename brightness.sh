#!/usr/bin/env bash

if [ $# -lt 1 ]; then
    cat <<END_OF_USAGE
Usage
bightness.sh [0-100]
END_OF_USAGE
    exit 64;
fi

ddcutil -d 1 setvcp 10 $1;
ddcutil -d 2 setvcp 10 $1;
ddcutil -d 3 setvcp 10 $1;
wait;
