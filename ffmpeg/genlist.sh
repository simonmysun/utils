rm concat.txt || true;
for f in *.MP4; do echo "file '$f'" >> concat.txt; done
