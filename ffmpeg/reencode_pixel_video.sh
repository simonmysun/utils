#!/usr/bin/env bash

INPUT=$1
INPUT_FILENAME="${INPUT%.*}"

mkdir -p transcoded

ffmpeg \
  -i "${INPUT}" \
  -map_chapters 0 \
  -movflags use_metadata_tags \
  -map_metadata 0 \
  -ignore_unknown \
  -c:d copy \
  -c:v libsvtav1 \
  -crf 20 \
  -preset 5 \
  -c:a libopus \
  -b:a 128K \
  "./transcoded/${INPUT_FILENAME}.reencoded.mp4" && \
  exiftool \
  -TagsFromFile "${INPUT}" \
  "-all:all>all:all" \
  "./transcoded/${INPUT_FILENAME}.reencoded.mp4"
