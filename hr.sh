#!/usr/bin/env bash

print_usage() {
    cat <<END_OF_USAGE
Usage
hr.sh {hr1,hr2,hr3,hrinfo,youfm}
END_OF_USAGE
}

if [ $# -ne 1 ]; then
    print_usage;
    exit 64;
fi

if [ "$1" != "hr1" ] && [ "$1" != "hr2" ] && [ "$1" != "hr3" ] && [ "$1" != "hrinfo" ] && [ "$1" != "youfm" ]; then
    print_usage;
fi

exec vlc http://dispatcher.rndfnk.com/hr/${1}/live/mp3/128/stream.mp3