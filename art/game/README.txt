These files are built, not edited.

Your screenshots live in citylayoutguessr/maps. Running

    bash citylayoutguessr/build-images.sh

writes three things here, named after each city's "id" in citylayoutguessr/cities.json:

    chicago.webp        1200px, ~200 KB — what a round loads
    chicago@2x.avif     full size — only fetched if someone uses the magnifier
    images.json         the list of cities that have a picture

The page reads images.json to know what exists, so an image added here by hand
without running the build will not appear in the game.

Full instructions:  citylayoutguessr/HOW-TO-ADD-CITIES.md
Where things stand:  bash citylayoutguessr/check.sh
