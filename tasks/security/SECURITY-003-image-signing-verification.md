# [SECURITY-003] Verify image signatures

- **Status:** Not started
- **Related:** ENGINE-006, SECURITY-006

## Problem

Users cannot tell whether an image was published by the party they expect or tampered with on the way.
A trusted-looking name alone does not prove who built the image.

## Current state

Nothing verifies signatures.
#218 added lookalike checks in `src/lib/image-source/check-image-source.ts`, which ask for confirmation before pulling from a registry or image whose name resembles a well-known one (this closed #124).
Those are name checks only, so they say nothing about who signed an image.

## Scope

- Check whether an image reference has a signature and whether it verifies against a trusted key or identity.
- Show the result in the pull dialog (`src/components/images/pull/`) and the container creation wizard, next to the lookalike warning.
- Show the verification state of local images on the Images page.
- Let users set trusted keys or identities per registry or repository.

## Notes

- Open question: support Sigstore cosign, Notation, or both.
- Open question: how the verifier reaches the machine, the same decision as the scanner in SECURITY-001.
- Keyless Sigstore verification needs network access to the transparency log, so offline use needs a fallback.
- Private registries need credentials, which ENGINE-006 adds.
