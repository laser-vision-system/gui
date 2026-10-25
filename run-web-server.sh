#!/bin/sh
http-server -p 5173 -a 0.0.0.0
dist
# npm run dev -- --host --host=0.0.0.0