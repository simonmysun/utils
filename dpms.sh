#!/usr/bin/env bash

print_usage() {
    cat <<END_OF_USAGE
Usage
blank.sh {enable,disable}
END_OF_USAGE
    exit 64;
}

if [ ${#} -lt 1 ]; then
    print_usage;
fi

echo ">>>DPMS: $(xset -q | grep "DPMS is" | awk '{print $3}')"
echo ">>>Screensaver timeout: $(xset -q | grep "timeout:" | awk '{print $2}')"

while true; do
    if [ "${1}" = 'enable' ]; then
        echo "<<<diable screensaver";
        xset s off;
        echo "<<<enable dpms";
        xset +dpms;
        echo "<<<force monitor off";
        xset dpms force off;
        echo "<<<set dpms timeout 30 45 60";
        xset dpms 30 45 60;
    elif [ "${1}" = 'disable' ]; then
        echo "<<<diable screensaver anyway";
        xset s off;
        echo "<<<force monitor on";
        xset dpms force on;
        echo "<<<disable dpms";
        xset -dpms;
        echo "<<<set dpms timeout to 0 0 0";
        xset dpms 0 0 0;
    else
        echo '!!!Unknown command';
        print_usage;
    fi
    echo ">>>DPMS: $(xset -q | grep "DPMS is" | awk '{print $3}')"
    echo ">>>Screensaver timeout: $(xset -q | grep "timeout:" | awk '{print $2}')"
    echo "";
    echo "---Press Ctrl+C to exit";
    sleep 30;
    echo "";
done
