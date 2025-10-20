#!/bin/bash

# Get current IP address
IP=$(ifconfig | grep "inet " | grep -v 127.0.0.1 | awk '{print $2}' | head -1)

if [ -z "$IP" ]; then
    echo "Could not determine IP address, using localhost"
    IP="localhost"
fi

echo "Setting EXPO_PUBLIC_EMULATOR_HOST to: $IP"
export EXPO_PUBLIC_EMULATOR_HOST=$IP
