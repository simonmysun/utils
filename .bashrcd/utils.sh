alias term='xfce4-terminal'
alias term3='term&term&term'
alias vi="bash -c 'emacsclient -t {%0}'"
alias vim='emacsclient -t'
alias gvim='emacsclient -c'
alias emacs='setsid emacsclient -c'
alias diff='colordiff'
alias thunar='setsid thunar'
alias ytdl='youtube-dl --all-subs'; # --proxy socks5://127.0.0.1:1080'
#alias 'you-get'='you-get -s 127.0.0.1:1080'
#alias 7zx='7zx_f() { 7z x "-o$1"; };7zx_f;'
alias doit='npm run start --'
sqt="'"
alias killvlc='kill -9 $(killall -v vlc 2>&1 | sed -n "s/^.*(\([0-9]\+\)).*$/\1/p" -)'
alias dedate='node ~/utils/time.js'
alias tg='telegram-cli -W -e'

function _please(){
    if [ -z $1 ]; then
        #echo `history | cut -c 8- | tail -n 2 | head -n 1`;
        sudo `history | cut -c 8- | tail -n 2 | head -n 1`;
    else
        #echo $@;
        sudo $@;
    fi;
};
alias please=_please

function keepretrying() {
    while true; do
        command && break;
        sleep 5
    done
}

zlipd() (printf "\x1f\x8b\x08\x00\x00\x00\x00\x00" |cat - $@ |gzip -dc)
#https://unix.stackexchange.com/questions/22834/how-to-uncompress-zlib-data-in-unix
flasher () {
    while true; do
        printf "\\e[?5h";
        sleep 0.1;
        printf "\\e[?5l";
        read -s -n1 -t1 && break;
    done;
}
#https://zh.wikipedia.org/w/index.php?oldid=54692737
tgs() {
    para="'msg $1 $(cat $2)'";
    echo $para;
    bash -c "telegram-cli --json -W -e $para";
}
