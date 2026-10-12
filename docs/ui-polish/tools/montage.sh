#!/bin/bash
# one image per screen: the configs side by side (scaled to 60%)
DIR=$1; OUT=$2; mkdir -p "$OUT"
for d in "$DIR"/*/; do n=$(basename "$d"); montage $(ls "$d"*.png | sort) -tile x1 -geometry +6+0 -resize 60% -background '#888' -title "$n" "$OUT/$n.png" 2>/dev/null; done
ls "$OUT" | wc -l
