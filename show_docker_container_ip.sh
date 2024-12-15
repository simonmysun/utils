docker ps -q \
    | xargs -n 1 docker inspect --format \
	  '{{ .Name }}{{println}}{{range .NetworkSettings.Networks}}  {{.IPAddress}} {{.GlobalIPv6Address}}{{println}}{{end}}' \
    | sed 's/\///'
