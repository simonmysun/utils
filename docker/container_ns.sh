#!/usr/bin/env bash

if [ $# -lt 2 ]; then
    cat << END_OF_USAGE
Run command in the network namespace of a compose service
Usage:
/path/to/compose_project/ $ exec_in_container.sh [service_name] [command] ...
END_OF_USAGE
    exit 64
fi

service_name=$1;
shift 1;
command=$@;
container_id=`docker compose ps -q $service_name`;
if [ -z "$service_name" ]; then
    echo "Service='$service_name' not found"
    exit 1
fi
container_pid=`docker inspect -f '{{.State.Pid}}' $container_id`;
echo "Running in network of $service_name<$container_id>{PID=$container_pid}";
nsenter --net=/proc/$container_pid/ns/net $command;
