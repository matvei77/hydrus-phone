# Third-party notices

Hydrus Pocket is licensed under Apache License 2.0. Its npm dependencies retain their own licenses, recorded in `package-lock.json` and in each installed package's license file.

The dependency tree currently includes software under permissive licenses such as MIT, ISC, Apache-2.0, BSD-2-Clause, BSD-3-Clause, 0BSD, MIT-0, BlueOak-1.0.0, MPL-2.0, Python-2.0, CC-BY-4.0, and dual/multi-license expressions. Optional image-processing binaries used by the development-only icon generator may include LGPL-3.0-or-later components through `sharp`/libvips; they are not bundled into the production browser or gateway output.

Run `npm ci` and inspect `package-lock.json` plus `node_modules/<package>/LICENSE*` for the exact dependency set of a checkout. No Hydrus Network source code or media is distributed with this repository.

Hydrus Network is an independent project. Its current license and attribution are documented by its maintainers at <https://hydrusnetwork.github.io/hydrus/introduction.html#license>.
