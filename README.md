# CLA signatures

Storage branch for the Contributor License Agreement bot. Not part of the product.

`.github/workflows/cla.yml` writes `signatures/cla.json` here when a contributor signs
[`CLA.md`](https://github.com/ythril-network/Ythril/blob/main/CLA.md). It is a separate, otherwise-empty branch so
the signature record is not mixed into the codebase history and so a signature commit never touches `main`.

**Do not protect this branch.** The bot commits to it, and the action fails with
"Make sure the branch where signatures are stored is NOT protected" if it cannot.

**Do not delete it either.** The action does not create it — it expects it to exist, and reports
"Branch cla-signatures not found" if it is missing. That is what this branch is for.
