#!/usr/bin/env python3
"""
Block vulnerability-scanner probes at Cloudflare's edge, on both zones.

Why: on 23-09-2026 one scanner sent 1,088 requests in a single minute to
studentathlete.dk (/.env, /.git, /firebase-credentials.json, .php …). Each one
started the Worker and rendered a 404 — the biggest single burst of 1102 CPU
errors that day. A WAF custom rule answers BEFORE the Worker, at zero CPU, and
is free (5 per zone on the free plan).

Nothing on the site lives under these paths (checked: public/ has no dot-files,
.php or .yaml; /.well-known/ is exempt so future verification files still work).

Idempotent: PUT replaces the zone's custom-rule entrypoint with exactly this rule.
Needs CLOUDFLARE_API_TOKEN with Zone → Zone WAF → Edit on both zones.

    python3 scripts/waf-scanner-rule.py          # apply
    python3 scripts/waf-scanner-rule.py --check  # show what is live
"""
import json
import os
import sys
import urllib.error
import urllib.request

ZONES = {
    "studentathlete.dk": "23590c54bb025563a66036b93eb125ab",
    "student-athlete.co.uk": "56c3cff29435604715a54b7039dc7573",
}

EXPRESSION = (
    '(starts_with(http.request.uri.path, "/.") and not starts_with(http.request.uri.path, "/.well-known/"))'
    ' or ends_with(http.request.uri.path, ".php")'
    ' or ends_with(http.request.uri.path, ".yaml")'
    ' or ends_with(http.request.uri.path, ".yml")'
    ' or starts_with(http.request.uri.path, "/wp-")'
    ' or ends_with(http.request.uri.path, ".tfvars.json")'
    ' or ends_with(http.request.uri.path, "credentials.json")'
)

RULE = {
    "description": "Block vulnerability-scanner probes before they reach the Worker (1102 CPU)",
    "expression": EXPRESSION,
    "action": "block",
    "enabled": True,
}


def call(token, method, url, data=None):
    req = urllib.request.Request(
        url,
        method=method,
        data=json.dumps(data).encode() if data is not None else None,
        headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
    )
    try:
        return json.load(urllib.request.urlopen(req))
    except urllib.error.HTTPError as e:
        return json.load(e)


def main():
    token = os.environ.get("CLOUDFLARE_API_TOKEN")
    if not token:
        sys.exit("CLOUDFLARE_API_TOKEN is not set in this shell.")
    check = "--check" in sys.argv
    for name, zone in ZONES.items():
        url = f"https://api.cloudflare.com/client/v4/zones/{zone}/rulesets/phases/http_request_firewall_custom/entrypoint"
        r = call(token, "GET", url) if check else call(token, "PUT", url, {"rules": [RULE]})
        if not r.get("success"):
            codes = [e.get("code") for e in r.get("errors", [])]
            hint = " (no custom rules yet)" if check and 10003 in codes else ""
            print(f"{name}: FAILED {r.get('errors')}{hint}")
            continue
        rules = (r.get("result") or {}).get("rules", [])
        print(f"{name}: OK — {len(rules)} rule(s): " + "; ".join(f"{x['action']} · {x.get('description', '')}" for x in rules))


if __name__ == "__main__":
    main()
