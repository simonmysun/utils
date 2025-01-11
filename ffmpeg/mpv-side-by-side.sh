#!/bin/bash

# https://github.com/mpv-player/mpv/issues/3854#issuecomment-263884657

usage() {
    echo "Usage: $0 <video1> <video2> [video3 video4]"
    echo "Play 2 or 4 videos side by side using MPV"
    exit 1
}

# Check argument count
if [ $# -ne 2 ] && [ $# -ne 4 ]; then
    usage
fi

case $# in
    2)
        mpv "$1" --external-file="$2" \
            --lavfi-complex='[vid1] [vid2] hstack [vo]' \
            --video-unscaled=yes
        ;;
    4)
        mpv "$1" --external-file="$2" --external-file="$3" --external-file="$4" \
            --lavfi-complex='[vid1] [vid2] hstack [t1] ; [vid3] [vid4] hstack [t2] ; [t1] [t2] vstack [vo]' \
            --video-unscaled=yes
        ;;
esac