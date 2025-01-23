#!/usr/bin/env bash

if [ $# -lt 1 ]; then
    cat <<END_OF_USAGE
Usage
blank.sh {enable,disable}
END_OF_USAGE
    exit 64;
fi

if [ $1 == 'enable' ]; then
    xset +dpms; xset dpms force off;
elif [ $1 == 'disable' ]; then
    xset -dpms; xset dpms force on;
else
    echo 'Unknown command';
fi
