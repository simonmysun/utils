#!/usr/bin/env bash

if [ $# -eq 0 ]
then
        cat <<EOF
Usage: ssh.speedtest.sh HOST [SIZE]

HOST: a valid SSH host
SIZE: size to test in megabytes (default: 100)

Example:
    ssh.speedtest.sh example.com 50
EOF
        exit 64
fi

HOST=$1
SIZE=${2:-100}

dd if=/dev/urandom bs=1048576 count=$SIZE | ssh $HOST 'dd of=/dev/null'
ssh $HOST "dd if=/dev/urandom bs=1048576 count=$SIZE" | dd of=/dev/null
