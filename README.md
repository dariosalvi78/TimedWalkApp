# TimedWalk Project

This repository is organized with a top-level project structure and independent subprojects.

## Top-level layout

- `README.md`: this project overview
- `project.json`: descriptor of all subprojects
- `docs/`: shared documentation
- `datamodel/`: shared SQL/data model assets
- `test/`: centralized unit/integration tests
- `app/`: Cordova/Vue application project
- `servers/`: backend server projects (`basic` and `complete`)

## Node subprojects

Each Node.js subproject keeps its own `package.json`:

- `app/package.json`
- `servers/basic/package.json`
- `servers/complete/api/package.json`

## Where to work

- App development: `app/`
- Basic server: `servers/basic/`
- Complete server API: `servers/complete/api/`
- Shared tests: `test/`
- Shared docs: `docs/`
