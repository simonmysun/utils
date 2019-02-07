# ~/.bashrc: executed by bash(1) for non-login shells.
# see /usr/share/doc/bash/examples/startup-files (in the package bash-doc)
# for examples

# If not running interactively, don't do anything
case $- in
    *i*) ;;
      *) return;;
esac

# don't put duplicate lines or lines starting with space in the history.
# See bash(1) for more options
HISTCONTROL=ignoreboth

# append to the history file, don't overwrite it
shopt -s histappend

# for setting history length see HISTSIZE and HISTFILESIZE in bash(1)
HISTSIZE=1000
HISTFILESIZE=2000

# check the window size after each command and, if necessary,
# update the values of LINES and COLUMNS.
shopt -s checkwinsize

# If set, the pattern "**" used in a pathname expansion context will
# match all files and zero or more directories and subdirectories.
#shopt -s globstar

# make less more friendly for non-text input files, see lesspipe(1)
#[ -x /usr/bin/lesspipe ] && eval "$(SHELL=/bin/sh lesspipe)"

# set variable identifying the chroot you work in (used in the prompt below)
if [ -z "${debian_chroot:-}" ] && [ -r /etc/debian_chroot ]; then
    debian_chroot=$(cat /etc/debian_chroot)
fi

# set a fancy prompt (non-color, unless we know we "want" color)
case "$TERM" in
    xterm-color) color_prompt=yes;;
esac

# uncomment for a colored prompt, if the terminal has the capability; turned
# off by default to not distract the user: the focus in a terminal window
# should be on the output of commands, not on the prompt
force_color_prompt=yes

if [ -n "$force_color_prompt" ]; then
    if [ -x /usr/bin/tput ] && tput setaf 1 >&/dev/null; then
	# We have color support; assume it's compliant with Ecma-48
	# (ISO/IEC-6429). (Lack of such support is extremely rare, and such
	# a case would tend to support setf rather than setaf.)
	color_prompt=yes
    else
	color_prompt=
    fi
fi

export TZ=Europe/Berlin

function ps1() {
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
    echo -n -e "${STYLE_DECORATION}]${STYLE_RESET} ${STYLE_LIGHT}\D{%c %Z}${STYLE_RESET}${STYLE_DECORATION}\n--> ${STYLE_RESET}";
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
    echo -n -e "${STYLE_DECORATION}]${STYLE_RESET} ${STYLE_LIGHT}\D{%c %Z}${STYLE_RESET}${STYLE_DECORATION}\n--> ${STYLE_RESET}";
`'

unset color_prompt force_color_prompt

# enable color support of ls and also add handy aliases
if [ -x /usr/bin/dircolors ]; then
    test -r ~/.dircolors && eval "$(dircolors -b ~/.dircolors)" || eval "$(dircolors -b)"
    alias ls='ls --color=auto'
    alias dir='dir --color=auto'
    alias vdir='vdir --color=auto'

    alias grep='grep --color=auto'
    alias fgrep='fgrep --color=auto'
    alias egrep='egrep --color=auto'
fi

# colored GCC warnings and errors
export GCC_COLORS='error=01;31:warning=01;35:note=01;36:caret=01;32:locus=01:quote=01'

# some more ls aliases
alias ll='ls -la'
alias la='ls -A'
alias l='ls -CF'

# Alias definitions.
# You may want to put all your additions into a separate file like
# ~/.bash_aliases, instead of adding them here directly.
# See /usr/share/doc/bash-doc/examples in the bash-doc package.

if [ -f ~/.bash_aliases ]; then
    . ~/.bash_aliases
fi

# enable programmable completion features (you don't need to enable
# this, if it's already enabled in /etc/bash.bashrc and /etc/profile
# sources /etc/bash.bashrc).
if ! shopt -oq posix; then
  if [ -f /usr/share/bash-completion/bash_completion ]; then
    . /usr/share/bash-completion/bash_completion
  elif [ -f /etc/bash_completion ]; then
    . /etc/bash_completion
  fi
fi

export PATH=$HOME/local/bin:$PATH
export NODE_PATH=$HOME/local/lib/node_modules

alias please='sudo'
alias term='xfce4-terminal'
alias term3='term&term&term'
alias vi="bash -c 'emacsclient -t {%0}'"
alias vim='emacsclient -t'
alias gvim='emacsclient -c'
alias emacs='setsid emacsclient -c'
alias thunar='setsid thunar'
alias ytdl='youtube-dl --all-subs'; # --proxy socks5://127.0.0.1:1080'
#alias 'you-get'='you-get -s 127.0.0.1:1080'
#alias 7zx='7zx_f() { 7z x "-o$1"; };7zx_f;'
#alias ue='rm -rf ~/.idm/*.*|rm -rf ~/.idm/uex/.* | setsid /usr/bin/uex'
# export ELECTRON_MIRROR="https://npm.taobao.org/mirrors/electron/"
alias doit='npm run start --'

function keepretrying() {
    while true; do
        command && break;
        sleep 5
    done
}

PATH=/usr/local/cuda-10.0/bin${PATH:+:${PATH}}
LD_LIBRARY_PATH=/usr/local/cuda-10.0/lib64\
       ${LD_LIBRARY_PATH:+:${LD_LIBRARY_PATH}}

source /usr/share/nvm/init-nvm.sh

PATH=/home/mysun/.gem/ruby/2.5.0/bin${PATH:+:${PATH}}
