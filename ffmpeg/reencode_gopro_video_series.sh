#!/usr/bin/env bash

FIRST_FILE=$(head -n 1 concat.txt | sed 's/file //g' | sed "s/'//g")
FIRST_FILE_FILENAME="${FIRST_FILE%.*}"



ffmpeg \
  -f concat \
  -i "${FIRST_FILE}" \
  -map 0 \
  -map_chapters 0 \
  -movflags use_metadata_tags \
  -map_metadata 0 \
  -ignore_unknown \
  -c:d copy \
  -c:v libx265 \
  -maxrate 200M \
  -bufsize 1000M \
  -c:a libopus \
  -b:a 128K \
  "${FIRST_FILE_FILENAME}.reencoded.mp4" && \
  exiftool \
  -TagsFromFile "${FIRST_FILE}" \
  "-all:all>all:all" \
  "${FIRST_FILE_FILENAME}.reencoded.mp4"