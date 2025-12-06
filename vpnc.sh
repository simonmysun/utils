#!/usr/bin/env bash

totp() {
  # https://thenybble.de/posts/calculating-totp/
  # Usage: totp "BASE32ENCODEDSECRET"
  # Returns: 6-digit TOTP code
  count="$(printf '%.16x' "$(($(date +%s)/30))")"
  hexkey="$(echo -n "${1}" | base32 -d | xxd -p)"
  hash="$(echo -n "${count}" | xxd -r -p | openssl mac -digest sha1 -macopt hexkey:"$hexkey" HMAC)"
  offset="$((16#${hash:39}))"
  extracted="${hash:$((offset * 2)):8}"
  echo "$(((16#$extracted & 16#7fffffff) % 1000000))"
}

if [ "${#}" -ne 1 ]; then
    cat << EOF
Usage: $0 connect|disconnect

This script interacts with vpnc to connect or disconnect a VPN using a password and TOTP.
Requires /etc/vpnc/vpnc.credentials with PASSWORD and TOTP_SECRET variables. (Setting permissions to 600 is recommended.)
Requires vpnc configured.
Requires root privileges.
EOF
    exit 1
fi
if [ "${EUID}" -ne 0 ]; then
   echo "This script must be run as root" 
   exit 1
fi
if [ "$1" = "disconnect" ]; then
    vpnc-disconnect
    exit $?
fi
if [ "$1" != "connect" ]; then
    echo "Usage: $0 connect|disconnect"
    exit 1
fi

set -o allexport
. /etc/vpnc/vpnc.credentials
set +o allexport

if [ -z "${PASSWORD}" ] || [ -z "${TOTP_SECRET}" ]; then
    echo "Missing PASSWORD or TOTP_SECRET in /etc/vpnc/vpnc.credentials"
    exit 1
fi

printf "%s\n%s\n" "${PASSWORD}" "$(totp "${TOTP_SECRET}")" | vpnc