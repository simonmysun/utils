#!/usr/bin/env bash

print_usage() {
    cat <<END_OF_USAGE
Usage
git-commit-with-date.sh <params for date>
END_OF_USAGE
    exit 64;
}

if [ $# -lt 1 ]; then
    print_usage;
fi

TARGET_DATE=$(date "${@}");
export GIT_AUTHOR_DATE="${TARGET_DATE}"
export GIT_COMMITTER_DATE="${TARGET_DATE}"
git commit "--date=${TARGET_DATE}"