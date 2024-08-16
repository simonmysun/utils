#!/usr/bin/env bash

input_dir="."
output_dir="./reencoded"

mkdir -p "$output_dir"

for input_file in "$input_dir"/*.[Mm][Pp]4; do
    filename=$(basename -- "$input_file")
    filename="/${filename%.*}"

    output_file="$output_dir/${filename}.reencoded.mp4"

    ffmpeg \
        -f concat \
        -safe 0 \
        -i <(echo "file ${PWD}/$input_file") \
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
        "$output_file";


    if [ $? -eq 0 ]; then
        echo "Successfully reencoded $input_file to $output_file"
    else
        echo "Failed to reencode $input_file"
    fi
done
