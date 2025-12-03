#!/usr/bin/env bash

if [ $# -ne 3 ]; then
    cat << END_OF_USSAGE
Add eduroam to nmcli connections (works for fernuni-hagen)
Usage:
/path/to/add_eduroam.sh <IFNAME> <USER> <PASS>
Example:
/path/to/add_eduroam.sh wlan0 musterm 123456
END_OF_USSAGE
fi

IFNAME=$1
USER=$2
PASS=$3

nmcli connection add \
      type wifi \
      ifname "${IFNAME}" \
      con-name "eduroam" \
      ssid "eduroam" \
      wifi-sec.key-mgmt wpa-eap \
      802-1x.eap ttls \
      802-1x.phase2-auth pap \
      802-1x.identity "${USER}@fernuni-hagen.de" \
      802-1x.anonymous-identity "eduroam@fernuni-hagen.de" \
      802-1x.ca-cert /etc/ssl/certs/USERTrust_RSA_Certification_Authority.pem \
      802-1x.password "${PASS}" \
      ipv4.method auto \
      ipv6.method auto
