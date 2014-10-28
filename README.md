moz.aisle
=========

c9 plugins that make Aisle Aisle.

Contribute
==========
To contribute, please contact Pike. Essential parts needed aren't publicly accessible for now.

Getting Started
===============
Firstly, you want to get c9v3, and get that running locally. Please follow the docs there.

Then clone moz.aisle into the `plugins` directory, and run `make` inside
`moz.aisle` to create copies for the settings and configs files. Don't forget
to rerun `make` if you change one of those.

To start c9 as Aisle, pass in both config and settings:

    ~/.c9/node/bin/node server.js aisle -s aisle

Use `-p` for the port, and `-w` for the source directory of the localization files you edit.
