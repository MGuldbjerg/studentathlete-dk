#!/bin/bash
# Wrapper der sikrer nvm er loaded før Ralph kører.
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"

cd /home/mikkel/projekter/studentathlete-dk
ralph run -n 4
