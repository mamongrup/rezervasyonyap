#!/bin/bash
set -e
cd /root/reel-test
FF=./node_modules/ffmpeg-static/ffmpeg
for i in 0 1 2; do
  $FF -y -loop 1 -i img$i.jpg -vf "scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,scale=3240:5760,zoompan=z='min(zoom+0.0015,1.2)':d=80:s=1080x1920:fps=25" -t 3.2 -pix_fmt yuv420p -c:v libx264 -preset veryfast -profile:v high seg$i.mp4 2>seg$i.log
  echo "EXIT_$i=$?"
done
