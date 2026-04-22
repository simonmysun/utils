#!/usr/bin/env bash

print_usage() {
    cat <<END_OF_USAGE
Usage:
  git-commit-with-date.sh [options]

Options:
  -dOPT[=VAL]   Pass option to \`date\`:       single-char OPT → -OPT VAL, multi-char → --OPT VAL
  -cOPT[=VAL]   Pass option to \`git commit\`: single-char OPT → -OPT VAL, multi-char → --OPT VAL
  -zTIMEZONE    Set output IANA timezone (e.g. -zAsia/Shanghai)
                or POSIX format: UTC-8 = UTC+8, UTC+5 = UTC-5 (inverted)
  -h            Show this help

Examples:
  git-commit-with-date.sh -dd="yesterday 10:00" -cm="fix bug"
  git-commit-with-date.sh -ddate="2025-01-01 12:00" -zAsia/Shanghai -cmessage="fix" -cno-verify
  git-commit-with-date.sh -dd="last friday" -camend -cno-edit
END_OF_USAGE
    exit 64
}

DATE_ARGS=()
GIT_ARGS=()
TIMEZONE=""

add_prefixed_arg() {
    local -n _arr=$1
    local rest="$2"
    local opt val
    if [[ "${rest}" == *=* ]]; then
        opt="${rest%%=*}"
        val="${rest#*=}"
        [[ ${#opt} -eq 1 ]] && _arr+=("-${opt}" "${val}") || _arr+=("--${opt}" "${val}")
    else
        opt="${rest}"
        [[ ${#opt} -eq 1 ]] && _arr+=("-${opt}") || _arr+=("--${opt}")
    fi
}

for arg in "$@"; do
    case "${arg}" in
        -h)   print_usage ;;
        -d?*) add_prefixed_arg DATE_ARGS "${arg#-d}" ;;
        -c?*) add_prefixed_arg GIT_ARGS  "${arg#-c}" ;;
        -z?*) TIMEZONE="${arg#-z}" ;;
        *)
            echo "Error: unknown option '${arg}'" >&2
            print_usage
            ;;
    esac
done

if [[ "${#DATE_ARGS[@]}" -eq 0 ]]; then
    echo "Error: no date options provided (use -dOPT[=VAL], e.g. -dd=\"yesterday\")" >&2
    print_usage
fi

DATE_FORMAT="+%Y-%m-%dT%H:%M%z"

if [[ -n "${TIMEZONE}" ]]; then
    TARGET_DATE=$(TZ="${TIMEZONE}" date "${DATE_ARGS[@]}" "${DATE_FORMAT}" 2>&1)
else
    TARGET_DATE=$(date "${DATE_ARGS[@]}" "${DATE_FORMAT}" 2>&1)
fi

if [[ $? -ne 0 ]]; then
    echo "Error: failed to parse date with args: ${DATE_ARGS[*]}" >&2
    exit 1
fi

echo "Committing with date: ${TARGET_DATE}"

export GIT_AUTHOR_DATE="${TARGET_DATE}"
export GIT_COMMITTER_DATE="${TARGET_DATE}"
git commit "--date=${TARGET_DATE}" "${GIT_ARGS[@]}"
