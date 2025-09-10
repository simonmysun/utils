#!/usr/bin/env bash

INPUT=$1
INPUT_FILENAME="${INPUT%.*}"

# ab-av1 to be tested
# max-crf to be tested

ffmpeg \
  -i "${INPUT}" \
  -c:v libsvtav1 \
  -crf 18 \
  -preset 5 \
  -map 0 \
  -map_chapters 0 \
  -movflags use_metadata_tags \
  -map_metadata 0 \
  -ignore_unknown \
  -c:d copy \
  -c:a libopus \
  -b:a 128K \
  "${INPUT_FILENAME}.av1.mp4" # && \
# exiftool \
#   -TagsFromFile "${INPUT}" \
#   "-all:all>all:all" \
#   "${INPUT_FILENAME}.av1.mp4"
