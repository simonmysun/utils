cvlc -vvv pulse://$(pactl list | grep "Monitor Source" | awk '{print $3}') --sout '#transcode{acodec=mp3,ab=128,channels=2}:standard{access=http,dst=0.0.0.0:8888/live.mp3}'
