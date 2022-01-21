#!/usr/bin/env bash

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
NC='\033[0m' # No Color

echo -ne "DJI:"$(curl -s https://www.marketwatch.com/investing/index/djia | grep '<meta name="price" content="' | cut -d'"' -f4)
