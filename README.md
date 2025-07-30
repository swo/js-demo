# Interactive dashboard demo

## Getting started

- System requirements: pnpm
- Install package: `pnpm i`
- Serve locally: `pnpm dev`

## Hex map

The map data, with states located using [axial coordinates](https://www.redblobgames.com/grids/hexagons/#coordinates-axial), is in `helpers/hex-map/hex-positions.csv`. Those are converted to Cartesian coordinated with `helpers/hex-map/build-hex-map.py`, which produces `src/data/state-hex.tsx`.

It might make sense to produce the hex map coordinates on the fly using JavaScript, so that features like padding can be adjusted in the app itself.
