ffmpeg -f concat -i concat.txt -map 0 -ignore_unknown -c:v libx265 -maxrate 200M -bufsize 100M -c:a libopus -b:a 96K output.mp4

# https://www.trekview.org/blog/2022/join-gopro-chaptered-split-video-files-preserve-telemetry/
# is copying meta data necessary?
