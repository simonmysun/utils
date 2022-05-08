# for xfce4-genmon-plugin, generic monitor in xfce4-panel

pingback=`/usr/bin/ping -w 5 -c 1 v.makelove.expert`
# pingback=`/usr/bin/ping -w 5 -c 1 127.0.0.1`
latency=`grep -oP '\d*(\.\d+)? ms' <<< ${pingback} | head -1`
if [ ${#latency} -eq '0' ]; then
    line=`sed -n '2 p' <<< "${pingback}"`
    if [ ${#line} -eq '0' ]; then
        echo Time out!
    else
        echo "<txt>${line}</txt>"
    fi
else
    echo "<txt>${latency}</txt>"
fi
