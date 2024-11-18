#!/usr/bin/env bash

INPUT=$1
INPUT_FILENAME="${INPUT%.*}"

# ab-av1 to be tested
# max-crf to be tested

ab-av1 auto-encode \
  -i "${INPUT}" \
  --max-crf 18 \
  --encoder libsvtav1 \
  --preset 5 \
  --enc -map=0 \
  --enc -map_chapters=0 \
  --enc -movflags=use_metadata_tags \
  --enc -map_metadata=0 \
  --enc -ignore_unknown \
  --enc -c:d=copy \
  --acodec libopus \
  --enc -b:a=128K && \
exiftool \
  -TagsFromFile "${INPUT}" \
  "-all:all>all:all" \
  "${INPUT_FILENAME}.av1.mkv"
