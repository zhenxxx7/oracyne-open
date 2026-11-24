# Security Policy

## Scope

This repository (`oracyne-open`) is a standalone, stateless local/community sandbox with no built-in user authentication, database persistence, or multi-tenant storage.

If you expose this sandbox or a custom fork over the public internet:
- Place it behind authentication, HTTPS termination, and rate limiting.
- Never commit `.env` files, personal `COLAB_API_KEY` values, or live temporary tunnel URLs (`*.trycloudflare.com`).
- Guard your Colab GPU gateway endpoint with a bearer token (`API_KEY`).

## Reporting Vulnerabilities

Please report security issues privately by opening a GitHub Security Advisory on `zhenxxx7/oracyne-open` rather than posting exploit details in public issues.
