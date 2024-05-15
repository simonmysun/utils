#!/usr/bin/env bash

syncplay --no-gui -a syncplay.pl:8999 -r 2daf7c9e6db955dcedb7d4f43b77636cf3af34d1 -n $USER@$(uname -n) --player-path $(which mpv)
