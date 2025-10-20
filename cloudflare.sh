#!/bin/bash

find src static -type f \( -name '*.js' -o -name '*.html' \) -exec \
    sed -i 's/wangjiezhe\.com/jiezhe.wang/g' {} \;
