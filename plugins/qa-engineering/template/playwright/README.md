# playwright/

Runtime artifacts for the browser tier.

`playwright/.auth/<profile>.json` is created by the `auth-setup` project on the
first UI run — one storage-state file per profile, each holding a live session.

They are gitignored. **Never commit one**: a storage state is a working set of
credentials for whoever opens the file.

```bash
npm run auth:refresh        # log in again and rewrite the current profile's state
```

The directory is created on demand, so there is nothing to set up here.
