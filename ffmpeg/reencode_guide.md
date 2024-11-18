- https://www.trekview.org/blog/join-gopro-chaptered-split-video-files-preserve-telemetry/
- https://www.trekview.org/blog/2022/join-gopro-chaptered-split-video-files-preserve-telemetry/

## Concat GoPro Video Series

- run `probe_stream.sh *.MP4` first. This generates `videos.txt` and `ffprobe.txt`
- view `ffprobe.txt` to check the resolution and framerate (`cat ffprobe.txt | grep Video`)
- run `genlist.sh` to generate `concat.txt`
- edit `concat.txt` to adjust order and pick what to concat
- run `reencode_gopro_video_series.sh`
- repeat until all video series are done
- remove `concat.txt`

## Concat GoPro Video Single

- run `probe_stream.sh *.MP4` first. This generates `videos.txt` and `ffprobe.txt`
- view `ffprobe.txt`
- run `reencode_gopro_video_single.sh FILENAME`
- repeat until all video series are done

Helper: `find . -type f -name 'GX*.MP4' -exec bash ~/utils/ffmpeg/reencode_gopro_video_single.sh {} \;`

## Concat Pixel Video

- run `probe_stream.sh` first. This generates `videos.txt` and `ffprobe.txt`
- view `ffprobe.txt`
- run `reencode_pixel_video.sh FILENAME`
- repeat until all video series are done

Helper: `find . -type f -name 'PXL*.mp4' -exec bash ~/utils/ffmpeg/reencode_pixel_video.sh {} \;`