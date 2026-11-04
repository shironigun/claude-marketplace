# Meeting notes: CSV customer import, refinement

Date: 22 October 2026. Present: the product owner, the tech lead, the QA lead and a designer. Synthetic notes for testing.

Thanks everyone for joining.

## Background imports

The tech lead said an import of 10,000 rows can take a few minutes, so the admin should not have to wait on the page.

Decision: imports run in the background. The admin can leave the page and gets an in-app notification when the import ends.

## File size

The product owner said partners send exports of up to 8 MB, so 5 MB is too small.

The file size limit is 10 MB.

## Error report

The QA lead asked how long the error report stays available.

Decision: the error report can be downloaded for 7 days, as the FRD says.

## Next steps

The designer will draft the summary messages. The QA lead will review the stories.

That's all, thanks.
