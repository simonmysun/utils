function ps1 {
    a=$?;
    STYLE_RESET="\[\033[m\]";
    STYLE_ALERT="\[\033[01;32;41m\]";
    STYLE_DECORATION="\[\033[0;36m\]";
    STYLE_PRIMARY="\[\033[01;32m\]";
    STYLE_SECONDARY="\[\033[01;34m\]";
    STYLE_INFO="\[\033[33;40m\]";
    STYLE_LIGHT="\[\033[1;30m\]";
    if [ $a -ne 0 ]; then
        echo -n -e "${STYLE_ALERT}{$a}";
        echo -n -e "\033]0; ERROR: $a \a";
    fi;
    echo -n -e "${STYLE_DECORATION}[${STYLE_RESET}${STYLE_PRIMARY}\u@\h${STYLE_RESET} ${STYLE_SECONDARY}\W";
    B=$(git branch 2>/dev/null | sed -e "/^ /d" -e "s/* \(.*\)/\1/");
    if [ "$B" != "" ]; then
        S="git";
    elif [ -e .bzr ]; then
        S=bzr;
    elif [ -e .hg ]; then
        S="hg";
    elif [ -e .svn ]; then
        S="svn";
    else
        S="";
    fi;
    if [ "$S" != "" ]; then
        if [ "$B" != "" ]; then
            M=$S:$B;
        else
            M=$S;
        fi;
    fi;
    if [ "$M" != "" ]; then
        echo -n -e "${STYLE_INFO}($M)${STYLE_RESET}";
    fi;
    echo -n -e "${STYLE_DECORATION}]${STYLE_RESET}\n${STYLE_DECORATION}$ ${STYLE_RESET}";
}

PS1='`
    a=$?;
    STYLE_RESET="\[\033[m\]";
    STYLE_ALERT="\[\033[01;32;41m\]";
    STYLE_DECORATION="\[\033[0;36m\]";
    STYLE_PRIMARY="\[\033[01;32m\]";
    STYLE_SECONDARY="\[\033[01;34m\]";
    STYLE_INFO="\[\033[33;40m\]";
    STYLE_LIGHT="\[\033[1;30m\]";
    if [ $a -ne 0 ]; then
        echo -n -e "${STYLE_ALERT}{$a}";
        echo -n -e "\033]0; ERROR: $a \a";
    fi;
    echo -n -e "${STYLE_DECORATION}[${STYLE_RESET}${STYLE_PRIMARY}\u@\h${STYLE_RESET} ${STYLE_SECONDARY}\W";
    B=$(git branch 2>/dev/null | sed -e "/^ /d" -e "s/* \(.*\)/\1/");
    if [ "$B" != "" ]; then
        S="git";
    elif [ -e .bzr ]; then
        S=bzr;
    elif [ -e .hg ]; then
        S="hg";
    elif [ -e .svn ]; then
        S="svn";
    else
        S="";
    fi;
    if [ "$S" != "" ]; then
        if [ "$B" != "" ]; then
            M=$S:$B;
        else
            M=$S;
        fi;
    fi;
    if [ "$M" != "" ]; then
        echo -n -e "${STYLE_INFO}($M)${STYLE_RESET}";
    fi;
    echo -n -e "${STYLE_DECORATION}]${STYLE_RESET}\n${STYLE_DECORATION}$ ${STYLE_RESET}";
`'

unset color_prompt force_color_prompt
