#!/bin/sh
xrandr \
    --output DisplayPort-0 --off \
    --output DisplayPort-1 --off \
    --output HDMI-A-0 --off \
    --output HDMI-A-1 --off \
    --output DVI-D-0 --off;
while true;
do
    read key;
    echo $key;
    if [[ $key = "q" ]] || [[ $key = "Q" ]];
    then
        break;
    fi;
done;
xrandr \
    --output DisplayPort-0 --mode 3840x2160 --pos 0x0 --rotate normal \
    --output DisplayPort-1 --mode 3840x2160 --pos 3840x0 --rotate normal \
    --output HDMI-A-0 --mode 3840x2160 --pos 7680x0 --rotate normal \
    --output HDMI-A-1 --off \
    --output DVI-D-0 --off;
