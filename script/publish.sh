#!/bin/bash

# 检查是否已登录
if ! npm whoami > /dev/null 2>&1; then
    echo "please login npm"
    exit 1
fi

sh pnpm build

npm publish

echo "publish success"

