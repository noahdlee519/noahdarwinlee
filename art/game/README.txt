These files are built, not edited.

Your screenshots live in game/easy maps, game/medium maps and game/hard maps.
Running

    bash game/build-images.sh

writes three things here, all named after each city's "id" in game/cities.json:

    chicago.webp      1400px, ~300 KB — what a round loads
    chicago@2x.webp   full size — only fetched if someone uses the magnifier
    images.json       the list of cities that have a picture

The page reads images.json to know what exists, so an image added here by hand
without running the build will not appear in the game.

Full instructions:  game/HOW-TO-ADD-CITIES.md
What's still missing:  bash game/check.sh
