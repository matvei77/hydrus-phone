# Hydrus API

Validated locally on Hydrus v649, Client API v83, port 45869.

Required permissions are `1` add/import files (Hydrus also gates archive/unarchive here), `2` edit tags, and `3` search/fetch files. No other permissions are requested. Used endpoints: `/api_version`, `/session_key`, `/verify_access_key`, `/get_services`, `/add_tags/search_tags`, `/get_files/search_files`, `/get_files/file_metadata`, `/get_files/thumbnail`, `/get_files/file`, `/get_files/render` (browser-compatible JPEG XL viewing), `/add_tags/add_tags`, `/add_files/archive_files`, and `/add_files/unarchive_files`.

Display tags drive autocomplete/search/presentation. Storage tags drive edit mutations. Search OR groups are nested arrays. Metadata batches are capped at 256. The permanent key is exchanged server-side for a session key and retried once after authentication/session failure.
