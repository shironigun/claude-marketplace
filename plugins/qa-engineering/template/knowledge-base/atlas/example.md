# Atlas: Example
**Slug:** example
**Module brief:** [modules/example.md](../modules/example.md)
**Not this module:** example-templates

```yaml
routes: [/widgets]
frontend_path_includes:
  - "**/Widgets/**"
  - "**/widget*.tsx"
frontend_path_excludes:
  - "**/WidgetTemplates/**"
api_prefixes: [/api/widgets]
backend_path_includes:
  - "**/WidgetsController*"
  - "**/Widgets/**/*.cs"
backend_path_excludes:
  - "**/WidgetTemplate*"
features:
  - id: create
    frontend_paths: ["**/Widgets/**/AddWidget*"]
    backend_paths: ["**/WidgetsController*"]
    apis: ["POST /api/widgets"]
  - id: archive
    frontend_paths: ["**/Widgets/**/WidgetDetail*"]
    backend_paths: ["**/WidgetsController*"]
    apis: ["DELETE /api/widgets/{id}"]
```

## Route map
| Route | Component path | Feature ids |
|---|---|---|
| /widgets | `src/.../Widgets/WidgetsPage.tsx` | list, create, archive |

## Frontend <-> Backend links
| Feature | FE entry (route / component) | API calls | BE files |
|---|---|---|---|
| create | `/widgets` + `.../AddWidget.tsx` | POST /api/widgets | `WidgetsController.cs` |
| archive | `/widgets` + `.../WidgetDetail.tsx` | DELETE /api/widgets/{id} | `WidgetsController.cs` |

> v1 atlas = globs + route map + link table. Impact / regression packs are a later addition
> (see `knowledge/standards/knowledge-base.md`). Replace this file with the real module's code map.
