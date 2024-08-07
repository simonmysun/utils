#!/usr/bin/env bash

# https://askubuntu.com/posts/1306677/revisions

dbus-send --dest=org.freedesktop.PowerManagement --print-reply=literal /org/freedesktop/PowerManagement/Inhibit org.freedesktop.PowerManagement.Inhibit.GetInhibitors
