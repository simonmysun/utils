# https://jichu4n.com/posts/debug-trap-and-prompt_command-in-bash/
# https://github.com/jichu4n/bash-command-timer/blob/master/bash_command_timer.sh

BCT_TIME_FORMAT='%c %z'
BCT_COLOR='1;30'
if date +'%N' | grep -qv 'N'; then
    BCTTime="date '+%s%N'"
    function BCTPrintTime() {
        date --date="@$1" +"$BCT_TIME_FORMAT"
    }
elif hash gdate 2>/dev/null && gdate +'%N' | grep -qv 'N'; then
    BCTTime="gdate '+%s%N'"
    function BCTPrintTime() {
        gdate --date="@$1" +"$BCT_TIME_FORMAT"
    }
elif hash perl 2>/dev/null; then
    BCTTime="perl -MTime::HiRes -e 'printf(\"%d\",Time::HiRes::time()*1000000000)'"
    function BCTPrintTime() {
        date -r "$1" +"$BCT_TIME_FORMAT"
    }
else
    echo 'No compatible date, gdate or perl commands found, aborting'
    exit 1
fi

function print_time() {
    local MSEC=1000000
    local SEC=$(($MSEC * 1000))
    local MIN=$((60 * $SEC))
    local HOUR=$((60 * $MIN))
    local DAY=$((24 * $HOUR))
    local command_start_time=$COMMAND_START_TIME
    local command_end_time=$(eval $BCTTime)
    local command_time=$(($command_end_time - $command_start_time))
    local num_days=$(($command_time / $DAY))
    local num_hours=$(($command_time % $DAY / $HOUR))
    local num_mins=$(($command_time % $HOUR / $MIN))
    local num_secs=$(($command_time % $MIN / $SEC))
    local num_msecs=$(($command_time % $SEC / $MSEC))
    local time_str=""
    if [ $num_days -gt 0 ]; then
        time_str="${time_str}${num_days}d "
    fi
    if [ $num_hours -gt 0 ]; then
        time_str="${time_str}${num_hours}h "
    fi
    if [ $num_mins -gt 0 ]; then
        time_str="${time_str}${num_mins}m "
    fi
    local num_msecs_pretty=''
    #if [ -n "$BCT_MILLIS" ] && [ $BCT_MILLIS -eq 1 ]; then
    local num_msecs_pretty=$(printf '%03d' $num_msecs)
    #fi
    time_str="${time_str}${num_secs}s${num_msecs_pretty}"
    now_str=$(BCTPrintTime $(($command_end_time / $SEC)))
    #if [ -n "$now_str" ]; then
    local output_str="[ $time_str | $now_str ]"
    #else
    #  local output_str="[ $time_str ]"
    #fi
    if [ -n "$BCT_COLOR" ]; then
        local output_str_colored="\033[${BCT_COLOR}m${output_str}\033[0m"
    else
        local output_str_colored="${output_str}"
    fi
    # Trick to make sure the output wraps to the next line if there is not
    # enough room for the string (only when BCT_WRAP == 1)
    #if [ -n "$BCT_WRAP" ] && [ $BCT_WRAP -eq 1 ]; then
    # we'll print as many spaces as characters exist in output_str, plus 2
    local wrap_space_prefix="${output_str//?/ }  "
    #else
    #  local wrap_space_prefix=""
    #fi

    # Move to the end of the line. This will NOT wrap to the next line
    # unless you have BCT_WRAP == 1
    echo -ne "$wrap_space_prefix\033[${COLUMNS}C"
    # Move back (length of output_str) columns.
    echo -ne "\033[${#output_str}D"
    # Finally, print output.
    echo -e "${output_str_colored}"
}

function PreCommand() {
    if [ -z "$AT_PROMPT" ]; then
        return
    fi
    unset AT_PROMPT

    # Do stuff.
    # echo "Running PreCommand"
    history -a;
    printf "\033]0;%s@%s:%s::%s\007" "${USER}" "${HOSTNAME%%.*}" "${PWD/#$HOME/\~}" "$BASH_COMMAND"
    COMMAND_START_TIME=$(eval $BCTTime)
}
trap "PreCommand" DEBUG
export COLUMNS
FIRST_PROMPT=1
function PostCommand() {
    AT_PROMPT=1
    printf "\033]0;%s@%s:%s\007" "${USER}" "${HOSTNAME%%.*}" "${PWD/#$HOME/\~}"
    if [ -n "$FIRST_PROMPT" ]; then
        unset FIRST_PROMPT
        return
    fi
    # echo "Running PostCommand"
    print_time 
}
PROMPT_COMMAND="PostCommand"
