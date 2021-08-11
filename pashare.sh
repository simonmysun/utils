#!/bin/sh

# modified from https://superuser.com/questions/605445/how-to-stream-my-gnu-linux-audio-output-to-android-devices-over-wi-fi
# use come.kaytat.simplerpotocolplayer
case "$1" in
  list)
    pactl list | grep Name
    # pactl list sources short
    # pactl list | grep "Monitor Source"
    ;;
  start)
    sh $0 stop 
    # pactl load-module module-simple-protocol-tcp rate=48000 format=s16le channels=2 source=alsa_output.pci-0000_00_1f.3.analog-stereo.monitor record=true port=8901
    pactl load-module module-simple-protocol-tcp rate=48000 format=s16le channels=2 source=ladspa_output.mbeq_1197.mbeq.monitor record=true port=8901
    ;;
  stop)
    pactl unload-module `pactl list | grep tcp -B1 | grep M | sed 's/[^0-9]//g'`
    ;;
  *)
    echo "Usage: $0 list|start|stop" >&2
    ;;
esac
