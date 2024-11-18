#!/usr/bin/env bash

# USAGE: probe_stream.sh file1 file2 file3 ...
# or probe_stream.sh *.mp4

FILES=( "$@" )
ls -la "${FILES[@]}" > videos.txt
{ for file in "${FILES[@]}"; do echo $file; ffprobe -hide_banner $file 2>&1; done; } > ffprobe.txt
