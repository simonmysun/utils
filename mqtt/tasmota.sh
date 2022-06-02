#!/usr/bin/env bash

. config.production.rc
. devices.rc

if [ "$#" -ne 2 ]; then
    echo "Usage: $0 DEVICE_NAME|DEVICE_INDEX ON|OFF|RRGGBBCWWW"
    echo "Available devices: "
    for i in ${!DEVICE_NAMES[@]}; do
        echo -e "$i\t${DEVICE_NAMES[$i]}\t${DEVICE_DESCRIPTIONS[$i]}"
    done
    exit 64
fi

DEVICE=''
if [[ $1 =~ ^[0-9]+$ ]]; then
    echo "Accessing with device index"
    DEVICE=${DEVICE_NAMES[$1]}
fi

if [[ ${DEVICE_NAMES[@]} =~ ${DEVICE} ]]; then
    echo "Accessing $DEVICE"
else
    echo "Device not found"
    exit 69
fi

echo $HOST $PORT $USERNAME $PASSWORD $DEVICE $2

if [[ $2 =~ ^O(N|FF)$ ]]; then
    echo "Switching power to $2"
    mosquitto_pub -h "$HOST" -p "$PORT" -u "$USERNAME" -P "$PASSWORD" -t "cmnd/$DEVICE/POWER" -m "$2" &
elif [[ $2 =~ ^[0-9A-F]{10}$ ]]; then
    echo "Applying color code $2"
    mosquitto_pub -h "$HOST" -p "$PORT" -u "$USERNAME" -P "$PASSWORD" -t "cmnd/$DEVICE/Color1" -m "$2" &
else
    echo "Invalid parameter $2"
    exit 64
fi

mosquitto_sub -h "$HOST" -p "$PORT" -u "$USERNAME" -P "$PASSWORD" -t "stat/$DEVICE/RESULT" -C 1 &
wait
