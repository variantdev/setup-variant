# setup-variant

<p align="left">
  <a href="https://github.com/variantdev/setup-variant"><img alt="GitHub Actions status" src="https://github.com/variantdev/setup-variant/workflows/Main%20workflow/badge.svg"></a>
</p>

This action sets up a variant environment for use in actions by:

- optionally downloading and caching a version of Variant by version and adding to PATH
- registering problem matchers for error output

# Usage

See [action.yml](action.yml)

Basic:
```yaml
steps:
- uses: actions/checkout@master
- uses: variantdev/setup-variant@v1
  with:
    variant-version: '0.35.1' # The Variant version to download (if necessary) and use.
- run: variant version
```

Matrix Testing:
```yaml
jobs:
  build:
    runs-on: ubuntu-16.04
    strategy:
      matrix:
        variant: [ '0.35.0', '0.35.x' ]
    name: Variant ${{ matrix.variant }} sample
    steps:
      - uses: actions/checkout@master
      - name: Setup variant
        uses: variantdev/setup-variant@v1
        with:
          variant-version: ${{ matrix.variant }}
      - run: variant version
```

# License

The scripts and documentation in this project are released under the [MIT License](LICENSE)

# Contributions

Contributions are welcome!  See [Contributor's Guide](docs/contributors.md)
