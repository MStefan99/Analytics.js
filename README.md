# Crash Course

![Maintenance](https://img.shields.io/maintenance/yes/2024?style=flat-square)

Crash Course is a web app that can collect usage information for other websites. Making this app was a way for me to understand
how services like Google Analytics work and what capabilities they might offer.

## Features
- Easy setup
- View your website audience in real time
- View unique user and session count, bounce rate, average session duration
- View individual sessions and see how users interact with your website
- View your top pages and traffic sources
- Collect historical data
- Collect website and server logs and errors
- Collect user feedback
- Monitor system information: CPU, memory, disk and network usage

## Installation
- Install Node.js and Deno
- Run `npm install` in `frontend`
- Run `npm run build` in `frontend`. The build will be located in `frontend/dist`
- Run the app using `deno run --allow-net --allow-env --allow-read --allow-write --watch index.ts` in `backend`
