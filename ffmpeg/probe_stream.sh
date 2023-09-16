ls -la *.MP4 > files.txt
{ for file in *.MP4; do echo $file; ffprobe -hide_banner $file 2>&1; done; } > ffprobe.txt
